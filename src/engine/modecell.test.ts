import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { MODE_WORDS, scaleOfPhase } from '../theory/modes';

// #363, decision 064: a diatonic mode is a value, darkest to brightest (locrian 0 … lydian 6), and a scale reads it from
// a cell (`scale(&mode, &tonic)`, `&mode major`), as it reads its tonic (#290).

const lines = (...xs: string[]) => xs.join('\n');
const messages = (src: string) => compileSource(src).diagnostics.map((d) => d.message);
/** Every event of a text's first `seconds`: time, length, pitch, voice. */
const events = (src: string, seconds = 4) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds).map((e) => [+e.at.toFixed(9), +e.dur.toFixed(9), +e.freq.toFixed(6), e.voice]);
};
/** A line over the key, its eight degrees and back, on the main meter. */
const BODY = lines('&bar meter("4/4") step=120bpm', '&tune over=&key step=8n 0 1 2 3 4 5 6 7', '&v s=sine loop=C4', '&out [&tune * &v]');

describe('a mode read from a cell', () => {
  for (const [word, phase] of Object.entries(MODE_WORDS))
    it(`&mode ${word} plays scale(${scaleOfPhase(phase)}, D), and so does its phase, ${phase}`, () => {
      const written = lines(`&key scale(${scaleOfPhase(phase)}, D)`, BODY);
      for (const value of [word, String(phase)]) {
        const read = lines('&mode ' + value, '&tonic D', '&key scale(&mode, &tonic)', BODY);
        expect(messages(read)).toEqual([]);
        expect(events(read)).toEqual(events(written));
      }
    });

  it('one phase brighter raises one note a semitone, the tonic fixed: each a fifth round the circle', () => {
    const pitches = (phase: number) => events(lines(`&mode ${phase}`, '&key scale(&mode, C)', BODY)).map((e) => Math.round(12 * Math.log2((e[2] as number) / 261.625565)));
    for (let p = 0; p < 6; p++) {
      const [darker, brighter] = [pitches(p).slice(0, 7), pitches(p + 1).slice(0, 7)];
      expect(brighter[0]).toBe(darker[0]);
      expect(brighter.map((x, i) => x - darker[i]!).sort()).toEqual([0, 0, 0, 0, 0, 0, 1]);
    }
  });

  it('over=scale(&mode, …) reads it too', () => {
    const read = lines(
      '&mode phrygian',
      '&key scale(major, C)',
      '&line over=scale(&mode, A) step=8n 0 1 2',
      '&w s=sine loop=C4',
      '&bar meter("4/4") step=120bpm',
      '&out [&line * &w]',
    );
    const written = lines('&key scale(major, C)', '&line over=scale(phrygian, A) step=8n 0 1 2', '&w s=sine loop=C4', '&bar meter("4/4") step=120bpm', '&out [&line * &w]');
    expect(events(read)).toEqual(events(written));
  });

  it('a mode the text doesn’t write is a hole, said as an unknown cell', () => {
    expect(messages(lines('&key scale(&mode, C)', BODY))).toEqual(['Unknown cell &mode']);
  });

  it('a cell that holds anything but one mode is an error that says what it holds; a stepped one is not yet a form', () => {
    for (const held of ['C', 'lydian locrian', '7', '2.5'])
      expect(messages(lines(`&mode ${held}`, '&key scale(&mode, C)', BODY))).toEqual([
        "&mode holds a scale's mode (scale(&mode, …)): write one, a name or its phase from the darkest (&mode major, &mode dorian, &mode 3)",
      ]);
    expect(messages(lines('&mode step=1m major minor', '&key scale(&mode, C)', BODY))).toEqual([
      "&mode holds a scale's mode (scale(&mode, …)): a stepped mode is not yet a form; write one (&mode dorian)",
    ]);
  });

  it('a mode word in a melody reads as its number, as a note name reads as its pitch', () => {
    expect(events(lines('&key scale(major, C)', '&bar meter("4/4") step=120bpm', '&tune over=&key step=8n locrian major', '&v s=sine loop=C4', '&out [&tune * &v]'))).toEqual(
      events(lines('&key scale(major, C)', '&bar meter("4/4") step=120bpm', '&tune over=&key step=8n 0 5', '&v s=sine loop=C4', '&out [&tune * &v]')),
    );
  });
});
