import _ from 'lodash';
import { access, readJson } from 'fs-extra';
import path from 'path';
import semver from 'semver';
import { PackageJson } from 'type-fest';

export default class InstalledModuleValidater {
	buildErrorMessage(issues: { name: string; status: string }[]) {
		const issueMessages = issues.map(
			({ name, status }) => `${name} (${status})`,
		);
		return `\
The following modules listed in your \`package.json\` have issues:
  ${issueMessages.join('\n  ')}
All modules need to be installed with the correct semantic version
to properly check for the usage of a module's executables.\
`;
	}

	async getModuleStatus({
		dir,
		name,
		version,
	}: {
		dir: string;
		name: string;
		version: string;
	}) {
		const modulePackageJsonPath = path.join(
			dir,
			'node_modules',
			name,
			'package.json',
		);
		try {
			await access(modulePackageJsonPath);
		} catch (error) {
			return 'not installed';
		}
		const modulePackageJson = await readJson(modulePackageJsonPath);
		if (semver.satisfies(modulePackageJson.version, version)) {
			return;
		}
		return `installed: ${modulePackageJson.version}, listed: ${version}`;
	}

	async validate({
		dir,
		packageJson,
	}: {
		dir: string;
		packageJson: PackageJson;
	}) {
		const modules = _.assign(
			{},
			packageJson.devDependencies,
			packageJson.dependencies,
			packageJson.peerDependencies
		);
		const issues: { name: string; status: string }[] = [];
		await Promise.all(
			_.map(modules, async (version, name) => {
				if (!semver.validRange(version)) {
					return;
				}
				const status = await this.getModuleStatus({
					dir,
					name,
					version,
				});
				if (!status) {
					return;
				}
				issues.push({ name, status });
			}),
		);
		if (issues.length > 0) {
			throw new Error(this.buildErrorMessage(issues));
		}
	}
}
