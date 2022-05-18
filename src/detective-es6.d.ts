declare module 'detective-es6' {
	type Options = Record<string, unknown>;
	function detectiveEs6(src: string, options?: Options): any;
	export = detectiveEs6;
}
