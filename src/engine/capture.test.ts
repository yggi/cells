import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { clocking } from './clocking';
import { eventsBetween, plan } from './realize';
import { melodicOut, quantise, tableReader, Take, writtenText, type Captured, type OutOfTable } from './capture';

// The law (#210): recording what a braid plays gives the braid back, capture(play(b)) = b, for every braid of single
// notes, chords, holds and rests over a table. `play` is the real thing: the plan's notes (realize.ts) at their times on
// the cell's clock; `capture` reads each note's start and end back through the cell's time map to its steps, and its
// pitch through the table to the number the cell writes, then quantises.

/** A seeded random (mulberry32): the same cases every run. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A braid in the form a take writes: rests single, holds on notes and chords, a chord sorted and each value once. */
function braid(rnd: () => number, entries: number, accidentals = false): string[] {
  const length = 4 + Math.floor(rnd() * 13);
  const value = () => Math.floor(rnd() * entries * 3) - entries;
  const note = () => ({ value: value(), alter: accidentals && rnd() < 0.3 ? (rnd() < 0.5 ? 1 : -1) : 0 });
  const out: string[] = [];
  for (let at = 0; at < length;) {
    const r = rnd();
    if (r < 0.25) {
      out.push('~');
      at++;
      continue;
    }
    const hold = 1 + Math.floor(rnd() * Math.min(3, length - at));
    let ws = r < 0.7 ? [note()] : [note(), note(), ...(rnd() < 0.4 ? [note()] : [])];
    ws = ws.filter((w, i) => ws.findIndex((x) => x.value === w.value && x.alter === w.alter) === i).sort((a, b) => a.value - b.value || a.alter - b.alter);
    const text = ws.length > 1 ? `[${ws.map(writtenText).join(',')}]` : writtenText(ws[0]);
    out.push(hold > 1 ? `${text}@${hold}` : text);
    at += hold;
  }
  return out;
}

const piece = (head: string, riff: string, steps: readonly string[]) => `${head}\n&riff ${riff} free(${steps.join(' ')})\n&v s=sine loop=C4\n&out map=sample [&riff * &v]`;

/** What a braid plays over one pass: the plan's notes (seconds) and the cell's clock to read them back by. */
function play(r: CompileResult) {
  const statics = codeShifts(r);
  const cell = r.cells.get('riff')!;
  const length = r.cells.get('riff')!.frees[0].hi;
  const tm = clocking(r, statics).map(cell.clock!);
  const step = (t: number) => tm.stepAt(t) * cell.rate;
  const seconds = tm.q(length / cell.rate);
  const notes = eventsBetween(plan(r, statics), 0, seconds - 1e-9);
  return { notes, step, length, statics };
}

/** The braid back from what it plays: each note through the time map and the table, quantised. */
function capture(r: CompileResult, mode: OutOfTable = 'allow'): string[] {
  const { notes, step, length, statics } = play(r);
  const o = melodicOut(r, 'riff')!;
  const base = r.cells.get(o.voice)!.freq;
  const reader = tableReader(r, o, statics);
  const caught: Captured[] = notes.flatMap((n) => {
    const w = reader.read(12 * Math.log2(n.freq / base), mode);
    return w ? [{ ...w, on: step(n.at), off: step(n.at + n.dur) }] : [];
  });
  return quantise(caught, length);
}

/** What sounds, as a comparable list: start, length and pitch of every note (one pitch spelt twice in a chord is one key). */
const sounds = (r: CompileResult) => [...new Set(play(r).notes.map((n) => `${n.at.toFixed(6)} ${n.dur.toFixed(6)} ${n.freq.toFixed(4)}`))].sort();

const SETTINGS = [
  { name: 'a major scale', head: '&key scan(2 2 1 2 2 2 1)\n&bar scan(1 1 1 1) step=90bpm', riff: 'over=&key step=&bar/4', entries: 7 },
  { name: 'a scale on 19-EDO', head: '&g cycle=19 map=edo\n&key over=&g scan(3 3 2 3 3 3 2)\n&bar scan(1 1 1 1) step=90bpm', riff: 'over=&key step=&bar/4', entries: 7 },
  { name: 'a swung clock', head: '&key scan(2 2 1 2 2 2 1)\n&bar 1!8 step=100bpm swing=.67', riff: 'over=&key step=&bar', entries: 7 },
  {
    name: 'a motor spinning up (a moving clock)',
    head: '&key scan(2 1 2 2 1 2 2)\n&bar scan(1 1 1 1) step=104bpm motor=4 mass=1 friction=.2',
    riff: 'over=&key step=&bar/4',
    entries: 7,
  },
  { name: 'semitones, no table', head: '&bar scan(1 1 1 1) step=120bpm', riff: 'step=&bar/4', entries: 12 },
];
const CASES = 250;

describe('capture(play(b)) = b', () => {
  for (const s of SETTINGS)
    it(`every braid of notes, chords, holds and rests over ${s.name} (${CASES} braids)`, () => {
      const rnd = random(210 + s.entries + s.name.length);
      for (let k = 0; k < CASES; k++) {
        const b = braid(rnd, s.entries);
        const r = compileSource(piece(s.head, s.riff, b));
        expect(r.ok, r.diagnostics[0]?.message).toBe(true);
        expect(capture(r), b.join(' ')).toEqual(b);
      }
    });

  it(`keys out of the table, under allow: a braid with accidentals comes back sounding the same (${CASES} braids, a scale and 19-EDO)`, () => {
    for (const s of SETTINGS.slice(0, 2)) {
      const rnd = random(17);
      for (let k = 0; k < CASES; k++) {
        const b = braid(rnd, s.entries, true);
        const r = compileSource(piece(s.head, s.riff, b));
        const back = capture(r);
        // (written the way a take writes it: an entry when it is one, else the fewest accidentals, sharps first)
        expect(sounds(compileSource(piece(s.head, s.riff, back))), `${b.join(' ')} → ${back.join(' ')}`).toEqual(sounds(r));
        expect(capture(compileSource(piece(s.head, s.riff, back)))).toEqual(back);
      }
    }
  });

  it('under snap a key outside the table is its nearest entry, under ignore nothing', () => {
    const r = compileSource(piece(SETTINGS[0].head, SETTINGS[0].riff, ['0', '3#', '4', '~']));
    expect(capture(r, 'allow')).toEqual(['0', '3#', '4', '~']);
    // (F# between F and G: a tie, the lower)
    expect(capture(r, 'snap')).toEqual(['0', '3', '4', '~']);
    expect(capture(r, 'ignore')).toEqual(['0', '~', '4', '~']);
  });
});

describe('the quantiser', () => {
  const n = (value: number, on: number, off: number, alter = 0): Captured => ({ value, alter, on, off });
  it('rounds late: exact positions until written, half a step later; a key starts on its nearest step', () => {
    expect(quantise([n(0, 0.1, 0.9), n(2, 1.5, 2.4), n(4, 2.49, 3.2)], 4)).toEqual(['0', '~', '[2,4]', '~']);
  });
  it('keys held together a chord, held over steps @n, a hold no further than the next key, nothing ~', () => {
    expect(quantise([n(4, 0, 1), n(0, 0.05, 2.9), n(7, 3, 8)], 6)).toEqual(['[0,4]@3', '7@3']);
    expect(quantise([n(0, 0, 4), n(2, 2, 3)], 4)).toEqual(['0@2', '2', '~']);
    expect(quantise([], 3)).toEqual(['~', '~', '~']);
  });
  it('drops keys starting outside the frame; a key held past its end ends with it', () => {
    expect(quantise([n(1, -0.7, 0.2), n(2, 3.6, 4), n(3, 2, 9)], 4)).toEqual(['~', '~', '3@2']);
  });
});

describe('a take', () => {
  it('places its pass at the next whole loop (one just begun counts), and writes it from the keys', () => {
    const t = new Take(4);
    t.begin(5.2);
    expect([t.start, t.end]).toEqual([8, 11.5]);
    t.down('a', { value: 0, alter: 0 }, 7.9); // (early by a tenth: the pass's first step)
    t.down('b', { value: 2, alter: 0 }, 9);
    t.up('a', 10.1);
    t.down('a', { value: 4, alter: 0 }, 10.1); // (struck again: a new note)
    t.down('c', null, 9); // (a key that writes nothing)
    expect(t.write()).toEqual(['0', '2', '4@2']);
    const again = new Take(8);
    again.begin(0.3);
    expect(again.start).toBe(0);
    expect(new Take(4).write()).toBeNull();
  });
});
