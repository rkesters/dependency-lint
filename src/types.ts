import type { PackageJson } from 'type-fest';
import type { Node } from 'acorn';
import type { Writable } from 'node:stream';
import type { Options } from 'acorn';
import { stringify } from 'node:querystring';
import { get, has, isObject } from 'lodash';
export type CliOptions = {
	'--auto-correct': boolean;
	'--format': string;
	'--help': boolean;
	'--generate-config': boolean;
	'--version': boolean;
};

export interface CompilerFunctionOptionsBuiltin {
	cwd: string;
	filename: string;
	config: TranspilerConfigBuiltin  ;
}
export interface CompilerFunctionOptionsExternal {
	cwd: string;
	filename: string;
	config:   TranspilerConfigExternal;
}

export type CompilerFunctionExternal = (
	content: string ,
	options: CompilerFunctionOptionsExternal
) => Record<string, string> ;
export type CompilerFunctionBuiltin = (
	content: undefined ,
	options: CompilerFunctionOptionsBuiltin
) => string ;


export type ExecOptionsBase = {
	format: FormatterNames;
	autoCorrect?: boolean;
	outputStream?: Writable;
};

export interface AcornNodeNode extends Node {
	callee: AcornCallee;
}
export interface AcornCallee {
	object: AcornCallee;
	property: AcornCallee;
	name: string;
	type: string;
}
export type ModuleUsage =
	| {
			name: string;
			script: string;
			file?: undefined;
	  }
	| {
			name: string;
			file: string;
			script?: undefined;
	  };

export type ScriptsAndFiles = {
	scripts: string[];
	files: string[];
};
export interface ModuleUsages extends ScriptsAndFiles {
	name: string;
}

export type ExecutableModules = {
	moduleExecutables: Record<string, string>;
	packageJsonScripts: any;
	shellScripts: Record<string, string>;
};
export type ShellScripts = {
	dev?: any;
	root: string;
	ignore?: string | ReadonlyArray<string> | undefined;
};
export type NpmScripts = ShellScripts;
export type ExecutedModules = {
	shellScripts: ShellScripts;
	npmScripts?: NpmScripts;
};
export type AcornParseProps = Options;

export interface TranspilerConfigBuiltin {
	extension: string;
	builtin: 'ts';
	configFile?: string;
}
export interface TranspilerConfigExternal {
	extension: string;
	module: string;
	fnName?: string;
	resultKey?: string;
}
export function isTranspilerConfigBuiltin(value: unknown): value is TranspilerConfigBuiltin {
	if(!isObject(value)) return false;
	return (has(value, 'extension') &&  has(value, 'builtin') && get(value, 'builtin') === 'ts')
}

export function isCompilerFunctionBuiltin(config: TranspilerConfigBuiltin | TranspilerConfigExternal, value: unknown): value is CompilerFunctionBuiltin {
   return(isTranspilerConfigBuiltin(config));
}

export type RequiredModulesConfig = {
	files: ShellScripts;
	acornParseProps?: AcornParseProps | undefined;
	stripLoaders?: boolean;
	transpilers?: (TranspilerConfigBuiltin | TranspilerConfigExternal) [];
};
export interface DependencyLinterConfig {
	ignoreErrors: Partial<Record<string, string[]>>;
	executedModules: ExecutedModules;
	requiredModules: RequiredModulesConfig;
}

export type LibaryInfo = {
	dir: string;
	packageJson: PackageJson;
};

export type ModuleInfo = {
	name: string;
	files: string[];
	scripts: string[];
	error?: number;
	errorIgnored?: boolean;
	errorFixed?: boolean;
};

export type ModuleInfoWithError = {
	name: string;
	files: string[];
	scripts: string[];
	error: number;
	errorIgnored?: boolean;
};

export type DependencyMap = {
	dependencies: string[];
	devDependencies: string[];
	peerDependencies:string[];
};
export type DependencyModuleInfoMap = {
	dependencies: ModuleInfo[];
	devDependencies: ModuleInfo[];
	peerDependencies:ModuleInfo[];
};

export type ModuleStatus = {
	isDependency: boolean;
	listedAsDependency: boolean;
	listedAsDevDependency: boolean;
	listedAsPeerDependency: boolean;
};

export type FormatterNames = 'minimal' | 'summary' | 'json';
