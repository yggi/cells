import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';

// Degrees as Strudel spells them too (decision 027, #344): `n("0 2 4 6#").scale("C:minor")` is
// `over=scale("C:minor") 0 2 4 6#`; a sharp or flat on a degree is `#`/`b` or `s`/`f`.

/** What a piece plays: semitones from C4, in order (its line round and round the bar). */
function plays(source: string): number[] {
  const r = compileSource(source);
  expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 60).map((e) => Math.round(12 * Math.log2(e.freq / 261.6256)) + 0); // (+ 0: no −0)
}
const piece = (line: string) => `&bar scan(1!12) step=600bpm laps=1\n&v s=tri loop=C4\n${line}\n&out map=sample [&m * &v]`;
const errors = (line: string) =>
  compileSource(piece(line))
    .diagnostics.map((d) => d.message)
    .join(' | ');

describe('degrees, as Strudel spells them', () => {
  it('reads s and f as # and b on a degree, mixed and repeated', () => {
    const tune = (d: string) => plays(piece(`&m over=scale(minor, C) step=&bar ${d}`));
    expect(tune('0s 6s 7f 6ss 2sb 6#s')).toEqual(tune('0# 6# 7b 6## 2 6##'));
    expect(tune('6s 7f').slice(0, 2)).toEqual([11, 11]);
  });

  it('reads scale("tonic:name"), Strudel’s and tonal’s names, as scale(name, tonic)', () => {
    const tune = (scale: string) => plays(piece(`&m over=${scale} step=&bar 0 1 2 3 4 5 6 7`));
    expect(tune('scale("C:minor")')).toEqual(tune('scale(minor, C)'));
    expect(tune('scale("F#:harmonic:minor")')).toEqual(tune('scale(harmonic, F#)'));
    expect(tune('scale("Bb:major:pentatonic")')).toEqual(tune('scale(pentatonic, Bb)'));
    expect(tune('scale("D:dorian")')).toEqual(tune('scale(dorian, D)'));
    expect(plays(piece('&key scale("E:minor")\n&m over=&key step=&bar 0 2 4 6#')).slice(0, 4)).toEqual([4, 7, 11, 15]);
  });

  it('reads every scale tonal knows, as Strudel does (#337): its words after colons, ours kept', () => {
    const tune = (scale: string) => plays(piece(`&m over=${scale} step=&bar 0 1 2 3 4 5 6 7 8 9 10 11`));
    expect(tune('scale("D:minor:pentatonic")')).toEqual(tune('scale(minorpentatonic, D)'));
    expect(tune('scale("D:minorpentatonic")')).toEqual(tune('scale(minorpentatonic, D)'));
    expect(tune('scale("C:whole:tone")')).toEqual(tune('scale(wholetone, C)'));
    expect(tune('scale("C:chromatic")')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(tune('scale("C:diminished")').slice(0, 9)).toEqual([0, 2, 3, 5, 6, 8, 9, 11, 12]);
    expect(tune('scale("A:bebop:major")').slice(0, 9)).toEqual([9, 11, 13, 14, 16, 17, 18, 20, 21]);
    // (words with a dash, a sharp or an apostrophe, as tonal spells them)
    expect(tune('scale("C:in-sen")').slice(0, 5)).toEqual([0, 1, 5, 7, 10]);
    expect(tune('scale("C:lydian:#9")').slice(0, 7)).toEqual([0, 3, 4, 6, 7, 9, 11]);
    expect(tune('scale("C:messiaen\'s:mode:#2")').slice(0, 8)).toEqual(tune('scale("C:half-whole:diminished")').slice(0, 8));
  });

  it('says what it can’t read', () => {
    expect(errors('&m over=scale("C4:minor") 0')).toMatch(/the octave is the voice's/);
    expect(errors('&m over=scale("C:nothing") 0')).toMatch(/a scale by name/);
    expect(errors('&m over=scale("C:constructor") 0')).toMatch(/a scale by name/);
    expect(errors('&m over=scale("minor") 0')).toMatch(/a tonic and a scale's name/);
  });

  it('keeps an accidental with its note when a phrase moves a degree (^n), and in a copy (base=)', () => {
    // (E minor: E F# G A B C D; 6# is D#)
    const head = '&key scale(minor, E)\n&p 0 1 6#';
    expect(plays(piece(`${head}\n&m over=&key step=&bar &p &p^1`)).slice(0, 6)).toEqual([4, 6, 15, 6, 7, 17]);
    expect(plays(piece(`${head}\n&c base=&p^1 =!2 5\n&m over=&key step=&bar &c`)).slice(0, 3)).toEqual([6, 7, 12]);
  });
});
