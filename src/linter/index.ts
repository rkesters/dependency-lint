import _ from 'lodash';
import { DependencyLinterConfig, DependencyMap } from '../types';
import DependencyLinter from './dependencyLinter';
import InstalledModuleValidater from './installedModuleValidator';
import UsedModuleFinder from './used_module_finder';
import { PackageJson } from 'type-fest';
export default class Linter {
	private dependencyLinter: DependencyLinter;
	private installedModuleValidater: InstalledModuleValidater;
	private usedModuleFinder: UsedModuleFinder;
	constructor(config: DependencyLinterConfig) {
		this.dependencyLinter = new DependencyLinter(config);
		this.installedModuleValidater = new InstalledModuleValidater();
		this.usedModuleFinder = new UsedModuleFinder(config);
	}

	getListedModules(packageJson: PackageJson): DependencyMap {
		const result: DependencyMap = {
			dependencies: _.keys(packageJson.dependencies ?? {}),

			devDependencies: _.keys(packageJson.devDependencies ?? {}),
			peerDependencies: _.keys(packageJson.peerDependencies ?? {}),
		};
		return result;
	}

	async lint({
		dir,
		packageJson,
	}: {
		dir: string;
		packageJson: PackageJson;
	}) {
		await this.installedModuleValidater.validate({ dir, packageJson });
		const usedModules = await this.usedModuleFinder.find({
			dir,
			packageJson,
		});
		const listedModules = this.getListedModules(packageJson);
		return this.dependencyLinter.lint({ listedModules, usedModules });
	}
}
