// The wander module takes a seed as a jack (#930, decision 105): two copies draw apart, the default is what it drew before.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { styleAt } from '../engine/styleat';
import { resolveSeed } from './library';

const lines = (...xs: string[]) => xs.join('\n');
const BAR_SECONDS = (4 * 60) / 104;
/** A piece whose bite is a wander of the given arguments, its mood another's (or none). */
const piece = (drifts: Record<string, string>, axes = 'bite=.5 ± .35 * &da') =>
  lines(
    '&bar meter("4/4") step=104bpm',
    '&section step=1m/8 0',
    ...Object.entries(drifts).map(([name, args]) => `&${name} from wander(${args})`),
    `&mine map=style sync=.5 harm=.5 ${axes} mood=.5`,
    '&style style=&mine',
  );
const series = (text: string, bars: readonly number[]) => bars.map((b) => styleAt(text, b * BAR_SECONDS + 0.01, { resolve: resolveSeed })![2]!);
const BARS = [0, 5, 16, 40, 64, 150, 400, 900, 1500, 3000];

describe('wander takes a seed', () => {
  it('compiles clean, the six noises’ seeds derived from the jack: &seed * 8 + 1 to + 6', () => {
    for (const seed of [0, 1, 7]) {
      const r = compileSource(piece({ da: `clock=&section, seed=&sa` }).replace('&style style', `&sa ${seed}\n&style style`), undefined, { resolve: resolveSeed });
      expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
      expect([0, 1, 2, 3, 4, 5].map((k) => r.cells.get(`da_o${k}`)!.seed)).toEqual([1, 2, 3, 4, 5, 6].map((k) => seed * 8 + k));
    }
  });

  it('draws what it drew before it took a seed, with none given: 0 moves', () => {
    // (the module as it was written, its seeds 1 to 6 literal)
    const flat = lines(
      '&bar meter("4/4") step=104bpm',
      '&section step=1m/8 0',
      '&o0 map=lin seed=1 step=&section [0|.25|.5|.75|1]!256',
      '&o1 map=lin seed=2 step=&section/2 [0|.25|.5|.75|1]!256',
      '&o2 map=lin seed=3 step=&section/4 [0|.25|.5|.75|1]!256',
      '&o3 map=lin seed=4 step=&section/8 [0|.25|.5|.75|1]!256',
      '&o4 map=lin seed=5 step=&section/16 [0|.25|.5|.75|1]!256',
      '&o5 map=lin seed=6 step=&section/32 [0|.25|.5|.75|1]!256',
      '&da [&o0 * .015873 + &o1 * .031746 + &o2 * .063492 + &o3 * .126984 + &o4 * .253968 + &o5 * .507937]',
      '&mine map=style sync=.5 harm=.5 bite=.5 ± .35 * &da mood=.5',
      '&style style=&mine',
    );
    expect(series(piece({ da: 'clock=&section' }), BARS)).toEqual(series(flat, BARS));
    expect(series(piece({ da: 'clock=&section, seed=&sa' }).replace('&style style', '&sa 0\n&style style'), BARS)).toEqual(series(flat, BARS));
  });

  it('two copies with seeds 0 and 1 draw apart, with the same seed alike; their seeds share none', () => {
    const two = (a: number, b: number) =>
      lines(piece({ da: 'clock=&section, seed=&sa', db: 'clock=&section, seed=&sb' }, 'bite=.5 ± .35 * &da').replace('mood=.5', 'mood=.5 ± .35 * &db'), `&sa ${a}`, `&sb ${b}`);
    const apart = two(0, 1);
    const r = compileSource(apart, undefined, { resolve: resolveSeed });
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    const seeds = (copy: string) => new Set([0, 1, 2, 3, 4, 5].map((k) => r.cells.get(`${copy}_o${k}`)!.seed));
    expect([...seeds('da')].filter((s) => seeds('db').has(s))).toEqual([]);
    const at = (text: string, axis: number) => BARS.map((b) => styleAt(text, b * BAR_SECONDS + 0.01, { resolve: resolveSeed })![axis]!);
    expect(at(apart, 2)).not.toEqual(at(apart, 3));
    const alike = two(2, 2);
    expect(at(alike, 2)).toEqual(at(alike, 3));
  });
});
