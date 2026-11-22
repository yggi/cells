/**
 * `metric_accent`, the first built-in braid fill (#799): a bar's levels from its metric weights. Pure, and its answer for
 * any arguments it takes compiles clean: 500 seeded cases over every bar it splits (#799's bound, named here).
 */
import { describe, expect, it } from 'vitest';
import { METRIC_ACCENT, metricWeights } from './accent';
import { compileSource } from './compile';
import { expand } from './use';
import { resolveSeed } from '../repository/library';

const DEFAULTS = { steps: '16', density: '1', sync: '0', peak: '.8', floor: '.2' };
const answer = (args: Partial<typeof DEFAULTS>) => METRIC_ACCENT.fill('accent', 0, { ...DEFAULTS, ...args }, 64);

describe('metric_accent (#799)', () => {
  it('weighs a bar by where each step starts in it', () => {
    expect(metricWeights(16)).toEqual([1, 0.2, 0.4, 0.2, 0.6, 0.2, 0.4, 0.2, 0.8, 0.2, 0.4, 0.2, 0.6, 0.2, 0.4, 0.2]);
    // (12: four beats of three, 2 · 2 · 3)
    expect(metricWeights(12)).toEqual([1, 0.25, 0.25, 0.5, 0.25, 0.25, 0.75, 0.25, 0.25, 0.5, 0.25, 0.25]);
    expect(metricWeights(10)).toBeNull();
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

  it('refuses what it can’t answer: past its fuel, a bar of fives, a value out of range', () => {
    expect(METRIC_ACCENT.fill('accent', 0, { ...DEFAULTS, steps: '96' }, 64)).toEqual({ refused: '96 steps need more than its fuel, 64' });
    expect(answer({ steps: '10' })).toEqual({ refused: 'a bar of 10 steps splits into neither twos nor threes' });
    expect(answer({ density: '1.5' })).toEqual({ refused: 'density=1.5 is out of 0 to 1' });
  });

  it('any arguments it takes answer a line that compiles clean, the same each time (500 cases)', () => {
    let seed = 799;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const bars = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
    for (let k = 0; k < 500; k++) {
      const args = {
        steps: String(bars[Math.floor(next() * bars.length)]),
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
