import { describe, expect, it } from 'vitest';
import { voiceCount, voicesOf, type Voiced } from './voices';

/** Notes a step each: [start, length, pitch]. */
const notes = (ns: [number, number, number][]): Voiced[] => ns.map(([start, dur, key]) => ({ start, end: start + dur, key }));

describe('voices (fold/voices.ts)', () => {
  it('counts the voices, a cadence’s thicker chord not one more', () => {
    const two = notes(
      Array.from({ length: 40 }, (_, i) => [i, 1, 60 + (i % 3)] as [number, number, number]).concat(
        Array.from({ length: 40 }, (_, i) => [i, 1, 48 - (i % 2)] as [number, number, number]),
      ),
    );
    expect(voiceCount(two)).toBe(2);
    // (a last chord of four, one step in eighty: two voices still)
    expect(voiceCount([...two, ...notes([[39, 1, 55]]), ...notes([[39, 1, 52]])])).toBe(2);
  });
  it('keeps a voice that crosses into the other hand’s register on its line, and lets a voice enter in its own', () => {
    // (a fugue's start: the upper voice alone, then the lower enters below it; the upper then walks down past where
    // the lower began, while the lower rests)
    const upper: [number, number, number][] = [
      [0, 1, 72],
      [1, 1, 71],
      [2, 1, 72],
      [3, 1, 67],
      [4, 1, 69],
      [5, 1, 71],
      [6, 1, 72],
      [7, 1, 74],
    ];
    const lower: [number, number, number][] = [
      [4, 1, 60],
      [5, 1, 59],
      [6, 1, 60],
      [7, 1, 55],
    ];
    const all = notes([...upper, ...lower]);
    const { voice, count } = voicesOf(all);
    expect(count).toBe(2);
    expect(voice.slice(0, upper.length)).toEqual(Array(upper.length).fill(0));
    expect(voice.slice(upper.length)).toEqual(Array(lower.length).fill(1));
  });
  it('follows a voice by its nearest step, not its place in the chord, when the other rests', () => {
    // (two voices; the lower rests while the upper falls an octave, then both sound again)
    const ns = notes([
      [0, 1, 72],
      [0, 1, 48],
      [1, 1, 67],
      [2, 1, 64],
      [3, 1, 60],
      [3, 1, 50],
    ]);
    expect(voicesOf(ns).voice).toEqual([0, 1, 0, 0, 0, 1]);
  });
});
