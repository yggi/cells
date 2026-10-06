/** compile(): a parsed piece as a program (program.ts), in phases (compiler/). */
import type { ParseResult } from './ast';
import { parse } from './parser';
import { compile as compileIn } from './compiler';
import { DEFAULT_ENV, type CompileResult, type Env } from './program';

/** A parsed piece, compiled: the phases are in compiler/ (index.ts says their order). */
export function compile(parsed: ParseResult, env: Env = DEFAULT_ENV): CompileResult {
  return compileIn(parsed, env);
}

export const compileSource = (source: string, env: Env = DEFAULT_ENV): CompileResult => compile(parse(source), env);
