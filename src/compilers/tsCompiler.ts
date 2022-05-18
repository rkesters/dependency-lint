import ts, { ObjectFlags } from 'typescript';
import fs from 'fs-extra';
import path from 'path';
import process from 'process';
import { get, has, isEmpty, isError, isUndefined, set } from 'lodash';
import {
	CompilerFunctionBuiltin,
	CompilerFunctionOptionsBuiltin,
} from '../types';

function reportDiagnostics(diagnostics: ts.Diagnostic[]) {
	return diagnostics.map((diagnostic) => {
		let message = 'Error';
		if (diagnostic.file && !isUndefined(diagnostic.start)) {
			const where = diagnostic.file.getLineAndCharacterOfPosition(
				diagnostic.start,
			);
			message +=
				' ' +
				diagnostic.file.fileName +
				' ' +
				where.line +
				', ' +
				where.character +
				1;
		}
		message +=
			': ' +
			ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		return message;
	});
}

class DiagnosticsError extends Error {
	public readonly diagnostics: string[];
	constructor(diagnostics: string[], message?: string) {
		super(message);
		this.diagnostics = diagnostics;
	}
}

const configFiles: Record<string, ts.ParsedCommandLine> = {};

function readConfigFile(dir: string, configFile: string | undefined) {
	const configFileName = configFile
		? path.resolve(dir, configFile)
		: ts.findConfigFile(dir, fs.existsSync);

	if (!configFileName) {
		throw new Error(`Unable to find config file for, ${dir}`);
	}
	if (configFiles[configFileName]) {
		return configFiles[configFileName];
	}

	// Read config file
	const configFileText = fs.readFileSync(configFileName).toString();

	// Parse JSON, after removing comments. Just fancier JSON.parse
	const result = ts.parseConfigFileTextToJson(configFileName, configFileText);
	const configObject = result.config;
	if (!configObject) {
		if (!isUndefined(result.error)) reportDiagnostics([result.error]);
	}

	// Extract config infromation
	const configParseResult = ts.parseJsonConfigFileContent(
		configObject,
		ts.sys,
		`${path.dirname(configFileName)}/`,
		undefined,
		path.basename(configFileName),
	);
	if (configParseResult.errors.length > 0) {
		const errors = reportDiagnostics(configParseResult.errors);
		throw new DiagnosticsError(
			errors,
			`Failed to parse TS Config: ${configFileName}`,
		);
	}
	configFiles[configFileName] = configParseResult;
	return configParseResult;
}

const writeJS = (
	resultsMap: Record<string, Record<string, string>>,
): ts.WriteFileCallback => (
	fileName: string,
	data: string,
	writeByteOrderMark: boolean,
	onError?: (message: string) => void,
	sourceFiles?: readonly ts.SourceFile[],
): void => {
	if ((fileName.endsWith('.map') || fileName.endsWith('.ts'))
	
	) {
		return;
	}
	const sourceName = sourceFiles ? sourceFiles[0].fileName : 'unknownSource';
	const map = resultsMap[sourceName] ?? ({} as Record<string, string>);
	resultsMap[sourceName] = map;
	map[fileName] = data;
};

let program: ts.Program | undefined;
export const compile: CompilerFunctionBuiltin = (
	_content: undefined,
	options: CompilerFunctionOptionsBuiltin,
) => {
	try {
		// Extract configuration from config file
		const config = readConfigFile(options.cwd, options.config.configFile);

		// Compile
		program = program ?? ts.createProgram(config.fileNames, config.options);
		const src = program.getSourceFile(options.filename);
		if (!src) {
			throw new Error(`Unable to find source file ${options.filename}`);
		}
		if (src.fileName.endsWith('.d.ts')) {
			return '';
		}
		const results: Record<string, Record<string, string>> = {};
		const emitResult = program.emit(src, writeJS(results));
		// Report errors
		const d = reportDiagnostics(
			ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics),
		);
		if (!isEmpty(d)) {
			throw new DiagnosticsError(d, 'Failed');
		}

		// Return code
		if (emitResult.emitSkipped) {
			throw new Error(`Failed to emit JS`);
		}
		const baseName = path.basename(options.filename, '.ts');
		const dir = path.dirname(options.filename);
		const compiledFileName = path.join(dir, `${baseName}.js`);
		const compiledFiles = results[src.fileName];
		if (!compiledFiles && !src.fileName.endsWith('.d.ts')) {
			throw new Error(`No compiled files for ${src.fileName}`)
		}
		if (Object.keys(compiledFiles).length === 1) {
			return compiledFiles[Object.keys(compiledFiles)[0]];
		}

		throw new Error(`unable to match source file to compiled file`);
	} catch (error) {
		if (error instanceof DiagnosticsError) {
			console.error(error.message);
			error.diagnostics.map((d) => {
				console.error(`\t${d}`);
			});
		}
		if (isError(error)) {
			console.error(error.message);
		}
		console.error(
			(error as any).toString
				? (error as any).toString()
				: 'Failed with unknown error',
		);
		throw error;
	}
};
