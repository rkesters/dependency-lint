import ERRORS from '../errors';

export default {
	[ERRORS.MISSING]: 'missing',
	[ERRORS.SHOULD_BE_DEPENDENCY]: 'should be dependency',
	[ERRORS.SHOULD_BE_DEV_DEPENDENCY]: 'should be devDependency',
	[ERRORS.UNUSED]: 'unused',
	[ERRORS.SHOULD_BE_PEER_DEPENDENCY_ONLY]: 'should not be listed in both dependency and peerDependency'
} as Record<number, string>;
