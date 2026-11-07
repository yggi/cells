import { describe, expect, it } from 'vitest';
import { MODES, SCALES, agogic, even, midiOf, modeBrightness, modeName, noteName, pitchHue } from './modes';

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

describe('modeBrightness', () => {
  it('the major scale: Lydian (on its fourth) brightest, Locrian (on its seventh) darkest', () => {
    const b = modeBrightness([0, 2, 4, 5, 7, 9, 11], 12);
    expect(b.indexOf(1)).toBe(3);
    expect(b.indexOf(0)).toBe(6);
    // (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian: by steps up from each)
    expect(b.map((v) => +v.toFixed(3))).toEqual([0.833, 0.5, 0.167, 1, 0.667, 0.333, 0]);
  });
  it('all alike: half', () => expect(modeBrightness([0, 4, 8], 12)).toEqual([0.5, 0.5, 0.5]));
});

describe('the scales even generates (decision 072, #507)', () => {
  // (written out, as a theory book has them: what even() must give, so a wrong even fails here and not only in a piece)
  it('are the scales as written: the seven modes, the pentatonics, the whole tone', () => {
    expect(MODES.map((m) => [m.name, m.intervals.join(' ')])).toEqual([
      ['Locrian', '0 1 3 5 6 8 10'],
      ['Phrygian', '0 1 3 5 7 8 10'],
      ['Aeolian', '0 2 3 5 7 8 10'],
      ['Dorian', '0 2 3 5 7 9 10'],
      ['Mixolydian', '0 2 4 5 7 9 10'],
      ['Ionian', '0 2 4 5 7 9 11'],
      ['Lydian', '0 2 4 6 7 9 11'],
    ]);
    const steps = Object.fromEntries(Object.entries(SCALES).map(([k, v]) => [k, v.steps.join(' ')]));
    expect(steps).toEqual({
      major: '2 2 1 2 2 2 1',
      minor: '2 1 2 2 1 2 2',
      ionian: '2 2 1 2 2 2 1',
      dorian: '2 1 2 2 2 1 2',
      phrygian: '1 2 2 2 1 2 2',
      lydian: '2 2 2 1 2 2 1',
      mixolydian: '2 2 1 2 2 1 2',
      aeolian: '2 1 2 2 1 2 2',
      locrian: '1 2 2 1 2 2 2',
      harmonic: '2 1 2 2 1 3 1',
      melodic: '2 1 2 2 2 2 1',
      pentatonic: '2 2 3 2 3',
      minorpentatonic: '3 2 2 3 2',
      blues: '3 2 1 1 3 2',
      wholetone: '2 2 2 2 2 2',
    });
  });
});
