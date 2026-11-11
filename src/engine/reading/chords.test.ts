// Lifted from yggi/jambot packages/engine/src/chord-reading.test.ts @ a34d13c6.
import { describe, expect, it } from 'vitest';
import { readChords, readHarm } from './chords';
import type { Sounding } from './style';

const at = (part: Sounding['part'], step: number, notes: number[]) => notes.map((note) => ({ part, step, note, length: 1 }));
const range = (n: number) => [...Array(n).keys()];

describe('reading chords from notes', () => {
  it('reads the chord a pad holds in each half of the bar, by root and quality', () => {
    const bar = [...at('pad', 0, [60, 64, 67]), ...at('pad', 8, [57, 60, 64])];
    expect(readChords(bar)).toEqual([
      { root: 0, quality: 'major' },
      { root: 9, quality: 'minor' },
    ]);
  });

  it('reads a chord from any inversion and octave', () => {
    const inversions = [
      [64, 67, 72],
      [67, 72, 76],
      [48, 64, 79],
    ];
    for (const notes of inversions)
      expect(readChords(at('pad', 0, notes))[0], notes.join()).toEqual({
        root: 0,
        quality: 'major',
      });
  });

  it('takes the bass to settle a chord the notes leave open: C6 and Am7 are the same four notes', () => {
    const notes = at('pad', 0, [60, 64, 67, 69]);
    expect(readChords([...notes, ...at('bass', 0, [36])])[0]).toEqual({ root: 0, quality: '6' });
    expect(readChords([...notes, ...at('bass', 0, [45])])[0]).toEqual({ root: 9, quality: 'm7' });
  });

  it('reads a ninth that drops its fifth, as the comp voices it', () => {
    expect(readChords(at('pad', 0, [67, 71, 77, 81]))[0]).toEqual({
      root: 7,
      quality: '9',
    });
  });

  it('reads a stab as it reads a pad, and leaves out a stab on the last steps: it anticipates the next bar', () => {
    const bar = [...at('pad', 0, [60, 64, 67]), ...at('stab', 14, [62, 65, 69])];
    expect(readChords(bar)[1]).toEqual({ root: 0, quality: 'major' });
    expect(readChords(at('stab', 14, [62, 65, 69]))).toEqual([null, null]);
  });

  it('holds a chord across a half with no new notes, and reads none where nothing sounds', () => {
    expect(readChords(at('pad', 0, [60, 64, 67]))).toEqual([
      { root: 0, quality: 'major' },
      { root: 0, quality: 'major' },
    ]);
    expect(readChords([])).toEqual([null, null]);
    expect(readChords(at('lead', 0, [60, 64, 67]))).toEqual([null, null]);
  });

  it('reads no chord from notes that are none: a cluster no quality holds', () => {
    expect(readChords(at('pad', 0, [60, 61, 62, 63]))[0]).toBeNull();
  });
});

describe('reading harm from chords', () => {
  const vamp = [...at('pad', 0, [60, 64, 67])];
  const moving = [...at('pad', 0, [60, 64, 67]), ...at('pad', 8, [65, 69, 72])];
  const rich = [...at('pad', 0, [60, 64, 67, 71, 74]), ...at('pad', 8, [65, 69, 72, 76, 79])];

  it('reads a still triad as none, a changing bar higher, a bar of ninths higher still', () => {
    expect(readHarm(vamp)!.harm).toBe(0);
    expect(readHarm(moving)!.harm).toBeGreaterThan(readHarm(vamp)!.harm);
    expect(readHarm(rich)!.harm).toBeGreaterThan(readHarm(moving)!.harm);
  });

  it('counts a change from the bar before as a change', () => {
    const previous = { root: 9, quality: 'minor' };
    expect(readHarm(vamp, previous)!.harm).toBeGreaterThan(readHarm(vamp)!.harm);
    expect(readHarm(vamp, { root: 0, quality: 'major' })!.harm).toBe(0);
  });

  it('reads nothing from a bar with no chord in it', () => {
    expect(readHarm([])).toBeUndefined();
  });

  it('keeps to 0 to 1 over every combination of size and change', () => {
    for (const changes of range(3))
      for (const size of [3, 4, 5]) {
        const notes = [0, 2, 4, 6, 8].slice(0, size).map((i) => 60 + i);
        const bar = [...at('pad', 0, notes), ...at('pad', 8, changes ? notes.map((n) => n + 5) : notes)];
        const { harm } = readHarm(bar, changes === 2 ? { root: 3, quality: 'minor' } : undefined) ?? { harm: 0 };
        expect(harm).toBeGreaterThanOrEqual(0);
        expect(harm).toBeLessThanOrEqual(1);
      }
  });
});
