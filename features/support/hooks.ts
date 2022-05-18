import { addToJsonFile } from './file_helpers';
import { getTmpDir } from './getTmpDir';
import path from 'path';
import { Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';

Before(async function () {
	this.tmpDir = await getTmpDir();
	await addToJsonFile(path.join(this.tmpDir, 'package.json'), {});
});

After(function () {
	if (!this.errorExpected) {
		expect(this.error).to.not.exist(`Excpected no error`);
		expect(this.stderr).to.be.empty(`Excpected no stderr`);
	}
});
