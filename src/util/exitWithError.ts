import colors from 'colors/safe';
import { isError } from 'lodash';
import { Writable } from 'stream';
import util from 'util';

export default function exitWithError(
	error: Error | unknown,
	errorStream?: Writable,
): void {
	const err = isError(error) ? error : new Error('Unknow error type');
	const message = (err != null ? err.stack : undefined) || util.format(err);
	if (errorStream) {
		errorStream.write(message);
		return;
	}
	console.error(colors.red(message));
	process.exit(1);
}
