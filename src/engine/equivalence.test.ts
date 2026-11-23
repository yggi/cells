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
import { SAMENESS_SECONDS } from './sameness';
import { EXAMPLES } from './examples';
import { resolveSeed } from '../repository/library';

const sounds = (src: string, seconds = SAMENESS_SECONDS) => {
  const r = compileSource(src, undefined, { resolve: resolveSeed });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, seconds);
};
const examples = Object.entries(EXAMPLES);

describe('map=edo(n) is map=ed(n, 2)', () => {
  it.each([12, 19, 31])('%i to the octave', (n) => {
    const piece = (map: string) => `&g map=${map}\n&t over=&g step=8 0 1 2 5 ${n - 1} ${n} ${n + 3} -2\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`;
    expect(sounds(piece(`ed(${n}, 2)`))).toEqual(sounds(piece(`edo(${n})`)));
  });
  // every example on the default grid, the grid written out as ed(2) (appended, so no line moves)
  const onRoot = examples.filter(([, p]) => !/^&fifths12TET\b/m.test(p.source));
  it.each(onRoot)('%s, its grid written out', (_, { source }) => {
    expect(sounds(`${source}\n&fifths12TET map=ed(12, 2)`)).toEqual(sounds(source));
  });
});

describe('scale(mode, tonic) is a key and a mode written out', () => {
  // the seven modes by brightness (decision 002: phase 0 darkest … 6 brightest), written by hand
  const MODES = ['1 2 2 1 2 2 2', '1 2 2 2 1 2 2', '2 1 2 2 1 2 2', '2 1 2 2 2 1 2', '2 2 1 2 2 1 2', '2 2 1 2 2 2 1', '2 2 2 1 2 2 1'];
  const PHASE: Record<string, number> = { locrian: 0, phrygian: 1, minor: 2, aeolian: 2, dorian: 3, mixolydian: 4, major: 5, ionian: 5, lydian: 6 };
  const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const tonicOf = (t: string) => (/^-?\d+$/.test(t) ? +t : LETTER[t[0]!]! + (t[1] === '#' ? 1 : t[1] === 'b' ? -1 : 0));
  const writtenOut = (source: string) => {
    const tables = new Map<string, string>();
    const body = source.replace(/over=scale\((\w+),\s*(-?\w+#?b?)\)/g, (all, mode: string, tonic: string) => {
      if (!(mode in PHASE)) return all;
      const shift = tonicOf(tonic);
      const name = `sc${mode}x${String(shift).replace('-', 'm')}`;
      tables.set(name, `&key${name} shift=${shift}\n&${name} over=&key${name} scan(${MODES[PHASE[mode]!]})`);
      return `over=&${name}`;
    });
    return `${body}\n${[...tables.values()].join('\n')}`;
  };
  it.each([
    ['major', 'C'],
    ['minor', 'C'],
    ['dorian', 'D'],
    ['major', 'G'],
    ['locrian', 'Ab'],
    ['lydian', 'F'],
  ])('scale(%s, %s)', (mode, tonic) => {
    const src = `&t over=scale(${mode}, ${tonic}) step=8 0 1 2 3 4 5 6 7 -1 9\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`;
    expect(sounds(writtenOut(src))).toEqual(sounds(src));
  });
  const scaled = examples.filter(([, p]) => /over=scale\(\w+,/.test(p.source));
  it('the examples that use it', () => expect(scaled.length).toBeGreaterThan(0));
  it.each(scaled)('%s', (_, { source }) => {
    expect(sounds(writtenOut(source))).toEqual(sounds(source));
  });
});

describe('Shorten is idempotent', () => {
  // BWV 847 is left out for time: Shorten takes about 5 s on it, twice here (its generator already applies it, #82)
  it.each(examples.filter(([key]) => key !== 'bwv847'))('%s', (_, { source }) => {
    const once = shortenAll(source, undefined, { resolve: resolveSeed }).source;
    expect(shortenAll(once, undefined, { resolve: resolveSeed }).source).toBe(once);
  });
});
