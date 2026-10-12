import { describe, expect, it } from 'vitest';
import { MODES, agogic, even, midiOf, modeName, noteName, pitchHue } from './modes';

describe('even (Bresenham)', () => {
  it('walks the diatonic modes darkest → brightest as the phase rises', () => {
    const names = [0, 1, 2, 3, 4, 5, 6].map((p) => modeName(even(7, 12, p)));
    expect(names).toEqual(MODES.map((m) => m.name));
  });

  it('a full phase turn lifts the set by one slot (the helix carry)', () => {
    expect(even(7, 12, 7)).toEqual(even(7, 12, 0).map((x) => x + 1));
    expect(even(7, 12, 9)).toEqual(even(7, 12, 2).map((x) => x + 1));
  });

  it('gives the familiar rhythms', () => {
    expect(even(3, 8, 2)).toEqual([0, 3, 6]); // tresillo
    expect(even(4, 12)).toEqual([0, 3, 6, 9]); // straight 4 in the perfect 12
    expect(even(3, 12)).toEqual([0, 4, 8]);
    expect(even(7, 12, 0, 8)).toEqual([13]); // index past the cycle continues up the helix
  });
});

describe('agogic', () => {
  it('bends 4/4 to *.+. and 3/4 to a Viennese waltz', () => {
    expect(agogic(4, 4).map((x) => Math.round((x / 12) * 100))).toEqual([0, 27, 50, 76]);
    const w = agogic(3, 4).map((x) => x / 12);
    expect(w[1]).toBeLessThan(1 / 3); // second beat early
    expect(w[2] - w[1]).toBeGreaterThan(1 / 3); // so the second beat is long
  });

  it('falls back to straight time', () => {
    expect(agogic(8, 8)).toEqual([0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5]);
  });
});

describe('naming and colour', () => {
  it('names mode shapes regardless of transposition', () => {
    expect(modeName([2, 4, 5, 7, 9, 11, 12])).toBe('Dorian');
    expect(modeName([0, 3, 6, 9])).toBeNull();
  });
  it('colours a rainbow per octave: C red, D yellow, E green, G light blue, A blue', () => {
    expect([0, 2, 4, 7, 9].map(pitchHue)).toEqual([0, 60, 120, 210, 270]);
    expect(pitchHue(-12)).toBe(0);
  });
});

describe('midiOf', () => {
  it('a frequency as a MIDI note, unrounded', () => {
    expect(midiOf(440)).toBe(69);
    expect(midiOf(261.63)).toBeCloseTo(60, 2);
    expect(midiOf(880)).toBe(81);
    expect(midiOf(450)).toBeCloseTo(69.39, 2);
  });
});

describe('noteName', () => {
  it('names frequencies, A4 = 440 Hz', () => {
    expect([440, 261.63, 65.41, 523.25, 55, 466.16, 27.5].map(noteName)).toEqual(['A4', 'C4', 'C2', 'C5', 'A1', 'B♭4', 'A0']);
  });
});
