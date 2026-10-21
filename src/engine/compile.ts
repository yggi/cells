/** compile(): a parsed piece as a program (program.ts), in phases (compiler/). */
import type { ParseResult } from './ast';
import { parse } from './parser';
import { compile as compileIn } from './compiler';
import { DEFAULT_ENV, type CompileOptions, type CompileResult, type Env } from './program';
import { expansion, hasUse } from './use';

/** A parsed piece, compiled: the phases are in compiler/ (index.ts says their order). */
function compile(parsed: ParseResult, env: Env = DEFAULT_ENV): CompileResult {
  return compileIn(parsed, env);
}

/**
 * A piece's text, compiled. Its `use` lines (decision 054) are read through `options.resolve`, and its lockfile's hashes
 * (`options.locked`): what compiles is the expansion (`use.ts`), and what a used line says is said on the `use` line it
 * came through.
 */
export function compileSource(source: string, env: Env = DEFAULT_ENV, options: CompileOptions = {}): CompileResult {
  if (!hasUse(source)) return compile(parse(source), env);
  const x = expansion(source, options);
  const result = compileIn(parse(x.text), env, x.given);
  const diagnostics = [...x.diagnostics, ...result.diagnostics.map((d) => ({ ...d, span: x.through(d.span.line) ?? d.span }))].sort(
    (a, b) => a.span.line - b.span.line || a.span.col - b.span.col,
  );
  return { ...result, ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics, uses: x.uses };
}
