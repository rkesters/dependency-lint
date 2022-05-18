import { docopt } from 'docopt';
import exitWithError from './util/exitWithError';
import run from './run';
import generateConfig from './generate_config';
import { CliOptions, FormatterNames } from './types';
import { Writable } from 'node:stream';
import { isNil } from 'lodash';
import fs from 'fs-extra';
import path from 'path';
const usage: string = `\
Usage:
	dependency-lint [--auto-correct] [--generate-config] [--format <format>]

Options:
	--auto-correct       Moves mislabeled modules and removes unused modules
	--format <format>    Select the formatter: json, minimal (default), summary
	-h, --help           Show this screen
	--generate-config    Generate a configuration file
	-v, --version        Show version\
`;

function isFormatterNames(value: string): value is FormatterNames {
	return ['json', 'minimal', 'summary'].includes(value);
}
export default async function (
	args?: Partial<CliOptions>,
	cwd?: string | undefined,
	outputStream?: Writable,
	errorStream?: Writable,
): Promise<void | Error | undefined> {
	try {
		path.join(__dirname, '../package.json');
		const packageJson = fs.readJSONSync(
			path.join(__dirname, '../package.json'),
		);

		const options: CliOptions =
			args ?? docopt(usage, { version: packageJson.version });
		const fn = options['--generate-config'] ? generateConfig : run;
		const format = options['--format'] || 'minimal';
		if (!isFormatterNames(format)) {
			throw new Error(
				`Invalid format: '${format}'. Valid formats: json, minimal, or summary`,
			);
		}
		await fn(
			{ autoCorrect: options['--auto-correct'], format, outputStream },
			cwd,
			isNil(errorStream),
		);
	} catch (error) {
		exitWithError(error, errorStream);
		if (errorStream) {
			return error as Error;
		}
	}
}
