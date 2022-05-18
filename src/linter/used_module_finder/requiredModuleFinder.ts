import _, { isString, isUndefined } from 'lodash';
import detective from 'detective';
import detectiveEs6 from 'detective-es6';
import { readFile } from 'fs-extra';
import ModuleNameParser from './moduleNameParser';
import path from 'path';
import prependToError from '../../util/prependToError';
import Bluebird from 'bluebird';
import globIn, { IOptions } from 'glob';
import {
	AcornNodeNode,
	AcornParseProps,
	CompilerFunctionBuiltin,
	CompilerFunctionExternal,
	isCompilerFunctionBuiltin,
	isTranspilerConfigBuiltin,
	ModuleUsage,
	RequiredModulesConfig,
	ShellScripts,
	TranspilerConfigBuiltin,
	TranspilerConfigExternal,
} from '../../types';
import { compile as tsCompiler } from '../../compilers/tsCompiler';

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

export default class RequiredModuleFinder {
	private acornParseProps?: AcornParseProps;
	private files: ShellScripts;
	private stripLoaders?: boolean;
	private transpilers?: (TranspilerConfigBuiltin | TranspilerConfigExternal)[];
	constructor({
		acornParseProps,
		files,
		stripLoaders,
		transpilers,
	}: RequiredModulesConfig) {
		this.acornParseProps = acornParseProps;
		this.files = files;
		this.stripLoaders = stripLoaders;
		this.transpilers = transpilers;
	}

	async getCompiler(
		transpiler: TranspilerConfigBuiltin | TranspilerConfigExternal,
	): Promise<CompilerFunctionExternal | CompilerFunctionBuiltin> {
		if (!isTranspilerConfigBuiltin(transpiler)) {
			const compiler = await import(transpiler.module);
			const fnName = transpiler.fnName ?? 'compile';
			return compiler[fnName];
		}
		switch (transpiler.builtin) {
			case 'ts': {
				return tsCompiler;
			}
		}
		throw new Error(`Unknown transpiler`);
	}
	async compileIfNeeded({
		content,
		dir,
		filePath,
	}: {
		content: string;
		dir: string;
		filePath: string;
	}) {
		const ext = path.extname(filePath);
		const transpiler:
			| TranspilerConfigBuiltin
			| TranspilerConfigExternal
			| undefined = _.find(this.transpilers, ['extension', ext]);
		if (transpiler) {
			const compiler = await this.getCompiler(transpiler);

			if (isTranspilerConfigBuiltin(transpiler)) {
				if (!isCompilerFunctionBuiltin(transpiler, compiler)) {
					throw new Error(`Unexepted Error`);
				}
				let result = compiler(undefined, {
					cwd: dir,
					filename: path.join(dir, filePath),
					config: transpiler as any,
				});
				if (!isString(result)) {
					throw new Error(
						`Builtin Transpiler should return a string, but did not`,
					);
				}
				return result;
			}
			if (isCompilerFunctionBuiltin(transpiler, compiler)) {
				throw new Error(`Unexepted Error`);
			}
			let result = compiler(content, {
				cwd: dir,
				filename: path.join(dir, filePath),
				config: transpiler as any,
			});
			if (isString(result)) {
				if (transpiler.resultKey) {
					throw new Error(
						`Extrenal Transpiler return string, but config implies Dictionary`,
					);
				}
				return result;
			}
			if (!transpiler.resultKey) {
				throw new Error(
					`Extrenal Transpiler return Directionay, but config did provide resultKey`,
				);
			}
			return result[transpiler.resultKey];
		} else {
			return content;
		}
	}

	async find(dir: string): Promise<ModuleUsage[]> {
		const files = await glob({
			pattern: this.files.root,
			options: {
				cwd: dir,
				ignore: this.files.ignore,
			},
		});
		const results = await Bluebird.map(files, (filePath) =>
			this.findInFile({ dir, filePath }),
		);
		return _.flatten(results);
	}

	async findInFile({ dir, filePath }: { dir: string; filePath: string }) {
		let moduleNames: string[] = [];
		let content = await readFile(path.join(dir, filePath), 'utf8');
		try {
			content = await this.compileIfNeeded({ content, dir, filePath });
			const cjsModuleNames = detective(content, {
				parse: this.acornParseProps,
				isRequire: this.isRequire.bind(this),
			});
			const importModulesNames = detectiveEs6(content);
			moduleNames = cjsModuleNames.concat(importModulesNames);
		} catch (err) {
			throw prependToError(err, filePath);
		}
		return this.normalizeModuleNames({
			filePath,
			moduleNames,
		});
	}

	isRequire({ type, callee }: AcornNodeNode) {
		return (
			type === 'CallExpression' &&
			((callee.type === 'Identifier' && callee.name === 'require') ||
				(callee.type === 'MemberExpression' &&
					callee.object.type === 'Identifier' &&
					callee.object.name === 'require' &&
					callee.property.type === 'Identifier' &&
					callee.property.name === 'resolve'))
		);
	}

	normalizeModuleNames({
		filePath,
		moduleNames,
	}: {
		filePath: string;
		moduleNames: string[];
	}): { name: string; file: string }[] {
		return _.chain(moduleNames)
			.map(this.stripLoaders ? ModuleNameParser.stripLoaders : _.identity)
			.reject(ModuleNameParser.isRelative)
			.map(ModuleNameParser.stripSubpath)
			.reject(ModuleNameParser.isBuiltIn)
			.reduce((acc: string[], name) => {
				if (_.isNil(name)) return acc;
				acc.push(name);
				return acc;
			}, [])
			.map((name) => ({ name, file: filePath }))
			.value();
	}
}

module.exports = RequiredModuleFinder;
