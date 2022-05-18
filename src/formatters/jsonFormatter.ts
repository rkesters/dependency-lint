import _ from 'lodash';
import { Writable } from 'node:stream';
import { DependencyModuleInfoMap, ModuleInfoWithError } from '../types';
import errorMessages from './errorMessages';

export default class JsonFormatter {
	private stream: Writable;
	// stream - writable stream to send output
	constructor({ stream }: { stream: Writable }) {
		this.stream = stream;
	}

	// Prints the result to its stream
	print({
		fixes: fixesIn,
		results,
	}: {
		fixes?: Record<string, string[]>;
		results: DependencyModuleInfoMap;
	}) {
		const fixes = fixesIn ?? {};
		const data = _.mapValues(results, (modules, type) =>
			_.map(modules, function (module) {
				const fixed = _.includes(fixes[type], module.name);
				const error = errorMessages[module.error as number];
				return _.assign({}, module, { error, fixed });
			}),
		);
		return this.stream.write(JSON.stringify(data, null, 2), 'utf8');
	}
}
