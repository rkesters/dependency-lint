import _ from 'lodash';
import { addToJsonFile, addToYmlFile } from '../support/file_helpers';
import { readFile, readJson, outputFile } from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { Given, Then } from '@cucumber/cucumber';
import { version } from '../../package.json';
import { expect } from 'chai';

Given(
	/^I have a file "([^"]*)" which requires "([^"]*)"$/,
	async function (file, module) {
		const content =
			path.extname(file) === '.coffee'
				? `require '${module}'`
				: `require('${module}')`;
		await outputFile(path.join(this.tmpDir, file), content);
	},
);

Given(
	/^I have a file "([^"]*)" which resolves "([^"]*)"$/,
	async function (file, module) {
		await outputFile(
			path.join(this.tmpDir, file),
			`require.resolve('${module}')`,
		);
	},
);

Given(
	/^I have a file "([^"]*)" with a coffeescript compilation error$/,
	async function (file) {
		await outputFile(path.join(this.tmpDir, file), "require '");
	},
);

Given(
	/^I have a file "([^"]*)" with the content:$/,
	async function (file, content) {
		await outputFile(path.join(this.tmpDir, file), content);
	},
);

Given(
	/^I have configured "([^"]*)" to contain "([^"]*)"$/,
	async function (key: string, value: string) {
		const filePath = path.join(this.tmpDir, 'dependency-lint.yml');
		const content = {};
		_.set(content, key, [value]);
		await addToYmlFile(filePath, content);
	},
);

Given(
	/^I have configured "([^"]*)" to contain$/,
	async function (key: any, table: any) {
		const filePath = path.join(this.tmpDir, 'dependency-lint.yml');
		const value = table
			.hashes()
			.map((obj: any) => _.mapKeys(obj, (v, k) => k.toLowerCase()));
		const content = {};
		_.set(content, key, value);
		await addToYmlFile(filePath, content);
	},
);

Given(
	/^I have configured "([^"]*)" to be "([^"]*)"$/,
	async function (key, value) {
		const filePath = path.join(this.tmpDir, 'dependency-lint.yml');
		const content = {};
		_.set(content, key, value);
		await addToYmlFile(filePath, content);
	},
);

Given(/^I have configured "([^"]*)" to be true$/, async function (key) {
	const filePath = path.join(this.tmpDir, 'dependency-lint.yml');
	const content = {};
	_.set(content, key, true);
	await addToYmlFile(filePath, content);
});

Given(/^I have no (.*) listed$/, async function (key: any) {
	const filePath = path.join(this.tmpDir, 'package.json');
	const content: any = {};
	content[key] = [];
	await addToJsonFile(filePath, content);
});

Given(/^I have "([^"]*)" installed$/, async function (nameAndVersion) {
	let [name, version] = Array.from(nameAndVersion.split(' @ '));
	if (!version) {
		version = '1.0.0';
	}
	const filePath = path.join(
		this.tmpDir,
		'node_modules',
		name,
		'package.json',
	);
	const content = { name, version };
	await addToJsonFile(filePath, content);
});

Given(
	/^I have "([^"]*)" listed as a (.*)$/,
	async function (nameAndVersion, type) {
		const filePath = path.join(this.tmpDir, 'package.json');
		const key = type.replace('y', 'ies');
		let [name, version] = Array.from(nameAndVersion.split(' @ '));
		if (!version) {
			version = '^1.0.0';
		}
		const content: any = {};
		content[key] = {};
		content[key][name] = version;
		await addToJsonFile(filePath, content);
	},
);

Given(
	/^I have a script named "([^"]*)" defined as "([^"]*)"$/,
	async function (name, command) {
		const filePath = path.join(this.tmpDir, 'package.json');
		const content: any = { scripts: {} };
		content.scripts[name] = command;
		await addToJsonFile(filePath, content);
	},
);

Given(
	/^the "([^"]*)" module exposes the executable "([^"]*)"$/,
	async function (name, executable) {
		const filePath = path.join(
			this.tmpDir,
			'node_modules',
			name,
			'package.json',
		);
		const content = { name, bin: { [executable]: 'path/to/executable' } };
		await addToJsonFile(filePath, content);
	},
);

Then(
	/^now I have the file "([^"]*)" with the default config$/,
	async function (filename) {
		const filePaths = [
			path.join(__dirname, '..', '..', 'config', 'default.yml'),
			path.join(this.tmpDir, filename),
		];
		const promises: [Promise<string>, Promise<string>] = [
			readFile(filePaths[0], 'utf8'),
			readFile(filePaths[1], 'utf8'),
		];
		const [defaultConfigContent, userConfigContent]: [string, string] =
			await Promise.all(promises);
		const defaultConfig = yaml.load(defaultConfigContent);
		const userConfig = yaml.load(userConfigContent);
		expect(defaultConfig).to.eql(userConfig);
	},
);

Then(
	/^(?:now I|I still)( no longer)? have "([^"]*)" listed as a (.*)$/,
	async function (negate, name, type) {
		const filePath = path.join(this.tmpDir, 'package.json');
		const content = await readJson(filePath);
		const key = type.replace('y', 'ies');
		const obj = content[key];
		if (negate) {
			expect(obj).to.not.have.key(name);
		} else {
			expect(obj).to.have.key(name);
		}
	},
);

Then(/^"([^"]*)" contains$/, async function (filename, content) {
	const filePath = path.join(this.tmpDir, filename);
	const fileContent = await readFile(filePath, 'utf8');
	content = content.replace('{{version}}', version);
	expect(fileContent).to.contain(content);
});
