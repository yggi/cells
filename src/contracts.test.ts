/**
 * The family's contracts (yggi/music-commons `contracts/`), run against the parts of them cells implements: `euclid`
 * (Bjorklund's set, the turn, and the canonical set behind `scale(tonic, phase)`) and `notes` (C4 = 60, A4 = 440 Hz).
 * The vectors are copied into `fixtures/contracts/`, each with a `lifted` line naming the hub and the commit it came
 * from; the hub's README for each contract is the rule. A vector that disagrees with cells is recorded here as what
 * cells does, not changed in cells: a change to what the language means is a decision, not a test's.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bjorklund } from './engine/parser/generators';
import { parse } from './engine/parser';
import { compileSource } from './engine/compile';
import { codeShifts, noteFrequency } from './engine/program';
import { eventsBetween, plan } from './engine/realize';
import { noteOf } from './engine/midi';
import { keyName, keyOf } from './engine/miditext';
import { even, midiOf, noteName, pitchOfName } from './theory/modes';

interface Contract<V> {
  readonly lifted: string;
  readonly contract: string;
  readonly version: number;
  readonly vectors: readonly V[];
}
const contract = <V>(name: string): Contract<V> => JSON.parse(readFileSync(new URL(`../fixtures/contracts/${name}.json`, import.meta.url), 'utf8'));

interface EuclidVector {
  readonly k: number;
  readonly n: number;
  readonly even: readonly number[];
  readonly bjorklund: readonly number[];
  readonly offset: number;
}
interface NoteVector {
  readonly midi: number;
  readonly pc: number;
  readonly octave: number;
  readonly sharp: string;
  readonly flat: string;
  readonly hz: number;
}

/** A set of positions turned right by t: onset j moves to j + t, mod n (the contract's turn). */
const turn = (set: readonly number[], t: number, n: number) => set.map((j) => (((j + t) % n) + n) % n).sort((a, b) => a - b);
/** The positions of a pattern's hits. */
const onsets = (hits: readonly boolean[]) => hits.flatMap((hit, j) => (hit ? [j] : []));
/** The positions of a braid's notes, as written in the language. */
const written = (src: string) => {
  const r = parse(`&t ${src}`);
  expect(r.diagnostics, src).toEqual([]);
  const b = r.cells[0].braid;
  return b.kind === 'list' ? b.tokens.flatMap((t, j) => (t.atom.kind === 'rest' ? [] : [j])) : null;
};

describe('the euclid contract (music-commons contracts/euclid, version 1)', () => {
  const euclid = contract<EuclidVector>('euclid');
  const pairs = euclid.vectors;

  it('is the version cells passes, every 0 ≤ k ≤ n ≤ 16, lifted with its source named', () => {
    expect([euclid.contract, euclid.version]).toEqual(['euclid', 1]);
    expect(euclid.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/euclid\/vectors\.json @ [0-9a-f]{7,40}$/);
    expect(pairs.length).toBe(Array.from({ length: 16 }, (_, i) => i + 2).reduce((a, b) => a + b));
    // (the two sets differ by a turn for 46 of the 120 pairs with 1 ≤ k < n ≤ 16: the vectors can tell them apart)
    expect(pairs.filter((v) => v.k >= 1 && v.k < v.n && v.offset !== 0).length).toBe(46);
  });

  it('bjorklund(k, n) is Bjorklund’s set, for every pair', () => {
    for (const v of pairs) expect(onsets(bjorklund(v.k, v.n)), `${v.k} of ${v.n}`).toEqual(v.bjorklund);
  });

  it('euclid(k, n, r) as written is Bjorklund’s set turned right by r, and so the canonical set turned by r + offset', () => {
    for (const v of pairs)
      for (let r = 0; r < v.n; r++) {
        const at = written(`euclid(${v.k}, ${v.n}, ${r})`);
        expect(at, `euclid(${v.k}, ${v.n}, ${r})`).toEqual(turn(v.bjorklund, r, v.n));
        expect(at, `euclid(${v.k}, ${v.n}, ${r}) against even(${v.k}, ${v.n}, ${r} + ${v.offset})`).toEqual(turn(v.even, r + v.offset, v.n));
      }
  });

  it('x(k, n, r) on a step strikes the same parts of it as euclid(k, n, r)', () => {
    for (const v of pairs)
      for (let r = 0; r < v.n; r++) {
        const r1 = parse(`&t 0(${v.k},${v.n},${r})`);
        expect(r1.diagnostics).toEqual([]);
        const b = r1.cells[0].braid;
        const atom = b.kind === 'list' ? b.tokens[0].atom : null;
        const hits = atom?.kind === 'seq' ? atom.euclid?.hits : undefined;
        expect(hits, `0(${v.k},${v.n},${r})`).toEqual(turn(v.bjorklund, r, v.n));
      }
  });

  it('theory’s even(k, n, phase) is the canonical set at phase k − 1, turned right by t at phase k − 1 + t·k', () => {
    // (cells' own form of the canonical set: floor((j·n + phase) / k), which `scale(tonic, phase)` reads; its phases
    // step one onset at a time, so a whole turn is k of them, and phase 0 is the darkest mode, not the canonical set)
    for (const v of pairs)
      for (let t = 0; t < v.n; t++) expect(turn(even(v.k, v.n, v.k - 1 + t * v.k), 0, v.n), `even(${v.k}, ${v.n}, ${v.k - 1 + t * v.k})`).toEqual(turn(v.even, t, v.n));
  });
});

describe('the notes contract (music-commons contracts/notes, version 1)', () => {
  const notes = contract<NoteVector>('notes');
  const keys = notes.vectors;
  const ascii = (name: string) => name.replace(/♯/g, '#').replace(/♭/g, 'b');

  it('is the version cells passes, all 128 note numbers, lifted with its source named', () => {
    expect([notes.contract, notes.version]).toEqual(['notes', 1]);
    expect(notes.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/notes\/vectors\.json @ [0-9a-f]{7,40}$/);
    expect(keys.map((v) => v.midi)).toEqual(Array.from({ length: 128 }, (_, i) => i));
  });

  it('a note name, sharp or flat, is its frequency at A4 = 440 (noteFrequency, within 0.001 Hz)', () => {
    for (const v of keys)
      for (const name of [v.sharp, v.flat]) {
        expect(Math.abs(noteFrequency(name)! - v.hz), name).toBeLessThan(0.001);
      }
  });

  it('a frequency is its note number (noteOf, midiOf: C4 = 60, A4 = 69)', () => {
    for (const v of keys) {
      const { note, cents } = noteOf(v.hz);
      expect(note, `${v.hz} Hz`).toBe(v.midi);
      expect(Math.abs(cents)).toBeLessThan(0.1);
      expect(Math.abs(midiOf(v.hz) - v.midi)).toBeLessThan(0.001);
    }
  });

  it('a name or a number is its key in MIDI text (keyOf), and a name is its semitones from C4 in the parser (pitchOfName)', () => {
    for (const v of keys) {
      expect(keyOf(String(v.midi))).toBe(v.midi);
      for (const name of [v.sharp, v.flat]) {
        expect(keyOf(name), name).toBe(v.midi);
        expect(pitchOfName(name), name).toBe(v.midi - 60);
      }
    }
  });

  it('a note name in a braid is its pitch, as semitones from C4 (C, F#, Bb3 …; pitched, whatever the tables)', () => {
    for (const v of keys)
      for (const name of [v.sharp, v.flat]) {
        const r = parse(`&t ${name}`);
        expect(r.diagnostics, name).toEqual([]);
        const b = r.cells[0].braid;
        expect(b.kind === 'list' ? b.tokens[0].atom : null, name).toEqual({ kind: 'note', value: v.midi - 60, alter: 0, pitched: true });
      }
  });

  /** The contract's names an attribute's rate does not read (below): a natural note in octave −1. */
  const unread = /^[A-G]-1$/;

  it('a note name as a rate is its frequency: &a loop=<name> turns at its Hz', () => {
    for (const v of keys)
      for (const name of [v.sharp, v.flat].filter((name) => !unread.test(name))) {
        const r = compileSource(`&a loop=${name}`);
        expect(
          r.diagnostics.filter((d) => d.severity === 'error'),
          name,
        ).toEqual([]);
        expect(Math.abs(r.cells.get('a')!.freq - v.hz), name).toBeLessThan(0.001);
      }
    // (and a voice alone on an audible one plays it: the smallest piece, decision 028)
    const r = compileSource('&a loop=C#4');
    expect(r.diagnostics).toEqual([]);
    expect(Math.abs(eventsBetween(plan(r, codeShifts(r)), 0, 1, true)[0].freq - keys[61].hz)).toBeLessThan(0.001);
  });

  it('…but not a natural note in octave −1: loop=C-1 is an error (recorded, not a failure: C#-1, Bb-1 and a braid’s C-1 read)', () => {
    // The contract names notes 0, 2, 4, 5, 7, 9 and 11 C-1, D-1 … B-1. A braid reads them (above), and so do
    // noteFrequency, keyOf and pitchOfName, and an attribute reads the same octave with an accidental; an attribute's
    // rate (parseStep in parser/values.ts) takes the bare letter as an environment name and stops at the '-'.
    const names = keys.flatMap((v) => [v.sharp, v.flat]).filter((name, i, all) => unread.test(name) && all.indexOf(name) === i);
    expect(names).toEqual(['C-1', 'D-1', 'E-1', 'F-1', 'G-1', 'A-1', 'B-1']);
    for (const name of names)
      expect(
        compileSource(`&a loop=${name}`).diagnostics.map((d) => d.message),
        name,
      ).toContain("Unexpected '-'");
  });

  it('a note number’s name (keyName, noteName) has the contract’s pitch class and octave, and is its sharp or its flat label', () => {
    for (const v of keys) {
      expect(keyName(v.midi)).toMatch(new RegExp(`^[A-G][#b]?${v.octave}$`));
      expect([v.sharp, v.flat], `${v.midi}`).toContain(keyName(v.midi));
      expect([v.sharp, v.flat], `${v.midi}`).toContain(ascii(noteName(v.hz)));
    }
  });

  it('…but neither column alone: cells names C# Eb F# Ab Bb, a mixed set (recorded, not a failure: the contract fixes labels, and cells’ choice is its own)', () => {
    // The contract's plain names are two columns, all sharps and all flats; cells writes one name for each pitch class,
    // sharps for C# and F#, flats for Eb, Ab and Bb, in MIDI text (keyName) and in theory (noteName, with ♯ and ♭).
    // It reads both columns everywhere (above); it writes neither column whole.
    const mixed = keys.slice(60, 72).map((v) => keyName(v.midi));
    expect(mixed).toEqual(['C4', 'C#4', 'D4', 'Eb4', 'E4', 'F4', 'F#4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4']);
    expect(keys.slice(60, 72).map((v) => ascii(noteName(v.hz)))).toEqual(mixed);
    expect(mixed).not.toEqual(keys.slice(60, 72).map((v) => v.sharp));
    expect(mixed).not.toEqual(keys.slice(60, 72).map((v) => v.flat));
  });
});
