/**
 * Sameness: do two spellings play the same? The promise every tool that rewrites a piece keeps (decision 048): Migrate,
 * Normalise and Shorten check a rewrite against it before they offer or apply it, and the tests of equal spellings
 * compare by it. Lifted out of `shorten/harness.ts` (#155). Pure.
 */
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { flatten } from './flatten';

type Result = ReturnType<typeof compileSource>;

/** Do these cells play the same notes (value, place, length) in both programs? */
export function sameNotes(a: string, b: string, names: readonly string[]): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!rb.ok) return false;
    const notes = (r: Result, n: string) =>
      flatten(r, n, codeShifts(r))
        .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
        .join(' ');
    return names.every((n) => notes(ra, n) === notes(rb, n));
  } catch {
    return false;
  }
}

/**
 * How many seconds two spellings are compared over: the tools' check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export const SAMENESS_SECONDS = 60;

/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export function samePiece(a: string, b: string, until = SAMENESS_SECONDS): boolean {
  try {
    const play = (src: string) => {
      const r = compileSource(src);
      if (!r.ok) return null;
      return eventsBetween(plan(r, codeShifts(r)), 0, until)
        .map(
          (e) =>
            `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`,
        )
        .sort()
        .join('\n');
    };
    const x = play(a);
    return x !== null && x === play(b);
  } catch {
    return false;
  }
}
