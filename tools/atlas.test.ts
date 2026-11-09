import { describe, expect, it } from 'vitest';
import { ATLAS, CONFUSED, distance, measure, OPTIONS, report, type Genre } from './atlas';
import { BRIGHTNESS } from '../src/engine/style';

describe('the atlas of genres (#572, #542)', () => {
  it('places each genre once, every feature within 0 to 1 and its mode one BRIGHTNESS names', () => {
    expect(new Set(ATLAS.map((x) => x.name)).size).toBe(ATLAS.length);
    for (const x of ATLAS) {
      for (const v of [x.sync, x.harm, x.attack, x.density, x.tension]) expect(v >= 0 && v <= 1, x.name).toBe(true);
      expect(BRIGHTNESS[x.mode], x.name).toBeDefined();
    }
  });

  it('measures each option: a gap, the pairs it confuses, a corner each of the 16', () => {
    for (const o of OPTIONS) {
      const m = measure(o);
      expect(m.corners).toHaveLength(16);
      expect(m.leastGap).toBeLessThanOrEqual(m.medianGap);
      for (const p of m.confused) expect(p.distance).toBeLessThan(CONFUSED);
    }
    expect(report()).toContain('### The options over');
  });

  it('is shown telling: two genres alike but for their density merge under bite, and stay apart under the old axes', () => {
    const a: Genre = { name: 'a', family: 'x', sync: 0.3, harm: 0.9, attack: 0.2, density: 0.2, mode: 'ionian', tension: 0.1 };
    const b: Genre = { ...a, name: 'b', density: 0.9 };
    const pair = (name: string) =>
      measure(
        OPTIONS.find((o) => o.name === name)!,
        [a, b],
      ).confused.length;
    expect(pair('bite+mood')).toBe(1);
    expect(pair('v0.21')).toBe(0);
    expect(distance([0, 0], [1, 1])).toBe(1);
  });
});
