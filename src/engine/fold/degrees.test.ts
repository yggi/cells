import { describe, expect, it } from 'vitest';
import { bestKey, degreeOf, degreeText, inDegrees, keyName, pitchOf, scaleText, type Key } from './degrees';
import type { Line } from './ir';

// (a key as bestKey makes them: its degrees' steps above the tonic)
const STEPS = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 9, 11] };
const keyOfScale = (name: Key['name'], tonic: number): Key => ({ name, tonic, positions: STEPS[name] });
const line = (pitches: number[]): Line => ({ name: 'l', length: pitches.length, chords: pitches.map((p, i) => ({ at: i, dur: 1, values: [String(p)] })) });

describe('degrees of a key (#344)', () => {
  it('plays a degree as a line over scale(…) does: the tonic above C4, seven degrees an octave', () => {
    // (measured: over scale(minor, E), degrees -8 -1 0 7 play -10 2 4 16)
    const e = keyOfScale('minor', 4);
    expect([-8, -1, 0, 7].map((d) => pitchOf(e, d))).toEqual([-10, 2, 4, 16]);
    expect(pitchOf(keyOfScale('major', 11), 0)).toBe(11);
  });

  it('writes a pitch as its degree, else the nearer degree with a sharp or a flat (a sharp where as near)', () => {
    const c = keyOfScale('minor', 0);
    expect([0, 2, 3, 11, 12, 1, 6, -1].map((p) => degreeText(degreeOf(c, p)))).toEqual(['0', '1', '2', '6#', '7', '0#', '3#', '-1#']);
    // (harmonic minor: A♭ to B is three semitones; A is A♭ sharp, B♭ is B flat)
    const h = keyOfScale('harmonic', 0);
    expect([9, 10].map((p) => degreeText(degreeOf(h, p)))).toEqual(['5#', '6b']);
    for (let p = -30; p < 30; p++) {
      const { degree, alter } = degreeOf(h, p);
      expect(pitchOf(h, degree) + alter, String(p)).toBe(p);
    }
  });

  it('finds the key with fewest accidentals, a tie to the tonic the bass ends on', () => {
    // (A natural minor and C major are the same notes; the tune ends on A)
    const aMinor = line([9, 11, 12, 14, 16, 17, 19, 21, 9]);
    expect(keyName(bestKey([aMinor])!)).toBe('A minor');
    expect(scaleText(bestKey([line([0, 4, 7, 11, 12, 14, 0])])!)).toBe('scale(major, C)');
    // (G♯ leading tones: harmonic minor needs none)
    expect(keyName(bestKey([line([9, 8, 9, 11, 12, 8, 9])])!)).toBe('A harmonic minor');
    expect(bestKey([{ name: 'd', length: 1, chords: [{ at: 0, dur: 1, values: ['&bd'] }] }])).toBeNull();
  });

  it('rewrites the lines’ pitches as degrees, a drum as it is', () => {
    const [l] = inDegrees(
      [
        {
          name: 'l',
          length: 2,
          chords: [
            { at: 0, dur: 1, values: ['0', '4', '&bd'] },
            { at: 1, dur: 1, values: ['11'] },
          ],
        },
      ],
      keyOfScale('minor', 0),
    );
    expect(l!.chords.map((c) => c.values)).toEqual([['0', '2#', '&bd'], ['6#']]);
  });
});
