// readBack (#715): a text's bar starts and chords, read with lines cells writes, equal to the lines a frontend added itself
// (a cell stepping `1m` and a voice on C4, read through a MIDI card on channels 15 and 16, `[&harm * &readV]`).
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples';
import { planOf } from './host';
import { notesOf } from './notesof';
import { readBack } from './readback';
import { resolveSeed } from '../repository/library';

/** The lines a frontend added to a text to read it: its own approach, channels 15 and 16. */
const FRONTEND = ['&lap step=1m 0', '&readV loop=C4', '&read map=midi ~!14 [&lap * &readV] [&harm * &readV]'].join('\n');

const bass = (meter: string) =>
  [
    `&bar ${meter} step=120bpm`,
    '&key scale(ionian, C)',
    '&harm over=&key step=1m [0,2,4] [3,5,0] [4,6,1] [0,2,4]',
    '&low part=bass over=&harm step=4n 0 1 2 1',
    '&v loop=C2',
    '&out map=midi(2) [&low * &v]',
  ].join('\n');

const TEXTS: [string, string][] = [
  ['4/4', bass('meter("4/4")')],
  ['3/4', bass('meter("3/4")')],
  ['6/8', bass('meter("6/8")')],
  ['swung eighths', bass('meter("4/4") swing=8n:2/3')],
  ['a swing that moves by a cell', bass('meter("4/4") swing=8n:&sw').replace('&key scale', '&sw step=1m .5 .6 .7 .55\n&key scale')],
  ['the electro swing example', EXAMPLES.electroswing.source],
];

const byFrontend = (text: string, to: number) => {
  const p = planOf(`${text}\n${FRONTEND}`, undefined, { resolve: resolveSeed });
  const notes = notesOf(p, { to });
  const laps = [...new Set(notes.filter((n) => n.channel === 15).map((n) => n.at))].sort((a, b) => a - b);
  const chords = new Map<number, number[]>();
  for (const n of notes.filter((n) => n.channel === 16)) chords.set(n.at, [...(chords.get(n.at) ?? []), n.note]);
  return { laps, chords: [...chords].sort(([a], [b]) => a - b).map(([at, notes]) => ({ at, notes: notes.sort((a, b) => a - b) })) };
};

describe('readBack', () => {
  for (const [name, text] of TEXTS) {
    it(`reads ${name} as the frontend's own lines read it: every bar start and every chord`, () => {
      const to = 12;
      const mine = readBack(text, { to, chord: '&harm', resolve: resolveSeed });
      const theirs = byFrontend(text, to);
      expect(mine.barStarts.length, name).toBeGreaterThan(2);
      expect(mine.barStarts.length).toBe(theirs.laps.length);
      mine.barStarts.forEach((t, i) => expect(t).toBeCloseTo(theirs.laps[i]!, 9));
      expect(mine.chords.length, name).toBe(theirs.chords.length);
      mine.chords.forEach((c, i) => {
        expect(c.at).toBeCloseTo(theirs.chords[i]!.at, 9);
        expect(c.notes).toEqual(theirs.chords[i]!.notes);
      });
    });
  }

  it('leaves the text’s own notes as they are, and names its lines clear of the text’s own', () => {
    const text = bass('meter("4/4")').replace('&v loop=C2', '&v loop=C2\n&_barTap step=4n 0');
    const plain = notesOf(planOf(text), { to: 4 });
    const read = readBack(text, { to: 4, chord: 'harm' });
    expect(notesOf(read.plan, { to: 4 })).toEqual(plain);
    expect(read.barStarts.length).toBeGreaterThan(1);
  });

  it('reads no chord where none is named, or where the text has no such cell', () => {
    expect(readBack(bass('meter("4/4")'), { to: 4 }).chords).toEqual([]);
    expect(readBack(bass('meter("4/4")'), { to: 4, chord: '&nothing' }).chords).toEqual([]);
  });
});
