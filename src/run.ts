import _, { isUndefined } from 'lodash';
import AutoCorrector from './autoCorrector';
import ConfigurationLoader from './configurationLoader';
import { readJson, writeJson } from 'fs-extra';
import JsonFormatter from './formatters/jsonFormatter';
import Linter from './linter';
import path from 'path';
import SummaryFormatter from './formatters/summaryFormatter';
import { ExecOptionsBase, FormatterNames, ModuleInfo } from './types';
import { Writable } from 'stream';

function getFormatter(format: FormatterNames, outputStream?: Writable) {
	const options = { stream: outputStream ?? process.stdout };
	switch (format) {
		case 'minimal':
			return new SummaryFormatter(_.assign({ minimal: true }, options));
		case 'summary':
			return new SummaryFormatter(options);
		case 'json':
			return new JsonFormatter(options);
	}
}

const hasError = (results: Record<string, ModuleInfo[]>) =>
	_.some(results, (modules) =>
		_.some(
			modules,
			({ error, errorFixed, errorIgnored }: ModuleInfo) =>
				!isUndefined(error) && !(errorFixed || errorIgnored),
		),
	);

export default async function run(
	opts: ExecOptionsBase,
	cwd?: string,
	shouldExitOnError = true,
) {
	const { autoCorrect, format, outputStream } = opts;
	let fixes;
	const dir = cwd ?? process.cwd();
	const packageJsonPath = path.join(dir, 'package.json');
	const packageJson = await readJson(packageJsonPath);
	const config = await new ConfigurationLoader().load(dir);
	const results = await new Linter(config).lint({ dir, packageJson });
	if (autoCorrect) {
		let updatedPackageJson;
		({ fixes, updatedPackageJson } = new AutoCorrector().correct({
			packageJson,
			results,
		}));
		await writeJson(packageJsonPath, updatedPackageJson, { spaces: 2 });
	}
	getFormatter(format, outputStream).print({ fixes, results });
	if (hasError(results) && shouldExitOnError) {
		process.exit(1);
	}
}
