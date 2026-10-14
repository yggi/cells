import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';

const tail = '\n&v s=sine loop=C4\n&out map=sample [&t * &v]';
/** What &t plays: onset, length and frequency of each note, in order. */
const plays = (src: string, until = 4) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, until)
    .map((e) => `${e.at.toFixed(4)} ${e.dur.toFixed(4)} ${e.freq.toFixed(2)}`)
    .sort();
};
const hz = (src: string, until = 1.4) => plays(src, until).map((e) => Math.round(+e.split(' ')[2]));
const errors = (src: string) =>
  compileSource(src)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('degree(&x, n) and inverse(&x): a reference’s values moved before its table reads them (#31)', () => {
  const motif = '&m 0 1 2\n';
  it('degree(&m, 1) is a step up the scale: C D E → D E F', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 degree(&m, 1)' + tail)).toEqual([294, 330, 349]);
  });
  it('degree(&m, -1) a step down, past the tonic: C D E → B C D', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 degree(&m, -1)' + tail)).toEqual([247, 262, 294]);
  });
  it('inverse(&m) mirrors round the first degree: C D E → C B A', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 inverse(&m)' + tail)).toEqual([262, 247, 220]);
  });
  it('nested, they compose: degree(inverse(&m), 4) mirrors round the third degree: C D E → G F E', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 degree(inverse(&m), 4)' + tail)).toEqual([392, 349, 330]);
  });
  it('degree is in the table’s steps, ^$n in the grid’s: over a scale they differ; ^n is degree(…)', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 &m^$1' + tail)).toEqual([277, 311, 349]);
    expect(hz(motif + '&t over=scale(0,5) step=2 &m^1' + tail)).toEqual(hz(motif + '&t over=scale(0,5) step=2 degree(&m, 1)' + tail));
  });
  it('a step like any other: picks inside, modifiers after', () => {
    expect(hz(motif + '&t over=scale(0,5) step=2 degree(&m[::-1], 2)!2' + tail, 2.9)).toEqual([392, 349, 330, 392, 349, 330]);
  });
  it('chords, choices and accidentals move with it (an accidental mirrored with its note)', () => {
    expect(hz('&m [0,2,4]\n&t over=scale(0,5) step=2 degree(&m, 1)' + tail, 0.4)).toEqual([294, 349, 440]);
    expect(hz('&m 3#\n&t over=scale(0,5) step=2 inverse(&m)' + tail, 0.4)).toEqual([hz('&t over=scale(0,5) step=2 -3b' + tail, 0.4)[0]]);
    const r = compileSource('&m [0|2]\n&t over=scale(0,5) step=2 degree(&m, 1)' + tail);
    expect(r.ok).toBe(true);
  });

  it('says what it takes', () => {
    expect(errors('&m 0 1\n&t step=2 degree(&m)')[0]).toMatch(/','/);
    expect(errors('&m 0 1\n&t step=2 degree(&m, 1.5)')[0]).toMatch(/whole steps/);
    expect(errors('&t step=2 inverse(0)')[0]).toMatch(/inverse\(&cell\)/);
    expect(errors('&m 0 1\n&t step=2 inverse(&m')[0]).toMatch(/'\)'/);
  });
});
