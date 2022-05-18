import _, { isUndefined } from 'lodash';
import ERRORS from '../errors';
import sortedObject from 'sorted-object';
import {
	DependencyMap,
	DependencyModuleInfoMap,
	ModuleInfo,
	ModuleInfoWithError,
} from '../types';
import { PackageJson } from 'type-fest';

export default class AutoCorrector {
	correct({
		packageJson,
		results,
	}: {
		packageJson: PackageJson;
		results: DependencyModuleInfoMap;
	}) {
		const { changes, fixes } = this.getChanges(results);
		const updatedPackageJson = this.applyChanges({ changes, packageJson });
		return { fixes, updatedPackageJson };
	}

	getChanges(results: DependencyModuleInfoMap) {
		const changes = [];
		const fixes: DependencyMap = {
			dependencies: [],
			devDependencies: [],
			peerDependencies: [],
		};
		let type: 'dependencies' | 'devDependencies' | 'peerDependencies' =
			'dependencies';
		for (type in results) {
			const modules = results[type];
			for (const module of modules) {
				const change = this.getChange({ module, type });
				if (change) {
					changes.push(change);
					fixes[type].push(module.name);
				}
			}
		}
		return { changes, fixes };
	}

	getChange({
		module,
		type,
	}: {
		module: ModuleInfo;
		type: 'dependencies' | 'devDependencies' | 'peerDependencies';
	}) {
		if (module.errorIgnored) {
			return;
		}
		switch (module.error) {
			case ERRORS.SHOULD_BE_DEPENDENCY:
			case ERRORS.SHOULD_BE_DEV_DEPENDENCY:
				return function (packageJson: PackageJson) {
					const newType =
						type === 'dependencies'
							? 'devDependencies'
							: 'dependencies';
					const modules = packageJson[type];
					if (isUndefined(modules)) {
						throw new Error(
							`Unable to determine verson for ${module.name} in ${type}`,
						);
					}
					const version = modules[module.name];
					delete modules[module.name];
					if (isUndefined(packageJson[newType])) {
						packageJson[newType] = {};
					}
					const newModules = (packageJson[newType] =
						packageJson[newType] ?? {});
					newModules[module.name] = version;
					packageJson[newType] = sortedObject(
						newModules,
					) as PackageJson.Dependency;
				};
			case ERRORS.UNUSED:
				return (packageJson: PackageJson) => {
					const modules = packageJson[type] ?? {};
					delete modules[module.name];
				};
		}
	}

	applyChanges({
		changes,
		packageJson,
	}: {
		changes: ((pk: PackageJson) => void)[];
		packageJson: PackageJson;
	}) {
		const updatedPackageJson = _.cloneDeep(packageJson);
		for (const change of changes) {
			change(updatedPackageJson);
		}
		return updatedPackageJson;
	}
}
