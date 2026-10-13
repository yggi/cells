import { describe, expect, it } from 'vitest';
import { SCALES } from './modes';
import { TONAL_SCALES, semitones } from './tonal';

describe("tonal's scales (Strudel's scale names)", () => {
  it('reads an interval: degree and quality', () => {
    expect(['1P', '2m', '2M', '2A', '3m', '3M', '4d', '4P', '4A', '5d', '5P', '5A', '6m', '6M', '6A', '7d', '7m', '7M'].map(semitones)).toEqual([
      0, 1, 2, 3, 3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 9, 10, 11,
    ]);
    expect(() => semitones('8P')).toThrow();
  });
  it('every scale climbs within the octave and comes round to 12', () => {
    expect(Object.keys(TONAL_SCALES).length).toBe(131);
    for (const [name, steps] of Object.entries(TONAL_SCALES)) {
      expect(
        steps.every((s) => s > 0),
        name,
      ).toBe(true);
      expect(
        steps.reduce((a, b) => a + b, 0),
        name,
      ).toBe(12);
    }
    expect(TONAL_SCALES['chromatic']).toEqual(Array(12).fill(1));
    expect(TONAL_SCALES['diminished']).toEqual([2, 1, 2, 1, 2, 1, 2, 1]);
    expect(TONAL_SCALES['whole tone']).toEqual(SCALES.wholetone!.steps);
  });
  it("a name that is ours too is the same scale; tonal's long names for ours agree", () => {
    for (const name of Object.keys(SCALES)) if (name in TONAL_SCALES) expect(TONAL_SCALES[name], name).toEqual(SCALES[name]!.steps);
    expect(TONAL_SCALES['harmonic minor']).toEqual(SCALES.harmonic!.steps);
    expect(TONAL_SCALES['melodic minor']).toEqual(SCALES.melodic!.steps);
    expect(TONAL_SCALES['major pentatonic']).toEqual(SCALES.pentatonic!.steps);
    expect(TONAL_SCALES['minor pentatonic']).toEqual(SCALES.minorpentatonic!.steps);
    expect(TONAL_SCALES['minor blues']).toEqual(SCALES.blues!.steps);
  });
});
