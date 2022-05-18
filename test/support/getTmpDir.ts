import Bluebird from 'bluebird';
import tmp, { DirOptions, DirCallback } from 'tmp';

type TempDir = (options: DirOptions) => Bluebird<string>;

const tmpDir: TempDir = Bluebird.promisify(
	(options: DirOptions, cb: DirCallback) => tmp.dir(options, cb),
);
export function getTmpDir(): Promise<string> {
	return tmpDir({ unsafeCleanup: true });
}
