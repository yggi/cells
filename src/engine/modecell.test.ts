import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { MODE_WORDS, scaleOfPhase } from '../theory/modes';

// #363, decision 065: a diatonic mode is a value, darkest to brightest (locrian 0 … lydian 6), and a scale reads it from
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

  it('a cell that holds anything but one mode is an error that says what it holds', () => {
    for (const held of ['C', 'lydian locrian', '7', '2.5'])
      expect(messages(lines(`&mode ${held}`, '&key scale(&mode, C)', BODY))).toEqual([
        "&mode holds a scale's mode (scale(&mode, …)): write one, a name, its phase from the darkest or its table (&mode major, &mode 3, &mode 0 2 3 5 7 8 10)",
      ]);
  });

  it('a mode written as its table plays as its name: `0 2 3 5 7 8 10` or `scan(2 1 2 2 1 2 2)` is minor, the tonic still a cell (decision 069, keys (a))', () => {
    const at = (mode: string, tonic: string) =>
      events(
        lines(
          `&mode ${mode}`,
          '&key scale(&mode, &tonic)',
          `&tonic ${tonic}`,
          '&bar meter("4/4") step=120bpm',
          '&tune over=&key step=8n 0 2 4 5 7 6 -1 9',
          '&v s=sine loop=C4',
          '&out [&tune * &v]',
        ),
      );
    for (const tonic of ['D', 'step=1m/2 D F']) {
      expect(at('0 2 3 5 7 8 10', tonic)).toEqual(at('minor', tonic));
      expect(at('scan(2 1 2 2 1 2 2)', tonic)).toEqual(at('minor', tonic));
    }
    // (any mode of the twelve, not only the diatonic seven: the blues)
    expect(at('0 3 5 6 7 10', 'C')).toEqual(
      events(lines('&key scale(blues, C)', '&bar meter("4/4") step=120bpm', '&tune over=&key step=8n 0 2 4 5 7 6 -1 9', '&v s=sine loop=C4', '&out [&tune * &v]')),
    );
  });

  it('a mode word in a melody reads as its number, as a note name reads as its pitch', () => {
    expect(events(lines('&key scale(major, C)', '&bar meter("4/4") step=120bpm', '&tune over=&key step=8n locrian major', '&v s=sine loop=C4', '&out [&tune * &v]'))).toEqual(
      events(lines('&key scale(major, C)', '&bar meter("4/4") step=120bpm', '&tune over=&key step=8n 0 5', '&v s=sine loop=C4', '&out [&tune * &v]')),
    );
  });
});

// Decision 093, #531: a key from any necklace, scale(even(k, n, &mode), &tonic), even()'s arguments a cell that is one
// number, filled as the piece is built; a mode's name a phase of the diatonic, even(7, 12), alone.
describe('a key from any necklace: scale(even(…), &tonic)', () => {
  for (const [word, phase] of Object.entries(MODE_WORDS))
    it(`scale(even(7, 12, &mode), D) with &mode ${word}, or ${phase}, or written in place, plays scale(${scaleOfPhase(phase)}, D)`, () => {
      const written = events(lines(`&key scale(${scaleOfPhase(phase)}, D)`, BODY));
      for (const value of [word, String(phase)]) {
        const read = lines('&mode ' + value, '&tonic D', '&key scale(even(7, 12, &mode), &tonic)', BODY);
        expect(messages(read)).toEqual([]);
        expect(events(read)).toEqual(written);
        expect(events(lines(`&key scale(even(7, 12, ${value}), D)`, BODY))).toEqual(written);
      }
    });

  it('any necklace a key, its mode from a cell: the pentatonic of even(5, 12), its phases its modes', () => {
    const pitches = (src: string) => events(src).map((e) => Math.round(12 * Math.log2((e[2] as number) / 261.625565)));
    // (phase 3: the minor pentatonic, 0 3 5 7 10)
    expect(pitches(lines('&p 3', '&key scale(even(5, 12, &p), C)', BODY)).slice(0, 6)).toEqual([0, 3, 5, 7, 10, 12]);
    expect(events(lines('&p 3', '&key scale(even(5, 12, &p), C)', BODY))).toEqual(events(lines('&key scale(even(5, 12, 3), C)', BODY)));
    // (its size from a cell too)
    expect(events(lines('&k 5', '&key scale(even(&k, 12, 3), C)', BODY))).toEqual(events(lines('&key scale(even(5, 12, 3), C)', BODY)));
    // (and as a generator of its own, read through a key)
    expect(events(lines('&p 3', '&m even(5, 12, &p)', '&key over=&m', BODY))).toEqual(events(lines('&m even(5, 12, 3)', '&key over=&m', BODY)));
  });

  it('a table where a name stands: scale(scan(…), D) is its steps', () => {
    expect(events(lines('&key scale(scan(2 1 2 2 1 2 2), D)', BODY))).toEqual(events(lines('&key scale(minor, D)', BODY)));
  });

  it('a mode name outside the diatonic, more than one number or a phase out of range: each says so', () => {
    expect(messages(lines('&p dorian', '&key scale(even(5, 12, &p), C)', BODY))).toEqual([
      "even(5, 12, …): a mode's name is a phase of the diatonic, even(7, 12); here write its number (3)",
    ]);
    expect(messages(lines('&key scale(even(5, 12, dorian), C)', BODY))[0]).toBe(
      "even(…, …, dorian): a mode's name is a phase of the diatonic, even(7, 12); here write its number (3)",
    );
    expect(messages(lines('&k dorian', '&key scale(even(&k, 12, 0), C)', BODY))).toEqual(["even(…): a mode's name is a phase, not a size; write a number"]);
    expect(messages(lines('&mode 3 4', '&key scale(even(7, 12, &mode), C)', BODY))).toEqual([
      "&mode is read as even(…)'s phase: a cell that is one number, filled as the piece is built (&mode 3)",
    ]);
    expect(messages(lines('&mode 9', '&key scale(even(7, 12, &mode), C)', BODY))).toEqual(['even(7, 12, phase): the phase is a mode, 0 to 6, each one place moved']);
    expect(messages(lines('&key scale(even(7, 12, &nowhere), C)', BODY)).join()).toMatch(/nowhere/);
  });
});

// #531's second rung (decision 093 §5): a key's phase stepped, read at each bar line and held through the bar (081's rule),
// the tonic staying: the scale turned to the mode in force, its key turned back.
describe('a stepped mode: its phase at each bar line', () => {
  /** A line over the key, its eight degrees each bar for four bars. */
  const BARS = lines('&bar meter("4/4") step=120bpm', '&tune over=&key step=8n 0 1 2 3 4 5 6 7', '&v s=sine loop=C4', '&out [&tune * &v]');
  const pitches = (src: string) => events(src, 8).map((e) => Math.round(12 * Math.log2((e[2] as number) / 261.625565)));
  /** Each bar's eight notes, as the mode written whole plays them. */
  const bar = (mode: string, tonic = 'D') => pitches(lines(`&key scale(${mode}, ${tonic})`, BARS)).slice(0, 8);

  it('each bar plays the mode in force at its line, on the same tonic: scale(&mode, D) and scale(even(7, 12, &mode), D) alike', () => {
    const want = ['major', 'dorian', 'lydian', 'aeolian'].flatMap((m) => bar(m));
    for (const key of ['scale(&mode, D)', 'scale(even(7, 12, &mode), D)']) {
      const src = lines('&mode step=1m major dorian lydian aeolian', `&key ${key}`, BARS);
      expect(messages(src)).toEqual([]);
      expect(pitches(src)).toEqual(want);
    }
    // (its phases as numbers: the same)
    expect(pitches(lines('&mode step=1m 5 3 6 2', '&key scale(even(7, 12, &mode), D)', BARS))).toEqual(want);
  });

  it('held through the bar: a mode stepped by the half note changes at the bar lines only', () => {
    // (half notes major dorian lydian aeolian, twice a bar: bar 1 major, bar 2 lydian, then again)
    const src = lines('&mode step=2n major dorian lydian aeolian', '&key scale(&mode, C)', BARS);
    expect(pitches(src)).toEqual(['major', 'lydian', 'major', 'lydian'].flatMap((m) => bar(m, 'C')));
  });

  it('any necklace over the twelve: the pentatonic of even(5, 12), stepped from its major to its minor', () => {
    const src = lines('&p step=1m 0 3', '&key scale(even(5, 12, &p), C)', BARS);
    expect(pitches(src).slice(0, 16)).toEqual([0, 2, 4, 7, 9, 12, 14, 16, 0, 3, 5, 7, 10, 12, 15, 17]);
  });

  it('a stepped tonic and a stepped mode together: each in force', () => {
    const src = lines('&mode step=1m major dorian', '&tonic step=1m/2 C F', '&key scale(&mode, &tonic)', BARS);
    expect(pitches(src)).toEqual([bar('major', 'C'), bar('dorian', 'C'), bar('major', 'F'), bar('dorian', 'F')].flat());
  });

  it('a stepped phase outside a key, over a necklace not of the twelve, a mode name outside the diatonic, or a step not a phase: each says so', () => {
    expect(messages(lines('&p step=1m 0 3', '&m even(5, 12, &p)', '&key over=&m', BARS))).toEqual([
      "&p steps even(…)'s phase: a stepped phase is read in a key, scale(even(5, 12, &p), &tonic)",
    ]);
    expect(messages(lines('&p step=1m 0 1', '&key scale(even(5, 19, &p), C)', BARS))).toEqual([
      "&p steps even(5, 19, …)'s phase: a stepped phase is a key's, a necklace over the twelve (even(k, 12, &p))",
    ]);
    expect(messages(lines('&p step=1m 0 dorian', '&key scale(even(5, 12, &p), C)', BARS))).toEqual([
      "even(5, 12, &p): a mode's name is a phase of the diatonic, even(7, 12); here write its number (3)",
    ]);
    expect(messages(lines('&mode step=1m 3 9', '&key scale(&mode, C)', BARS))).toEqual(['even(7, 12, phase): the phase is a mode, 0 to 6, each one place moved']);
    expect(messages(lines('&mode step=1m 3 D', '&key scale(&mode, C)', BARS))[0]).toMatch(/each step a number from 0 to 6 or a mode by name/);
  });
});
