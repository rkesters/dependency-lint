import _ from 'lodash';
import { readFile, readJson } from 'fs-extra';
import ModuleNameParser from './moduleNameParser';
import path from 'path';
import Bluebird from 'bluebird';
import {
	DependencyLinterConfig,
	ExecutableModules,
	ExecutedModules,
	LibaryInfo,
	ModuleUsage,
	ShellScripts,
} from '../../types';
import globIn, { IOptions } from 'glob';
import { PackageJson } from 'type-fest';
//
type GlobParams = { pattern: string; options?: IOptions };
const glob = Bluebird.promisify(
	async (
		p: GlobParams,
		cb: (err: Error | null, matches: string[]) => void,
	) => {
		if (_.isUndefined(p.options)) {
			return globIn(p.pattern, cb);
		}

		return globIn(p.pattern, p.options, cb);
	},
);

export default class ExecutedModulesFinder {
	private shellScripts: ShellScripts;

	constructor({ shellScripts }: ExecutedModules) {
		this.shellScripts = shellScripts;
	}

	async find({ dir, packageJson }: LibaryInfo): Promise<ModuleUsage[]> {
		const installedModules = _.keys(packageJson.devDependencies).concat(
			_.keys(packageJson.dependencies),
		);
		const [moduleExecutables, shellScripts] = await Promise.all([
			this.getModuleExecutables(installedModules, dir),
			this.readShellScripts(dir),
		]);
		const packageJsonScripts = packageJson.scripts || {};
		return this.findModuleExecutableUsage({
			moduleExecutables,
			packageJsonScripts,
			shellScripts,
		});
	}

	findInScript(script: string, moduleExecutables: Record<string, string>) {
		const result: string[] = [];
		for (const name in moduleExecutables) {
			const executables = moduleExecutables[name];
			for (const executable of Array.from(executables)) {
				if (ModuleNameParser.isGlobalExecutable(executable)) {
					continue;
				}
				if (
					script.match(`\\b${executable}\\b`) &&
					!result.includes(name)
				) {
					result.push(name);
				}
			}
		}
		return result;
	}

	findModuleExecutableUsage({
		moduleExecutables,
		packageJsonScripts,
		shellScripts,
	}: ExecutableModules): ModuleUsage[] {
		let moduleName;
		const result = [];
		for (const scriptName in packageJsonScripts) {
			const script = packageJsonScripts[scriptName];
			for (moduleName of Array.from(
				this.findInScript(script, moduleExecutables),
			)) {
				result.push({ name: moduleName, script: scriptName });
			}
		}
		for (const filePath in shellScripts) {
			const fileContent = shellScripts[filePath];
			for (moduleName of Array.from(
				this.findInScript(fileContent, moduleExecutables),
			)) {
				result.push({ name: moduleName, file: filePath });
			}
		}
		return result;
	}

	async getModuleExecutables(
		installedModules: string[],
		dir: string,
	): Promise<Record<string, string>> {
		const nodeModulesPath = path.join(dir, 'node_modules');
		const files = installedModules.map((x) =>
			path.join(nodeModulesPath, x, 'package.json'),
		);
		return _.fromPairs(
			await Bluebird.map(files, this.getModuleExecutablesPair),
		);
	}

	async getModuleExecutablesPair(packageJsonPath: string) {
		const packageJson: PackageJson = await readJson(packageJsonPath);
		let executables: string[] = [];
		if (_.isString(packageJson.bin)) {
			if (_.isUndefined(packageJson.name)) {
				throw new Error(`${packageJsonPath} must include a name.`);
			}
			executables = [packageJson.name];
		} else if (_.isObject(packageJson.bin)) {
			executables = _.keys(packageJson.bin);
		}
		return [packageJson.name, executables];
	}

	async readShellScripts(
		dir: string,
		done?: unknown,
	): Promise<Record<string, string>> {
		const filePaths = await glob({
			pattern: this.shellScripts.root,
			options: {
				cwd: dir,
				ignore: this.shellScripts.ignore,
			},
		});
		const fileMapping: Record<string, Promise<string>> = _.fromPairs(
			filePaths.map(function (filePath) {
				const fileContentPromise: Promise<string> = readFile(
					path.join(dir, filePath),
					'utf8',
				);
				return [filePath, fileContentPromise];
			}),
		);
		return Bluebird.props(fileMapping);
	}
}
