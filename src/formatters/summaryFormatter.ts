import { isNil, filter, includes, times } from 'lodash';
import colors from 'colors/safe';
import errorMessages from './errorMessages';
import { Writable } from 'node:stream';
import {
	DependencyModuleInfoMap,
	ModuleInfo,
	ModuleInfoWithError,
	ModuleUsage,
	ModuleUsages,
	ScriptsAndFiles,
} from '../types';
export default class SummaryFormatter {
	private minimal: boolean;
	private stream: Writable;
	constructor({ minimal, stream }: { minimal?: boolean; stream: Writable }) {
		this.minimal = minimal ?? false;
		this.stream = stream;
	}

	// Prints the result to its stream
	print({
		fixes,
		results,
	}: {
		fixes?: Record<string, string[]>;
		results: DependencyModuleInfoMap;
	}) {
		if (!fixes) {
			fixes = {};
		}
		for (const type in results) {
			let modules: ModuleInfoWithError[] = (results as any)[type];
			if (this.minimal) {
				modules = filter(
					modules,
					({ error, errorIgnored }) => !isNil(error) && !errorIgnored,
				);
			}
			if (modules.length === 0) {
				continue;
			}
			this.write(`${type}:`);
			for (const module of modules) {
				const fixed = includes(fixes[type], module.name);
				this.write(this.moduleOutput(module, fixed), 1);
			}
			this.write('');
		}
		if (!this.minimal || this.errorCount(results) !== 0) {
			this.write(this.summaryOutput(results));
		}
	}

	moduleOutput(
		{ error, errorIgnored, files, name, scripts }: ModuleInfoWithError,
		fixed: boolean,
	) {
		if (error) {
			const message = errorMessages[error];
			if (errorIgnored) {
				return colors.yellow(`- ${name} (${message} - ignored)`);
			} else {
				const header = fixed
					? colors.magenta(`✖ ${name} (${message} - fixed)`)
					: colors.red(`✖ ${name} (${message})`);
				return (
					header + colors.gray(this.errorSuffix({ files, scripts }))
				);
			}
		} else {
			return `${colors.green('✓')} ${name}`;
		}
	}

	indent(str: string, count: number) {
		let prefix = '';
		times(count, () => (prefix += '  '));
		return prefix + str;
	}

	write(data: string, indent = 0) {
		data =
			data
				.split('\n')
				.map((str) => this.indent(str, indent))
				.join('\n') + '\n';
		return this.stream.write(data, 'utf8');
	}

	errorCount(results: DependencyModuleInfoMap) {
		let count = 0;
		for (const title in results) {
			const modules = (results as any)[title];
			for (const { error, errorIgnored } of modules) {
				if (error && !errorIgnored) {
					count += 1;
				}
			}
		}
		return count;
	}

	errorSuffix(usage: ScriptsAndFiles) {
		let suffix = '';
		for (const type in usage) {
			const list = (usage as any)[type];
			if (list && list.length > 0) {
				suffix += `\n${this.indent(`used in ${type}:`, 2)}`;
				for (const item of list) {
					suffix += `\n${this.indent(item, 3)}`;
				}
			}
		}
		return suffix;
	}

	summaryOutput(results: DependencyModuleInfoMap) {
		const errors = this.errorCount(results);
		let prefix = colors.green('✓');
		if (errors > 0) {
			prefix = colors.red('✖');
		}
		let msg = `${prefix} ${errors} error`;
		if (errors !== 1) {
			msg += 's';
		}
		return msg;
	}
}
