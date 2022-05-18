import _ from 'lodash';
import camelCase from 'camel-case';
import ERRORS, { ErrorName } from '../errors';
import minimatch from 'minimatch';
import type {
	DependencyLinterConfig,
	DependencyMap,
	ModuleInfo,
	DependencyModuleInfoMap,
	ModuleStatus,
} from '../types';
import fs from 'fs-extra';
import path from 'path';

export default class DependencyLinter {
	private devFiles: string[];
	private ignoreErrors: Partial<Record<number, string[]>>;
	private packageJson = fs.readJSONSync(
		path.join(__dirname, '../../package.json'),
	);
	constructor(private config: DependencyLinterConfig) {
		this.config = config;
		this.devFiles = _.concat(
			this.config.executedModules.shellScripts.dev,
			this.config.requiredModules.files.dev,
		);
		this.ignoreErrors = _.reduce(
			ERRORS,
			(acc, value, key) => {
				acc[value] = this.config.ignoreErrors[camelCase(key)];
				return acc;
			},
			{} as Partial<Record<number, string[]>>,
		);
	}

	// Lints the used and listed modules
	//
	// listedModules - {dependencies, devDependencies} where each is an array of module names
	// usedModules - array of {name, files, scripts}
	//
	// Returns {dependencies, devDependencies}
	//         where each is an array of {name, files, scripts, error, warning}
	lint({
		listedModules,
		usedModules,
	}: {
		listedModules: DependencyMap;
		usedModules: ModuleInfo[];
	}) {
		let key;
		const out: DependencyModuleInfoMap = {
			dependencies: [],
			devDependencies: [],
			peerDependencies: [],
		};

		for (const usedModule of usedModules) {
			const status: ModuleStatus = {
				isDependency: !this.isDevDependency(usedModule),
				listedAsDependency: listedModules.dependencies.includes(
					usedModule.name,
				),
				listedAsDevDependency: listedModules.devDependencies.includes(
					usedModule.name,
				),
				listedAsPeerDependency: listedModules.peerDependencies.includes(
					usedModule.name,
				),
			};

			this.parseUsedModule(usedModule, status, out);
		}

		_.reduce(
			listedModules,
			(acc, modules: string[], key) => {
				for (var name of modules) {
					if (
						!_.some(
							usedModules,
							(moduleData) => moduleData.name === name,
						)
					) {
						const listedModule: ModuleInfo = {
							name,
							files: [],
							scripts: [],
						};
						if (
							key !== 'devDependencies' ||
							name !== this.packageJson.name
						) {
							listedModule.error = ERRORS.UNUSED;
						}
						(acc as any)[key].push(listedModule);
					}
				}
				return acc;
			},
			out,
		);

		return _.reduce(
			out,
			(acc, results, key) => {
				results.forEach((result) => {
					if (
						result.error &&
						this.isErrorIgnored(
							result as { error: number; name: string },
						)
					) {
						result.errorIgnored = true;
					}
				});
				(acc as any)[key] = _.sortBy(results, 'name');
				return acc;
			},
			out,
		);
	}

	isErrorIgnored({ error, name }: { error: number; name: string }): boolean {
		return _.some(this.ignoreErrors[error], (regex) => name.match(regex));
	}

	isDevDependency({ files, scripts }: ModuleInfo) {
		return (
			_.every(files, this.isDevFile.bind(this)) &&
			_.every(scripts, this.isDevScript.bind(this))
		);
	}

	isDevFile(file: string) {
		return _.some(this.devFiles, (pattern) => minimatch(file, pattern));
	}

	isDevScript(script: string) {
		return _.some(this.config?.executedModules?.npmScripts?.dev, (regex) =>
			script.match(regex),
		);
	}

	parseUsedModule(
		usedModule: ModuleInfo,
		status: ModuleStatus,
		result: DependencyModuleInfoMap,
	): void {
		const { isDependency, listedAsDependency, listedAsDevDependency, listedAsPeerDependency } =
			status;
		if (isDependency) {
			if (listedAsDependency && listedAsPeerDependency) {
				result.peerDependencies.push({...usedModule, error: ERRORS.SHOULD_BE_PEER_DEPENDENCY_ONLY})
			}
			if (listedAsDependency) {
				result.dependencies.push(usedModule);
			}
			if (listedAsDevDependency && !listedAsPeerDependency) {
				result.devDependencies.push(
					_.assign({}, usedModule, {
						error: ERRORS.SHOULD_BE_DEPENDENCY,
					}),
				);
			}
			if (!listedAsDependency && !listedAsDevDependency) {
				result.dependencies.push(
					_.assign({}, usedModule, { error: ERRORS.MISSING }),
				);
				return;
			}
		} else {
			if (listedAsDependency) {
				result.dependencies.push(
					_.assign({}, usedModule, {
						error: ERRORS.SHOULD_BE_DEV_DEPENDENCY,
					}),
				);
			}
			if (listedAsDevDependency) {
				result.devDependencies.push(usedModule);
			}
			if (!listedAsDependency && !listedAsDevDependency) {
				result.devDependencies.push(
					_.assign({}, usedModule, { error: ERRORS.MISSING }),
				);
			}
		}
	}
}
