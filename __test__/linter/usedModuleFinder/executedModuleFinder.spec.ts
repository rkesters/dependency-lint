import ExecutedModuleFinder from '../../../src/linter/used_module_finder/executedModuleFinder';
import { outputFile, outputJson } from 'fs-extra';
import { getTmpDir } from '../../../test/support/getTmpDir';
import path from 'path';
import Promise from 'bluebird';
import { beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { ExecutedModules, ModuleUsage } from '../../../src/types';
import { PackageJson } from 'type-fest';

type Example = {
	config: ExecutedModules;
	description: string;
	expectedResult: ModuleUsage[];
	modulePackageJson?: PackageJson;
	packageJson: PackageJson;
	file?: { path: string; content: string };
};

const examples: Example[] = [
	{
		config: { shellScripts: { root: '' } },
		description: 'no scripts',
		expectedResult: [],
		packageJson: {},
	},
	{
		config: { shellScripts: { root: '' } },
		description: 'package.json script using module exectuable',
		expectedResult: [{ name: 'myModule', script: 'test' }],
		modulePackageJson: {
			name: 'myModule',
			bin: 'path/to/executable',
		},
		packageJson: {
			dependencies: { myModule: '0.0.1' },
			scripts: { test: 'myModule --opt arg' },
		},
	},
	{
		config: { shellScripts: { root: '' } },
		description: 'package.json script using module named exectuable',
		expectedResult: [{ name: 'myModule', script: 'test' }],
		modulePackageJson: {
			name: 'myModule',
			bin: { myExecutable: 'path/to/executable' },
		},
		packageJson: {
			dependencies: { myModule: '0.0.1' },
			scripts: { test: 'myExecutable --opt arg' },
		},
	},
	{
		config: { shellScripts: { root: '' } },
		description: 'package.json script using scoped module exectuable',
		expectedResult: [{ name: '@myOrganization/myModule', script: 'test' }],
		modulePackageJson: {
			name: '@myOrganization/myModule',
			bin: { myExecutable: 'path/to/executable' },
		},
		packageJson: {
			dependencies: { '@myOrganization/myModule': '0.0.1' },
			scripts: { test: 'myExecutable --opt arg' },
		},
	},
	{
		config: { shellScripts: { root: '' } },
		description:
			'package.json script containing module executable in another word',
		expectedResult: [],
		modulePackageJson: {
			name: 'myModule',
			bin: { myExecutable: 'path/to/executable' },
		},
		packageJson: {
			dependencies: { myModule: '0.0.1' },
			scripts: { test: 'othermyExecutable --opt arg' },
		},
	},
	{
		config: { shellScripts: { root: 'bin/*' } },
		description: 'shell script using module exectuable',
		expectedResult: [{ name: 'myModule', file: 'bin/test' }],
		file: {
			path: 'bin/test',
			content: 'myExecutable --opt arg',
		},
		modulePackageJson: {
			name: 'myModule',
			bin: { myExecutable: 'path/to/executable' },
		},
		packageJson: {
			dependencies: { myModule: '0.0.1' },
		},
	},
];

describe('ExecutedModuleFinder', function () {
	beforeEach(async function () {
		this.tmpDir = await getTmpDir();
	});

	describe('find', () =>
		examples.forEach(function (example) {
			const {
				config,
				description,
				expectedResult,
				file,
				modulePackageJson,
				packageJson,
			} = example;

			describe(description, function () {
				beforeEach(async function () {
					const promises = [];
					if (modulePackageJson) {
						const filePath = path.join(
							this.tmpDir,
							'node_modules',
							modulePackageJson.name as string,
							'package.json',
						);
						promises.push(outputJson(filePath, modulePackageJson));
					}
					if (file) {
						promises.push(
							outputFile(
								path.join(this.tmpDir, file.path),
								file.content,
							),
						);
					}
					await Promise.all(promises);
					const finder = new ExecutedModuleFinder(config);
					this.result = await finder.find({
						dir: this.tmpDir,
						packageJson,
					});
				});

				it('returns the executed modules', function () {
					expect(this.result).to.eql(expectedResult);
				});
			});
		}));
});
