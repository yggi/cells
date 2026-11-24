/**
 * `metric_accent`, the first built-in braid fill (#799): a bar's levels from its meter's grades (#906). Pure, and its
 * answer for any arguments it takes compiles clean: 500 seeded cases over every meter it weighs (#799's bound, named here).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { METRIC_ACCENT, meterGrades, metricWeights } from './accent';
import { compileSource } from './compile';
import { expand } from './use';
import { resolveSeed } from '../repository/library';

const DEFAULTS = { steps: '0', density: '1', sync: '0', peak: '.8', floor: '.2', meter: '4/4' };
const answer = (args: Partial<typeof DEFAULTS>) => METRIC_ACCENT.fill('accent', 0, { ...DEFAULTS, ...args }, 64);

/** The family's meter contract, version 2 (yggi/music-commons `contracts/meter`): its groupings' grades, a sixteenth a step. */
const CONTRACT = JSON.parse(readFileSync(new URL('../../fixtures/contracts/meter.json', import.meta.url), 'utf8')) as {
  readonly names: Readonly<Record<string, readonly number[]>>;
  readonly vectors: readonly { readonly groups: readonly number[]; readonly grades: string }[];
};

describe('metric_accent (#799, #906)', () => {
  it('weighs 4/4 in sixteenths as it always did: one, three, two and four, the eighths, the sixteenths', () => {
    expect(metricWeights('4/4')).toEqual([1, 0.2, 0.4, 0.2, 0.6, 0.2, 0.4, 0.2, 0.8, 0.2, 0.4, 0.2, 0.6, 0.2, 0.4, 0.2]);
  });

  it('weighs a bar by its meter, not its count of steps: 3/4 stresses its beats, 6/8 its dotted quarters', () => {
    const w34 = metricWeights('3/4')!;
    // (3/4's two beats after one, steps 4 and 8, weigh more than step 6, where 6/8 puts its second beat)
    expect(w34[4]).toBeGreaterThan(w34[6]!);
    expect(w34[8]).toBeGreaterThan(w34[6]!);
    const w68 = metricWeights('6/8')!;
    expect(w68[6]).toBeGreaterThan(w68[4]!);
    expect(w68[3]).toBe(0.2);
    // (7/8 as 3+2+2: its groups on the sixth and tenth sixteenths)
    expect(meterGrades('7/8')).toBe('*,.,.,+,.,+,.,');
  });

  it('has the contract’s grades for every grouping of two groups or more and every name, and none refuses', () => {
    let n = 0;
    for (const v of CONTRACT.vectors) {
      if (v.groups.length < 2) continue;
      expect(meterGrades(v.groups.join('+')), v.groups.join('+')).toBe(v.grades);
      n++;
    }
    for (const [name, groups] of Object.entries(CONTRACT.names)) {
      const v = CONTRACT.vectors.find((x) => x.groups.join('+') === groups.join('+'))!;
      expect(meterGrades(name), name).not.toBeNull();
      expect(metricWeights(name)!.length, name).toBe(v.grades.length * (meterGrades(name)!.length / v.grades.length));
    }
    expect(n).toBeGreaterThan(100);
    for (const sig of ['5/4', '5/8', '7/8', '10/8', '9/8', '12/8', '2/2', '6/4']) expect(answer({ meter: sig }), sig).toEqual(expect.any(String));
  });

  it('reads a meter cell as its levels, a number a step, the piece’s own meter: the same as its signature', () => {
    for (const [sig, levels] of [
      ['7/8', '0 3 3 1 3 1 3'],
      ['4/4', '0 2 1 2'],
      ['3/4', '0 1 1'],
    ] as const)
      expect(meterGrades(levels), sig).toBe(meterGrades(sig));
    const text = (bar: string, arg: string) => `&bar meter("${bar}") step=120bpm\n&a from metric_accent(meter=${arg})`;
    expect(expand(text('7/8', '&bar'), resolveSeed)).toBe(expand(text('7/8', '7/8'), resolveSeed));
  });

  it('answers its fragment’s defaults as its page says, through a from line', () => {
    expect(answer({})).toBe('0.8 0.32 0.44 0.32 0.56 0.32 0.44 0.32 0.68 0.32 0.44 0.32 0.56 0.32 0.44 0.32');
    expect(expand('&a from metric_accent', resolveSeed)).toBe(`\n&a map=amp step=16n ${answer({})}`);
  });

  it('density keeps the strongest steps; sync lends a step the weight of the one after it', () => {
    expect(answer({ density: '0' })).toBe(['0.8', ...Array<string>(15).fill('0')].join(' '));
    // (the sixteenth before each beat, an anticipation, plays where the other sixteenths don't)
    const leaned = answer({ density: '.75', sync: '.2' }) as string;
    expect(leaned.split(' ').map((x) => x !== '0')).toEqual([true, false, true, true, true, false, true, true, true, false, true, true, true, false, true, true]);
  });

  it('refuses what it can’t answer: past its fuel, a meter it can’t weigh, a value out of range', () => {
    expect(METRIC_ACCENT.fill('accent', 0, { ...DEFAULTS, meter: '12/4' }, 32)).toEqual({ refused: '48 steps need more than its fuel, 32' });
    expect(answer({ meter: 'seven' })).toEqual({
      refused: 'meter=seven is no meter it can weigh at a sixteenth a step: a signature (7/8), sizes (2+2+3) or a meter cell (&bar), its steps a whole number a pulse',
    });
    expect(answer({ meter: '3/4', steps: '10' })).toEqual(expect.objectContaining({ refused: expect.stringMatching(/^meter=3\/4 is no meter it can weigh at 10 steps/) }));
    expect(answer({ density: '1.5' })).toEqual({ refused: 'density=1.5 is out of 0 to 1' });
  });

  it('any arguments it takes answer a line that compiles clean, the same each time (500 cases)', () => {
    let seed = 799;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const meters = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '10/8', '12/8', '2/2', '6/4', '2+2+3', '3+3+2', '0 2 1 2', '0 3 3 1 3 1 3'];
    for (let k = 0; k < 500; k++) {
      const args = {
        steps: '0',
        meter: meters[Math.floor(next() * meters.length)]!,
        density: next().toFixed(2),
        sync: next().toFixed(2),
        peak: next().toFixed(2),
        floor: next().toFixed(2),
      };
      const text = METRIC_ACCENT.fill('accent', 0, args, 64);
      expect(typeof text, JSON.stringify(args)).toBe('string');
      expect(METRIC_ACCENT.fill('accent', 0, args, 64)).toBe(text);
      const r = compileSource(`&a map=amp step=1 ${text as string}\n&v s=sine loop=C4\n&out map=sample [&v * &a]`);
      expect(
        r.diagnostics.filter((d) => d.severity === 'error'),
        JSON.stringify(args),
      ).toEqual([]);
    }
  });
});
