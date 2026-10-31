/** compile(): a parsed piece as a program (program.ts), in phases (compiler/). */
import type { ParseResult } from './ast';
import { parse } from './parser';
import { compile as compileIn } from './compiler';
import { readSlots } from './compiler/slots';
import { clocking } from './clocking';
import { mainLength, pieceTime } from './duration';
import { codeShifts, DEFAULT_ENV, type CompileOptions, type CompileResult, type Env } from './program';
import { readStyles, type Scope } from './styles';
import { expansion, hasUse } from './use';

/** A parsed piece, compiled: the phases are in compiler/ (index.ts says their order). */
function compile(parsed: ParseResult, env: Env = DEFAULT_ENV, used?: ReadonlySet<string>): CompileResult {
  // a style a voice reads by axis (decision 063, styles.ts): its picks read first, then a cell for each
  const slotted = readSlots(parsed);
  const held = readStyles(slotted, null);
  const first = compileIn(held.parsed, env, used);
  if (!held.glides) return first;
  // (a range of styles glides over the piece: compiled with its start held, the piece's length read, compiled again)
  const scope = scopeOf(first);
  return scope ? compileIn(readStyles(slotted, scope).parsed, env, used) : first;
}

/** The piece's length (`mainLength`), in bars of its meter where it has one, else in seconds; null where it has none. */
function scopeOf(result: CompileResult): Scope | null {
  const seconds = result.ok ? mainLength(pieceTime(result)) : null;
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const meter = result.mainMeter;
  if (!meter || !result.clocks.has(meter)) return { seconds };
  // (a bar is the meter's own steps: meter("5/4") five of them)
  const perBar = result.cells.get(meter)?.units.length ?? 0;
  if (!perBar) return { seconds };
  const bars = clocking(result, codeShifts(result)).map(meter).stepAt(seconds) / perBar;
  return Math.abs(bars - Math.round(bars)) < 1e-6 && Math.round(bars) > 0 ? { bars: Math.round(bars) } : { seconds };
}

/**
 * A piece's text, compiled. Its `use` lines (decision 054) are read through `options.resolve`, and its lockfile's hashes
 * (`options.locked`): what compiles is the expansion (`use.ts`), and what a used line says is said on the `use` line it
 * came through.
 */
export function compileSource(source: string, env: Env = DEFAULT_ENV, options: CompileOptions = {}): CompileResult {
  if (!hasUse(source)) return compile(parse(source), env);
  const x = expansion(source, options);
  const result = compile(parse(x.text), env, x.given);
  const diagnostics = [...x.diagnostics, ...result.diagnostics.map((d) => ({ ...d, span: x.through(d.span.line) ?? d.span }))].sort(
    (a, b) => a.span.line - b.span.line || a.span.col - b.span.col,
  );
  return { ...result, ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics, uses: x.uses };
}
