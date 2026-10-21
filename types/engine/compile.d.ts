import { type CompileOptions, type CompileResult, type Env } from './program';
/**
 * A piece's text, compiled. Its `use` lines (decision 054) are read through `options.resolve`, and its lockfile's hashes
 * (`options.locked`): what compiles is the expansion (`use.ts`), and what a used line says is said on the `use` line it
 * came through.
 */
export declare function compileSource(source: string, env?: Env, options?: CompileOptions): CompileResult;
