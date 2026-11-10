import { describe, expect, it } from 'vitest';
import { BRIGHTNESS, moodOf } from '../style';
import { MODES, readMood } from './mood';
import type { Part } from './style';

const note = (part: Part, midi: number, length = 4) => ({ part, step: 0, length, note: midi });
/** A mode's scale up from a tonic, each degree a lead's note, over the tonic held in the bass. */
const scaleOver = (tonic: number, degrees: readonly number[]) => [...degrees.map((d) => note('lead', 60 + tonic + d)), note('bass', 36 + tonic, 16)];
const STEPS: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

describe('reading mood from notes', () => {
  it('reads every mode BRIGHTNESS knows on every tonic, from its scale over its tonic in the bass, at its mood (finite: 8 × 12)', () => {
    expect([...MODES].sort()).toEqual(Object.keys(BRIGHTNESS).sort());
    for (const mode of MODES)
      for (let tonic = 0; tonic < 12; tonic++)
        expect([mode, tonic, readMood(scaleOver(tonic, STEPS[mode]!))]).toEqual([mode, tonic, { mood: moodOf(mode), mode, tonic, confidence: 1 }]);
  });

  it('tells relative modes apart by the tonic: the bass’s note, counted twice', () => {
    const white = [0, 2, 4, 5, 7, 9, 11].map((d) => note('lead', 60 + d));
    expect(readMood([...white, note('bass', 45, 16)])).toMatchObject({ mode: 'aeolian', tonic: 9 });
    expect(readMood([...white, note('bass', 38, 16)])).toMatchObject({ mode: 'dorian', tonic: 2 });
    expect(readMood([...white, note('bass', 36, 16)])).toMatchObject({ mode: 'ionian', tonic: 0 });
  });

  it('trusts a triad less than a scale: its pitch classes over the scale’s seven', () => {
    expect(readMood([60, 64, 67].map((m) => note('pad', m)))).toEqual({ mood: moodOf('ionian'), mode: 'ionian', tonic: 0, confidence: 3 / 7 });
  });

  it('trusts notes outside every scale less: the share of the weight its scale covers', () => {
    const chromatic = Array.from({ length: 12 }, (_, i) => note('lead', 60 + i));
    expect(readMood(chromatic)!.confidence).toBeCloseTo(7 / 12, 12);
  });

  it('reads nothing from drums, or from no pitched note', () => {
    expect(readMood([note('drums', 36), note('drums', 38)])).toBeUndefined();
    expect(readMood([])).toBeUndefined();
  });
});
