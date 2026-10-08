/**
 * Shorten: read the code like a linter, find what's written out longhand, and
 * offer it shorter — the measure is the code's length, the promise that it
 * sounds the same. One rule a file:
 *
 *  - runs.ts:      0 0 0 0 → 0!4
 *  - phrases.ts:   a phrase written twice or more becomes a cell of its own, used where it was
 *  - fractions.ts: every step's length shares a factor — divide it out, slow the clock
 *  - same.ts:      two cells written exactly alike — one, used by both names' users
 *  - defaults.ts:  an attribute that says what would be so anyway (loop=SAMPLE_RATE, cycle= its length, pan=.5)
 *  - progressions.ts: a transposing loop=&x*N with the bars multiplied out — step=&x*(N/k)
 *  - stereo.ts:    a sound card's two chords that differ only in gains — one chord, and pan= on each voice
 *  - wrappers.ts:  a cell that only reads motifs through a shifted table — &motif^k where it's used
 *
 * Each suggestion carries its rewrite; its saving is measured on the result
 * (harness.ts: the cells a rule may touch, the measure, the note-for-note check).
 */
import { candidates, size, type Suggestion } from './harness';
import { runs } from './runs';
import { phrases } from './phrases';
import { fractions } from './fractions';
import { sameCells } from './same';
import { defaults } from './defaults';
import { progressions } from './progressions';
import { wrappers } from './wrappers';
import { stereo } from './stereo';

export type { Suggestion } from './harness';

/** Everything that could be written shorter, the largest saving first. */
export function shorten(source: string): Suggestion[] {
  const { result, cells } = candidates(source);
  if (!result.ok) return [];
  return [
    ...runs(source, cells),
    ...phrases(source, cells, result),
    ...fractions(source, cells, result),
    ...sameCells(source, result),
    ...defaults(source, result),
    ...progressions(source, result),
    ...wrappers(source, result),
    ...stereo(source, result),
  ].sort((a, b) => b.saving - a.saving);
}

/** Shorten again and again — the best each time — until nothing more pays. */
export function shortenAll(source: string, rounds = 60): { source: string; steps: string[] } {
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const best = shorten(now)[0];
    if (!best) break;
    const next = best.apply(now);
    if (size(next) >= size(now)) break;
    steps.push(`−${best.saving}: ${best.title}`);
    now = next;
  }
  return { source: now, steps };
}
