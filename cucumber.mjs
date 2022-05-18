export default {
	format: ['progress'],
	//['progress', 'rerun:@rerun.txt'],
	//require: [ '.features/features/support/**/*.js',  '.features/features/stepDefinitions/**/*.js'],
	require: [ 'features/support/**/*.ts',  'features/stepDefinitions/**/*.ts'],
	requireModule: ['ts-node/register'],
	publishQuiet: true,
};
