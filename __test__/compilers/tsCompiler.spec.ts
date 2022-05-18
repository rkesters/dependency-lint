import ERRORS from '../../src/errors';
import { beforeEach, describe, it as test } from 'mocha';
import { expect } from 'chai';
import { compile } from '../../src/compilers/tsCompiler';
import path from 'path';
import { TranspilerConfigBuiltin } from '../../src/types';

describe('Given TS Compiler', function() {
	beforeEach(function() {
		this.compiler = compile;
	});
	describe('Given valid TS Config', function() {
		beforeEach(function() {
			this.dir = path.resolve(__dirname, '../../');
		});

		describe('Given valid TS file', function() {
			beforeEach(function() {
				this.tsFile = path.resolve(__dirname, '../../src/cli.ts');
			});
			test(`Then compiled file is returned`, function() {
				const results = compile(undefined, {
					cwd: this.dir,
					filename: this.tsFile,
					config: {
						extension: '.ts',
						builtin: 'ts',
						configFile: './tsconfig.depLint.json',
					},
				});
				expect(results).to.not.be.undefined;
			});
		});
	});
});
