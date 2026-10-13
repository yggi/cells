import { describe, expect, it } from 'vitest';
import { fold, printFolded, type Line } from '.';
import { tokensOf, elementText } from './transpose';
import { pairs } from './pairs';
import { beta } from './beta';
import { figure } from './figure';
import { variants } from './variants';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';

/** A line from notes: [start, length, pitch or chord], `length` steps in all. */
const line = (name: string, notes: [number, number, number | number[]][], length: number): Line => ({
  name,
  chords: notes.map(([at, dur, v]) => ({ at, dur, values: (Array.isArray(v) ? v : [v]).map(String) })),
  length,
});
/** A melody, a note a step. */
const melody = (name: string, pitches: number[]) =>
  line(
    name,
    pitches.map((p, i) => [i, 1, p]),
    pitches.length,
  );

/** A folded line written as a piece: what it plays (step, semitones). */
function plays(lines: Line[]): string[] {
  const { defs, lines: braids, scales } = printFolded(fold(lines));
  const source = [
    `&tempo scan(1!${Math.max(...lines.map((l) => l.length))}) step=600bpm laps=1`,
    ...defs,
    ...lines.map((l) => `&${l.name} step=&tempo/${scales.get(l.name)} ${braids.get(l.name)}`),
    '&v s=tri loop=C4',
    `&out map=sample [${lines.map((l) => `&${l.name} * &v`).join(', ')}]`,
  ].join('\n');
  const r = compileSource(source);
  if (!r.ok) throw new Error(`${source}\n${JSON.stringify(r.diagnostics.slice(0, 2))}`);
  const p = plan(r, codeShifts(r), r.off);
  return eventsBetween(p, 0, p.end)
    .map((e) => `${e.voice}:${Math.round(e.at * 10)}:${Math.round(12 * Math.log2(e.freq / 261.6256))}`)
    .sort();
}
/** What a line's notes are, as `plays` says them. */
const expected = (lines: Line[]) => lines.flatMap((l) => l.chords.flatMap((c) => c.values.map((v) => `v:${c.at}:${v}`))).sort();

describe('the folder', () => {
  it('writes each chord against its lowest note: a shape and a base (the disentangler)', () => {
    const toks = tokensOf(
      line(
        'a',
        [
          [0, 1, 4],
          [1, 2, [0, 4, 7]],
          [5, 1, 2],
        ],
        8,
      ),
    );
    expect(toks.map((t) => `${t.key}@${t.base}`)).toEqual(['n1:0@4', 'n2:0,4,7@0', 'r2@null', 'n1:0@2', 'r2@null']);
    expect(toks.map((t) => elementText(t.key, t.base))).toEqual(['4', '[0,4,7]@2', '~@2', '2', '~@2']);
  });

  it('folds a phrase and its transposition into one symbol at two bases (the isometry)', () => {
    const tune = [0, 2, 4, 5, 7, 5, 4, 2];
    const f = pairs({ lines: [{ name: 'a', toks: tokensOf(melody('a', [...tune, ...tune.map((p) => p + 5)])) }], rules: new Map() })!;
    // (two tokens: the same symbol, at 0 and at 5)
    expect(f.lines[0].toks.map((t) => t.base)).toEqual([0, 5]);
    expect(f.lines[0].toks[0].key).toBe(f.lines[0].toks[1].key);
  });

  it('writes back a symbol that doesn’t pay (β)', () => {
    const f = pairs({ lines: [{ name: 'a', toks: tokensOf(melody('a', [0, 2, 9, 0, 2])) }], rules: new Map() })!;
    expect(f.rules.size).toBe(1);
    const b = beta(f)!;
    expect(b.rules.size).toBe(0);
    expect(printFolded(b).lines.get('a')).toBe('0 2 9 0 2');
  });

  it('finds a figuration: one figure read over a table of chords (the look-up)', () => {
    const chords = [
      [12, 3, 2, 0],
      [8, 5, 4, 0],
      [11, 5, 3, 2],
      [12, 7, 5, 3],
    ];
    // (24 blocks: a few would cost more as a figure than written out (a chord in the table costs about its eight
    // notes), and are left)
    const notes = Array.from({ length: 6 }, () => chords)
      .flat()
      .flatMap((c) => [0, 1, 2, 1, 3, 1, 2, 1].map((i) => c[i]));
    const f = figure({ lines: [{ name: 'rh', toks: tokensOf(melody('rh', notes)) }], rules: new Map() })!;
    const { defs, lines } = printFolded(f);
    expect(defs).toEqual([
      '&figure1 0 1 2 1 3 1 2 1',
      `&chords1 step=&tempo/8 ${Array(6).fill('[12,3,2,0] [8,5,4,0] [11,5,3,2] [12,7,5,3]').join(' ')}`,
      '&run1 over=&chords1 &figure1!24',
    ]);
    expect(lines.get('rh')).toBe('&run1');
  });

  it('writes a phrase that returns bent as one cell and a copy of it with what differs (a variant, base=)', () => {
    const subject = [12, 11, 12, 7, 8, 12, 11, 12, 14, 7, 12, 11, 12, 14, 5, 7, 8, 7, 5, 3];
    const answer = subject.map((p, i) => (i === 3 ? 12 : p + 7));
    const bass = subject.map((p) => p - 12);
    // (each line the phrase where it enters, rests round it)
    const at = (name: string, start: number, ps: number[]) =>
      line(
        name,
        ps.map((p, i) => [start + i, 1, p]),
        40,
      );
    const lines = [at('alto', 0, subject), at('sop', 20, answer), at('low', 10, bass)];
    const f = variants({ lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() })!;
    const { defs } = printFolded(f);
    // (the subject at its full length, the answer a copy of it written in its own frame: the line splices it a fifth
    // up, so -7 sounds as the answer's 12)
    expect(defs).toEqual(['&m1 0 -1 0 -5 -4 0 -1 0 2 -5 0 -1 0 2 -7 -5 -4 -5 -7 -9', '&m2 base=&m1 =!3 -7']);
    expect(plays(lines)).toEqual(expected(lines));
  });

  it('plays the same notes folded, phrases, transpositions, figures, chords and rests alike', () => {
    const tune = [0, 2, 4, 5, 7, 5, 4, 2];
    const lines = [
      melody('a', [...tune, ...tune.map((p) => p + 7), ...tune, ...tune.map((p) => p - 5)]),
      line(
        'b',
        [
          [0, 2, [-12, -5]],
          [4, 2, [-12, -5]],
          [8, 4, [-7, 0]],
          [16, 2, [-12, -5]],
          [20, 2, [-12, -5]],
          [24, 4, [-7, 0]],
        ],
        32,
      ),
      melody(
        'c',
        [
          [12, 3, 2, 0],
          [8, 5, 4, 0],
          [11, 5, 3, 2],
          [12, 7, 5, 3],
        ].flatMap((c) => [0, 1, 2, 1, 3, 1, 2, 1].map((i) => c[i])),
      ),
    ];
    expect(plays(lines)).toEqual(expected(lines));
  });
});

describe('a passage at another speed (stretch.ts, #345)', () => {
  const PHRASE = [0, 2, 4, 5, 7, 5, 4, 2, 0, -1, 0, 2];
  it('folds a passage in longer notes into a cell at its own speed, spliced slower, playing the same', () => {
    // (a line of sixteenths with the phrase in eighths in its middle: not a whole line dilate.ts could slow)
    const notes: [number, number, number][] = [];
    let at = 0;
    for (const p of [9, 11, 12, 14]) notes.push([at++, 1, p]);
    for (const p of PHRASE) (notes.push([at, 2, p]), (at += 2));
    for (const p of [14, 12, 11, 9]) notes.push([at++, 1, p]);
    const lines = [line('a', notes, at)];
    const { lines: braids } = printFolded(fold(lines));
    expect(braids.get('a')).toMatch(/&m\d+@2/);
    expect(plays(lines)).toEqual(expected(lines));
  });
  it('splices the same passage at two speeds from one cell (augmentation)', () => {
    const notes: [number, number, number][] = [];
    let at = 0;
    for (const p of PHRASE) (notes.push([at, 2, p]), (at += 2));
    notes.push([at++, 1, 19]);
    for (const p of PHRASE) (notes.push([at, 4, p + 7]), (at += 4));
    notes.push([at++, 1, 19]);
    const lines = [line('a', notes, at)];
    const { defs, lines: braids } = printFolded(fold(lines));
    const used = [...braids.get('a')!.matchAll(/&(m\d+)(?:\^\$-?\d+)?@(\d)/g)].map((m) => [m[1], m[2]]);
    expect(used.map(([, k]) => k)).toEqual(['2', '4']);
    expect(used[0]![0]).toBe(used[1]![0]);
    expect(defs.join('\n')).toContain(`&${used[0]![0]} `);
    expect(plays(lines)).toEqual(expected(lines));
  });
});
