import _ from 'lodash';
import { outputFile, outputJson, readFile, readJson } from 'fs-extra';
import yaml from 'js-yaml';

export async function addToJsonFile(filePath: any, toAdd: any) {
	let obj;
	try {
		obj = await readJson(filePath);
	} catch (error) {
		obj = {};
	}
	_.assign(obj, toAdd);
	await outputJson(filePath, obj);
}

export async function addToYmlFile(filePath: any, toAdd: any) {
	let content;
	try {
		content = await readFile(filePath, 'utf8');
	} catch (error) {
		content = '{}';
	}
	const obj = yaml.load(content);
	_.mergeWith(obj, toAdd, function (objValue, srcValue) {
		if (_.isArray(srcValue)) {
			return srcValue;
		}
	});
	await outputFile(filePath, yaml.dump(obj));
}
