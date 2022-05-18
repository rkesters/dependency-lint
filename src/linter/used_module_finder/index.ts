import _ from 'lodash';
import ExecutedModuleFinder from './executedModuleFinder';
import RequiredModuleFinder from './requiredModuleFinder';
import {
	DependencyLinterConfig,
	LibaryInfo,
	ModuleUsage,
	ModuleUsages,
} from '../../types';

export default class UsedModuleFinder {
	private executedModuleFinder: ExecutedModuleFinder;
	private requiredModuleFinder: RequiredModuleFinder;

	constructor(config: DependencyLinterConfig) {
		this.executedModuleFinder = new ExecutedModuleFinder(
			config.executedModules,
		);
		this.requiredModuleFinder = new RequiredModuleFinder(
			config.requiredModules,
		);
	}

	async find({ dir, packageJson }: LibaryInfo) {
		const modules = await Promise.all([
			this.executedModuleFinder.find({ dir, packageJson }),
			this.requiredModuleFinder.find(dir),
		]);
		return this.normalizeModules(modules);
	}

	normalizeModules(modules: [ModuleUsage[], ModuleUsage[]]): ModuleUsages[] {
		const result: Record<string, ModuleUsages> = {};
		const mods: ModuleUsage[] = _.flattenDeep(modules);
		for (const { name, file, script } of mods) {
			if (!result[name]) {
				result[name] = { name, files: [], scripts: [] };
			}
			if (file) {
				result[name].files.push(file);
			}
			if (script) {
				result[name].scripts.push(script);
			}
		}
		return _.values(result);
	}
}
