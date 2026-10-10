import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { armable, keyboardOf, keyFrequency, keyLevel, rowNote, type Keyboard } from './keys';
import { velocityOf } from './midi';

const compiled = (src: string, A4 = 440) => {
  const r = compileSource(src, { SAMPLE_RATE: 48000, A4 });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};
const voiceKeys = (r: CompileResult, cell: string, opts?: Parameters<typeof keyboardOf>[3]) => {
  const k = keyboardOf(r, cell, codeShifts(r), opts) as Extract<Keyboard, { kind: 'voice' }>;
  expect(k?.kind).toBe('voice');
  return k;
};
/** Semitones from C4 (A4 = 440) of a frequency. */
const fromC4 = (f: number | null) => 12 * Math.log2((f ?? NaN) / keyFrequency(60));

const PENTA = `&v s=sine loop=C4
&penta 0 2 4 7 9
&tune over=&penta step=2 0 1 2
&mix map=sample [&tune * &v]`;

describe('a key on a melody: the nearest pitch its table can play', () => {
  it('on 12-EDO, a key in the table sounds as played, one outside the nearest entry (a tie the lower), every key over the keyboard', () => {
    const k = voiceKeys(compiled(PENTA), 'tune');
    const scale = [0, 2, 4, 7, 9];
    for (let note = 24; note <= 108; note++) {
      const s = note - 60;
      const lap = Math.floor(s / 12);
      const ins = [...scale.map((x) => x + 12 * lap), 12 * (lap + 1)];
      const want = ins.reduce((best, x) => (Math.abs(x - s) < Math.abs(best - s) ? x : best), ins[0]);
      expect(fromC4(k.key(note)), `key ${note}`).toBeCloseTo(want, 9);
    }
    // (spelled out: F takes E, F# takes G, A# takes A, a key between two equally near takes the lower)
    expect(fromC4(k.key(65))).toBeCloseTo(4, 9);
    expect(fromC4(k.key(66))).toBeCloseTo(7, 9);
    expect(fromC4(k.key(70))).toBeCloseTo(9, 9);
    expect(fromC4(k.key(61))).toBeCloseTo(0, 9);
  });

  it('as played (a setting): every key at its own pitch, tuned from A4', () => {
    const k = voiceKeys(compiled(PENTA), 'tune', { mode: 'played' });
    for (let note = 0; note <= 127; note++) expect(k.key(note)).toBeCloseTo(440 * Math.pow(2, (note - 69) / 12), 9);
  });

  it('on 19-EDO, a key takes the nearest step of the table over the grid, every key over the keyboard', () => {
    const r = compiled(`&edo19 cycle=19 map=edo
&v s=sine loop=C4
&s over=&edo19 0 3 6 8 11 14 17
&tune over=&s step=2 0 1 2
&mix map=sample [&tune * &v]`);
    const k = voiceKeys(r, 'tune');
    const steps = [0, 3, 6, 8, 11, 14, 17];
    for (let note = 24; note <= 108; note++) {
      const s = ((note - 60) * 19) / 12; // the key, in 19ths of an octave
      const lap = Math.floor(s / 19);
      const ins = [...steps.map((x) => x + 19 * lap), 19 * (lap + 1)];
      const want = ins.reduce((best, x) => (Math.abs(x - s) < Math.abs(best - s) - 1e-9 ? x : best), ins[0]);
      expect(fromC4(k.key(note)), `key ${note}`).toBeCloseTo((want * 12) / 19, 9);
    }
    // (spelled out: D is 3.17 steps, so 3; C# 1.58, nearer 3 than 0)
    expect(fromC4(k.key(62))).toBeCloseTo((3 * 12) / 19, 9);
    expect(fromC4(k.key(61))).toBeCloseTo((3 * 12) / 19, 9);
  });

  it('a melody without a table of its own reads its grid: on the 12, every key as played', () => {
    const k = voiceKeys(compiled(`&v s=sine loop=C4\n&tune step=2 0 4 7\n&mix map=sample [&tune * &v]`), 'tune');
    for (let note = 24; note <= 108; note++) expect(fromC4(k.key(note))).toBeCloseTo(note - 60, 9);
  });

  it('a melody on a grid of 19 with no table between: the nearest step of the 19', () => {
    const k = voiceKeys(compiled(`&edo19 cycle=19 map=edo\n&v s=sine loop=C4\n&tune over=&edo19 step=2 0 5\n&mix map=sample [&tune * &v]`), 'tune');
    for (let note = 36; note <= 96; note++) expect(fromC4(k.key(note))).toBeCloseTo((Math.ceil(((note - 60) * 19) / 12 - 0.5) * 12) / 19, 9); // (a tie the lower)
  });

  it('follows A4: a piece tuned to 432 plays its keys from 432', () => {
    const r = compiled(PENTA, 432);
    expect(voiceKeys(r, 'tune').key(60)).toBeCloseTo(432 * Math.pow(2, -9 / 12), 9);
    expect(voiceKeys(r, 'tune', { a4: 432, mode: 'played' }).key(69)).toBeCloseTo(432, 9);
  });

  it('the voice armed plays through the melody that plays it; a voice nobody plays, as played', () => {
    const r = compiled(PENTA + '\n&spare s=saw loop=C3');
    expect(fromC4(voiceKeys(r, 'v').key(66))).toBeCloseTo(7, 9);
    expect(fromC4(voiceKeys(r, 'spare').key(66))).toBeCloseTo(6, 9);
  });

  it('a cell that plays nothing has no keyboard', () => {
    const r = compiled(PENTA);
    expect(keyboardOf(r, 'penta', codeShifts(r))).toBeNull();
    expect(keyboardOf(r, 'mix', codeShifts(r))).toBeNull();
    expect(keyboardOf(r, 'nobody', codeShifts(r))).toBeNull();
  });
});

describe('a kit: its members by General MIDI drum note', () => {
  const KIT = `&bar step=4
&drums step=&bar &bd &hh &sd &hh
&bd s=sine loop=A1
&sd s=white
&hh s=white hpf=7000
&perc s=white
&odd step=&bar &perc
&mix map=sample [&drums, &odd * 0.5]`;
  it('each member answers to its note, as MIDI out sends it; a note no member has, nothing', () => {
    const r = compiled(KIT);
    const k = keyboardOf(r, 'drums', codeShifts(r));
    if (k?.kind !== 'kit') throw new Error('not a kit');
    expect(k.drum([36])?.voice).toBe('bd');
    expect(k.drum([38])?.voice).toBe('sd');
    expect(k.drum([42])?.voice).toBe('hh');
    expect(k.drum([50])).toBeNull();
    expect(k.drum([50, 38])?.voice).toBe('sd');
    expect(k.drum([36])?.freq).toBeCloseTo(55, 9);
  });
});

describe('armable', () => {
  it('lists the voices and the melodies that play them, in reading order, not the sends', () => {
    const r = compiled(PENTA + '\n&w s=saw loop=C3\n&res body=fork loop=C4\n&mix2 map=sample [&tune * &w]');
    expect(armable(r).map((a) => a.cell)).toEqual(['v', 'tune', 'w']);
  });
});

describe('keyLevel: velocity to level, the inverse of what MIDI out sends', () => {
  it('every velocity sent out again as itself', () => {
    for (let v = 1; v <= 127; v++) expect(velocityOf({ gains: [1, 1], levels: [{ at: 0, level: keyLevel(v) }] })).toBe(v);
  });
  it('full at 127, out of range clamped, nonsense as a middling 100', () => {
    expect(keyLevel(127)).toBe(1);
    expect(keyLevel(500)).toBe(1);
    expect(keyLevel(0)).toBe(keyLevel(1));
    expect(keyLevel(NaN)).toBe(keyLevel(100));
  });
});

describe('rowNote: a row of a cell as the note it plays (the piano roll, #211)', () => {
  it('a melody: its number through its table, laps climbing, on its voice; its voice reads through it', () => {
    const r = compiled(PENTA);
    const at = (cell: string, v: number) => rowNote(r, cell, v, codeShifts(r));
    for (const [v, semis] of [
      [0, 0],
      [1, 2],
      [4, 9],
      [5, 12],
      [-1, -3],
    ] as const) {
      expect(at('tune', v)?.voice).toBe('v');
      expect(fromC4(at('tune', v)?.freq ?? null)).toBeCloseTo(semis, 9);
      expect(fromC4(at('v', v)?.freq ?? null)).toBeCloseTo(semis, 9);
    }
  });
  it("over 19-EDO: the table's steps of the 19", () => {
    const r = compiled(`&edo19 cycle=19 map=edo\n&v s=sine loop=C4\n&s over=&edo19 0 3 6 8 11 14 17\n&tune over=&s step=2 0 1 2\n&mix map=sample [&tune * &v]`);
    expect(fromC4(rowNote(r, 'tune', 2, codeShifts(r))?.freq ?? null)).toBeCloseTo((6 * 12) / 19, 9);
    expect(fromC4(rowNote(r, 'tune', 7, codeShifts(r))?.freq ?? null)).toBeCloseTo(12, 9);
  });
  it('a kit: a row picks its member; a cell that plays nothing, nothing', () => {
    const r = compiled(`&bar step=4\n&drums step=&bar &bd &hh &sd\n&bd s=sine loop=A1\n&sd s=white\n&hh s=white\n&mix map=sample [&drums]`);
    expect(rowNote(r, 'drums', 0, codeShifts(r))).toEqual({ voice: 'bd', freq: 55 });
    expect(rowNote(r, 'drums', 2, codeShifts(r))?.voice).toBe('sd');
    expect(rowNote(r, 'bar', 0, codeShifts(r))).toBeNull();
  });
});
