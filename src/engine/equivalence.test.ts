/**
 * Spellings the language promises are equal play the same notes (#142, #10 items 4 and 5): `map=edo` is
 * `map=ed(2)` (decision 003), `scale(tonic, phase)` is two unnamed cells (decision 002), and Shorten,
 * run to the end, has nothing left to say the second time.
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { shortenAll } from './shorten';
import { SAMENESS_SECONDS } from './shorten/harness';
import { PRESETS } from './presets';

const sounds = (src: string, seconds = SAMENESS_SECONDS) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, seconds);
};
const examples = Object.entries(PRESETS);

describe('map=edo is map=ed(2)', () => {
  it.each([12, 19, 31])('%i to the octave', (n) => {
    const piece = (map: string) => `&g cycle=${n} map=${map}\n&t over=&g step=8 0 1 2 5 ${n - 1} ${n} ${n + 3} -2\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`;
    expect(sounds(piece('ed(2)'))).toEqual(sounds(piece('edo')));
  });
  // every example on the default grid, the grid written out as ed(2) (appended, so no line moves)
  const onRoot = examples.filter(([, p]) => !/^&fifths12TET\b/m.test(p.source));
  it.each(onRoot)('%s, its grid written out', (_, { source }) => {
    expect(sounds(`${source}\n&fifths12TET cycle=12 map=ed(2)`)).toEqual(sounds(source));
  });
});

describe('scale(tonic, phase) is a key and a mode written out', () => {
  // the seven modes by brightness (decision 002: phase 0 darkest … 6 brightest), written by hand
  const MODES = ['1 2 2 1 2 2 2', '1 2 2 2 1 2 2', '2 1 2 2 1 2 2', '2 1 2 2 2 1 2', '2 2 1 2 2 1 2', '2 2 1 2 2 2 1', '2 2 2 1 2 2 1'];
  const writtenOut = (source: string) => {
    const tables = new Map<string, string>();
    const body = source.replace(/over=scale\((-?\d+),\s*(\d+)\)/g, (_, tonic: string, phase: string) => {
      const name = `sc${tonic.replace('-', 'm')}x${phase}`;
      tables.set(name, `&key${name} shift=${tonic}\n&${name} over=&key${name} scan(${MODES[+phase]})`);
      return `over=&${name}`;
    });
    return `${body}\n${[...tables.values()].join('\n')}`;
  };
  it.each([
    [0, 5],
    [0, 2],
    [2, 3],
    [7, 5],
    [-3, 0],
    [5, 6],
  ])('scale(%i,%i)', (tonic, phase) => {
    const src = `&t over=scale(${tonic},${phase}) step=8 0 1 2 3 4 5 6 7 -1 9\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`;
    expect(sounds(writtenOut(src))).toEqual(sounds(src));
  });
  const scaled = examples.filter(([, p]) => /over=scale\(/.test(p.source));
  it('the examples that use it', () => expect(scaled.length).toBeGreaterThan(0));
  it.each(scaled)('%s', (_, { source }) => {
    expect(sounds(writtenOut(source))).toEqual(sounds(source));
  });
});

describe('Shorten is idempotent', () => {
  // BWV 847 is left out for time: Shorten takes about 5 s on it, twice here (its generator already applies it, #82)
  it.each(examples.filter(([key]) => key !== 'bwv847'))('%s', (_, { source }) => {
    const once = shortenAll(source).source;
    expect(shortenAll(once).source).toBe(once);
  });
});
