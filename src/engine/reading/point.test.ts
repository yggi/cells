import { describe, expect, it } from 'vitest';
import { moodOf } from '../style';
import { BITE_FULL, readPoint, SYNC_FULL } from './point';
import type { Part } from './style';

const note = (part: Part, step: number, length = 1, midi = 60) => ({ part, step, length, note: midi });
const range = (n: number) => [...Array(n).keys()];
/** A groove's bar: a kick on the beats, hats on every sixteenth. */
const groove = () => [...[0, 4, 8, 12].map((s) => note('drums', s, 1, 36)), ...range(16).map((s) => note('drums', s, 1, 42))];
/** A pad's bar: one chord held, C E G, or the chord given. */
const pad = (chord = [60, 64, 67], step = 0, length = 16) => chord.map((m) => note('pad', step, length, m));

describe('a span of bars read as a point', () => {
  it('reads a drum part on sync alone: no harm, no mood, no bite (the issue’s bound: a drum-only reading has no harm)', () => {
    const read = readPoint(range(4).map(groove));
    expect(Object.keys(read.point)).toEqual(['sync']);
    expect(read.confidence.sync).toBe(1);
  });

  it('trusts a pad’s sync at most 0.2: a chord or two a bar says little of where accents fall (the issue’s bound, its threshold named)', () => {
    for (const bar of [pad(), [...pad([60, 64, 67], 0, 8), ...pad([65, 69, 72], 8, 8)]]) {
      const read = readPoint([bar, bar]);
      expect(read.point.sync).toBe(0);
      expect(read.confidence.sync!).toBeLessThanOrEqual(0.2);
    }
    expect(SYNC_FULL).toBe(1);
  });

  it('reads harm from a pad’s chords, a change across the bar line counted: I–IV a bar each moves', () => {
    const still = readPoint([pad(), pad()]);
    const moving = readPoint([pad(), pad([65, 69, 72])]);
    expect(still.point.harm).toBe(0);
    expect(moving.point.harm).toBeGreaterThan(0);
    expect(moving.confidence.harm).toBe(1);
  });

  it('reads bite from the bass and the lead, trusted fully at BITE_FULL notes a bar', () => {
    const stabs = range(BITE_FULL).map((i) => note('bass', i * 4, 1, 36));
    const read = readPoint([stabs]);
    expect(read.point.bite).toBeCloseTo(0.75, 12);
    expect(read.confidence.bite).toBe(1);
    expect(readPoint([stabs.slice(0, 2)]).confidence.bite).toBe(2 / BITE_FULL);
  });

  it('reads mood from all the span’s notes together, and names the mode it read it from', () => {
    const scale = [0, 2, 3, 5, 7, 8, 10].map((d, i) => note('lead', i * 2, 2, 69 + d));
    const read = readPoint([
      [...scale.slice(0, 4), note('bass', 0, 16, 45)],
      [...scale.slice(4), note('bass', 0, 16, 45)],
    ]);
    expect(read.point.mood).toBe(moodOf('aeolian'));
    expect(read.mode).toEqual({ mode: 'aeolian', tonic: 9 });
    expect(read.confidence.mood).toBe(1);
  });

  it('keeps density out of the point, as the span’s intensity', () => {
    const read = readPoint([groove(), []]);
    // (the kick and the hats are one part, the drums: an onset on each of the 16 steps, then a silent bar)
    expect(read.intensity).toBe((16 / 16 + 0) / 2);
    expect(Object.keys(read.point)).not.toContain('density');
  });

  it('reads nothing from silence', () => {
    expect(readPoint([[], []])).toEqual({ point: {}, confidence: {}, intensity: 0 });
  });
});
