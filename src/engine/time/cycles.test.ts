// The meter finder's steps on onsets written by hand (#648): notes struck together are one event, the tatum is the
// coarsest grid that holds them (a swung pair's where its pairs lean), and the bar falls where the low notes do.
// The finder over whole pieces is measured by tools/cycles.ts, its benches held by tools/cycles.test.ts.
import { describe, expect, it } from 'vitest';
import { events, findMeter, gridOf, meterText, type Onset } from './cycles';

/** Bars of a pattern: each pulse a hat, a kick (low) where `kick` says, at `pulse` seconds, its pairs' seconds at `share`. */
function pattern(bars: number, kick: readonly boolean[], pulse: number, share = 0.5): Onset[] {
  const out: Onset[] = [];
  const n = kick.length;
  for (let b = 0; b < bars; b++)
    for (let k = 0; k < n; k++) {
      const pair = Math.floor((b * n + k) / 2);
      const at = 2 * pulse * pair + ((b * n + k) % 2 ? 2 * pulse * share : 0);
      out.push({ at, weight: 0.3, pitch: 70 });
      if (kick[k]) out.push({ at: at + 0.001, weight: 1, pitch: 36 });
    }
  return out;
}

describe('the meter finder’s steps', () => {
  it('notes struck within 20 ms are one event, its accent their weights, its low the accent of its lowest notes', () => {
    const es = events([
      { at: 0, weight: 1, pitch: 36 },
      { at: 0.01, weight: 0.5, pitch: 72 },
      { at: 0.5, weight: 0.5, pitch: 72 },
      { at: 1, weight: 0.5, pitch: 74 },
    ]);
    expect(es.map((e) => e.at)).toEqual([0, 0.5, 1]);
    expect(es[0]!.accent).toBeCloseTo(1.5);
    expect(es[0]!.low).toBeCloseTo(1);
    expect(es[1]!.low).toBe(0);
  });

  it('the tatum: the coarsest grid holding every event, straight; a swung pair’s where its pairs lean', () => {
    const straight = gridOf(events(pattern(8, [true, false, false, false, true, false, false, false], 0.25)))!;
    expect(straight.pulse).toBeCloseTo(0.25, 6);
    expect(straight.share).toBe(0.5);
    const swung = gridOf(events(pattern(8, [true, false, false, false, true, false, false, false], 0.25, 2 / 3)))!;
    expect(swung.pulse).toBeCloseTo(0.25, 6);
    expect(swung.share).toBeCloseTo(2 / 3, 3);
  });

  it('a bar of eight eighths, its kick on one, four beats; and the line it writes', () => {
    const f = findMeter(pattern(12, [true, false, false, false, false, false, false, false], 0.25, 0.6))!;
    expect(f.signature).toBe('4/4');
    expect(f.bpm).toBeCloseTo(120, 6);
    expect(f.start).toBeCloseTo(0, 6);
    expect(f.swing).toEqual([{ level: '8n', share: expect.closeTo(0.6, 3) }]);
    expect(meterText(f)).toBe('&bar from meter(swing=8n:.6) &tempo\n&tempo step=120bpm');
  });

  it('nothing to say of fewer than eight events', () => {
    expect(findMeter([{ at: 0 }, { at: 0.5 }, { at: 1 }])).toBeNull();
  });
});
