import _ from 'lodash';
import { access, readFile } from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { DependencyLinterConfig } from '../types';

export default class ConfigurationLoader {
	private defaultConfigPath: string;
	constructor() {
		this.defaultConfigPath = path.join(
			__dirname,
			'..',
			'..',
			'config',
			'default.yml',
		);
	}

	async load(dir: string): Promise<DependencyLinterConfig> {
		const [defaultConfig, userConfig]: [
			DependencyLinterConfig,
			DependencyLinterConfig,
		] = await Promise.all([
			this.loadDefaultConfig(),
			this.loadUserConfig(dir),
		]);
		const customizer = function (_objValue: any, srcValue: string[]) {
			if (_.isArray(srcValue)) {
				return srcValue;
			}
		};
		return _.mergeWith({}, defaultConfig, userConfig, customizer);
	}

	async loadConfig(filePath: string): Promise<DependencyLinterConfig> {
		const content = await readFile(filePath, 'utf8');
		return yaml.load(content, {
			filename: filePath,
		}) as DependencyLinterConfig;
	}

	loadDefaultConfig() {
		return this.loadConfig(this.defaultConfigPath);
	}

	async loadUserConfig(dir: string): Promise<DependencyLinterConfig> {
		const userConfigPath = path.join(dir, 'dependency-lint.yml');
		try {
			await access(userConfigPath);
		} catch (error) {
			return {} as DependencyLinterConfig;
		}
		return this.loadConfig(userConfigPath);
	}
}
