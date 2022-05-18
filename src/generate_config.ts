import { readFile, writeFile } from 'fs-extra';
import path from 'path';
import { ExecOptionsBase, FormatterNames } from './types';
import fs from 'fs-extra';

export default async function generateConfig(
	opts: ExecOptionsBase,
	cwd?: string | undefined,
) {
	const { outputStream } = opts;
	const src = path.join(__dirname, '..', 'config', 'default.yml');
	const dest = path.join(cwd ?? process.cwd(), 'dependency-lint.yml');
	const defaultConfig = await readFile(src, 'utf8');
	const packageJson = fs.readJSONSync(
		path.join(__dirname, '../package.json'),
	);
	const fileContents = `\
# See ${packageJson.homepage}/blob/v${packageJson.version}/docs/configuration.md
# for a detailed explanation of the options

${defaultConfig}\
`;
	await writeFile(dest, fileContents);
	const message = 'Configuration file generated at "dependency-lint.yml"';
	if (outputStream) {
		outputStream.write(message);
		return;
	}
	console.log(message);
}
