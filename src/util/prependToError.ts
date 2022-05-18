import { isError } from 'lodash';

function prependUnlessPresent(str: string, prefix: string) {
	if (str.startsWith(prefix)) {
		return [prefix, str].join(': ');
	} else {
		return str;
	}
}

export default function prependToError(err: Error | unknown, prefix: string) {
	const message = isError(err)
		? err.message
		: 'Unknown Error provied to prependToError';
	const e = new Error(prependUnlessPresent(message, prefix));
	e.stack = isError(err) ? err.stack ?? e.stack : e.stack;
	return e;
}
