import _ from 'lodash';
import builtIns from 'builtin-modules';

const globalExecutables = ['npm'];

export default {
	isBuiltIn(name: string | undefined) {
		if (_.isUndefined(name)) {
			return false;
		}
		return builtIns.includes(name);
	},

	isGlobalExecutable(name: string) {
		return globalExecutables.includes(name);
	},

	isRelative(name: string | undefined) {
		if (_.isUndefined(name)) {
			return false;
		}
		return name.startsWith('.');
	},

	stripLoaders(name: string) {
		const array = name.split('!');
		return _.last(array);
	},

	stripSubpath(name: string | undefined): string | undefined {
		if (_.isUndefined(name)) {
			return name;
		}
		if (name.startsWith('@types/')) {
			name = name.slice(0, 8)
		}
		const parts = name.split('/');

		if (name.startsWith('@')) {
			return parts.slice(0, 2).join('/');
		} else {
			return parts[0];
		}
	},
};
