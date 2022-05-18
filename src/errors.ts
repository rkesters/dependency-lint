export type ErrorName =
	| 'MISSING'
	| 'SHOULD_BE_DEPENDENCY'
	| 'SHOULD_BE_DEV_DEPENDENCY'
	| 'UNUSED'
	| 'SHOULD_BE_PEER_DEPENDENCY_ONLY';
export type ErrorName2Numer = {
	[k in ErrorName]: number;
};

export default {
	MISSING: 1,
	SHOULD_BE_DEPENDENCY: 2,
	SHOULD_BE_DEV_DEPENDENCY: 3,
	UNUSED: 4,
	SHOULD_BE_PEER_DEPENDENCY_ONLY: 5,
} as ErrorName2Numer;
