// A bounded recogniser over a run of hours (#277): the recognitions of a 3-hour E45 walk (yggi/jambot's
// `experiments/homeostat.ts`, `regulatedRun`, walked by the radio with the controller closed, every member against its
// library and what it played lately), replayed on one recogniser at the default capacity. It keeps never more than 512
// texts, finds what the unbounded recogniser found on every call, and recognises the walk's first ten minutes at hour 3
// within 1.25 times a fresh recogniser's p95. Unbounded, the same run kept 6,199 texts and 1.36 GB of heap, and a bar's
// p95 grew from 12.9 ms over its first 300 bars to 17.3 ms over its last (2026-10-27, four cores).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Fragment } from './fragments';
import { createRecogniser, RECOGNISER_CAPACITY, type Recogniser, type RecogniseOptions } from './recognise';

/** The fixture as `recognise.test.ts` reads it: each call's bar, heard text, options, library and what was found, as indices. */
interface E45 {
  readonly bars: number;
  readonly seconds: readonly number[];
  readonly options: readonly RecogniseOptions[];
  readonly texts: readonly string[];
  readonly calls: readonly (readonly [bar: number, text: number, options: number, library: readonly number[], found: readonly number[]])[];
}
const e45 = JSON.parse(gunzipSync(readFileSync('fixtures/jambot-e45.json.gz')).toString('utf8')) as E45;
type Call = E45['calls'][number];

const byBar: Call[][] = Array.from({ length: e45.bars }, () => []);
for (const c of e45.calls) byBar[c[0]]!.push(c);

/** What a recogniser finds on a call, as indices into its library. */
function heard(recogniser: Recogniser, [, text, options, library]: Call): number[] {
  const fragments: Fragment[] = library.map((i) => ({ id: String(i), text: e45.texts[i]!, association: [] }));
  return recogniser.recognise(e45.texts[text]!, fragments, e45.options[options]).map((r) => fragments.indexOf(r.fragment));
}

/** A bar's recognitions, every member's, in ms. */
function timed(recogniser: Recogniser, bar: readonly Call[]): number {
  const t0 = performance.now();
  for (const c of bar) heard(recogniser, c);
  return performance.now() - t0;
}

/** Each option's first library read once, as yggi/jambot's `warmedRecogniser` warms on the seeds. */
function warm(recogniser: Recogniser) {
  const seen = new Set<number>();
  for (const [, , options, library] of e45.calls) {
    if (seen.has(options)) continue;
    seen.add(options);
    for (const i of library) heard(recogniser, [0, i, options, library, []]);
  }
}

const p95 = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)[Math.floor(0.95 * xs.length)]!;

describe('a bounded recogniser over a 3-hour run (#277)', () => {
  it('keeps at most 512 texts, finds what the unbounded one found, and costs the same at hour 3 as fresh', () => {
    expect(e45.seconds.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3 * 3600);
    const recogniser = createRecogniser();
    warm(recogniser);
    let most = 0;
    const differ: string[] = [];
    for (const c of e45.calls) {
      if (JSON.stringify(heard(recogniser, c)) !== JSON.stringify(c[4])) differ.push(`bar ${c[0]}: ${e45.texts[c[1]]!.split('\n')[0]!}`);
      most = Math.max(most, recogniser.size);
    }
    expect(differ).toEqual([]);
    expect(most).toBe(RECOGNISER_CAPACITY);

    // (the walk's first ten minutes again, at hour 3 and on a fresh recogniser warmed alike, bar by bar in turn, so the
    // machine's load falls on both)
    const fresh = createRecogniser();
    warm(fresh);
    let bars = 0;
    for (let s = 0; s < 600; bars++) s += e45.seconds[bars]!;
    const atHour3: number[] = [];
    const atStart: number[] = [];
    for (const bar of byBar.slice(0, bars)) {
      atStart.push(timed(fresh, bar));
      atHour3.push(timed(recogniser, bar));
    }
    expect(p95(atHour3)).toBeLessThan(1.25 * p95(atStart));
  });
});
