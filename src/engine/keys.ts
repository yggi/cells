/**
 * MIDI in, the pure part (#207): which cells a keyboard can play, and what a key sounds on the one armed. A melody's
 * key goes through its table (`over=`, else its grid) to the nearest pitch the melody can play, or sounds as played;
 * a kit's members are played by their General MIDI drum notes, as MIDI out sends them (`midi.ts` `kitNotes`). Pressing
 * and releasing is the audio's business (`audio/player.ts` `press`/`release`); nothing here is written into a piece.
 */
import type { CompileResult, Output, Shifts } from './program';
import { resolvePitch, semitones } from './helix';
import { kitNotes } from './midi';
import { voiceFor } from './realize';

/** What a key outside the melody's table does: the nearest entry sounds, or the key as played (tuned from A4). */
export type KeyMode = 'nearest' | 'played';

/** A cell a keyboard can play: a voice or a kit an out plays (not a send), or a melody that plays one. */
export interface Armable {
  readonly cell: string;
  /** The voice (or the kit) it sounds on. */
  readonly voice: string;
  readonly kit: boolean;
}

/** What a keyboard plays on the cell armed. */
export type Keyboard =
  | {
      readonly kind: 'voice';
      readonly cell: string;
      readonly voice: string;
      /** The frequency a key (a MIDI note) sounds at, or null for none. */
      key(note: number): number | null;
    }
  | {
      readonly kind: 'kit';
      readonly cell: string;
      /** The first member (in the kit's order) whose General MIDI note is one of these, and its frequency. */
      drum(gm: readonly number[]): { readonly voice: string; readonly freq: number } | null;
    };

/** How far either side of 0 a melody's table is read for the pitches it can play (laps of it beyond climb the helix). */
const READ = 512;
/** Pitches no key reaches are left out. */
const LOWEST = 8;
const HIGHEST = 20000;

const byPlace = (result: CompileResult) => (a: Armable, b: Armable) => {
  const sa = result.cells.get(a.cell)?.span;
  const sb = result.cells.get(b.cell)?.span;
  return (sa?.line ?? Infinity) - (sb?.line ?? Infinity) || (sa?.col ?? 0) - (sb?.col ?? 0);
};

/** The cells a keyboard can play, in reading order: every voice or kit an out plays (not a send), and the melody that plays it. */
export function armable(result: CompileResult): Armable[] {
  const out = new Map<string, Armable>();
  for (const o of result.outputs) {
    if (o.silent || o.tape) continue;
    if (!o.gate && o.cell !== o.voice && !out.has(o.cell)) out.set(o.cell, { cell: o.cell, voice: o.voice, kit: o.kit });
    if (!out.has(o.voice)) out.set(o.voice, { cell: o.voice, voice: o.voice, kit: o.kit });
  }
  return [...out.values()].sort(byPlace(result));
}

/** A MIDI note's frequency, equal-tempered from A4 (note 69). */
export const keyFrequency = (note: number, a4 = 440): number => a4 * Math.pow(2, (note - 69) / 12);

/**
 * How loud a key struck at a velocity (1 … 127) sounds: synths mostly turn velocity into amplitude on a square law,
 * the inverse of what MIDI out sends (`midi.ts` `velocityOf`), so a note played in and sent out keeps its velocity.
 */
export function keyLevel(velocity: number): number {
  const v = Math.max(1, Math.min(127, Number.isFinite(velocity) ? velocity : 100));
  return (v / 127) ** 2;
}

/** Of a sorted list, the entry nearest x (a tie, to a billionth, takes the lower). */
function nearest(sorted: readonly number[], at: number): number | null {
  if (!sorted.length) return null;
  const x = Math.round(at * 1e9) / 1e9;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sorted[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  const below = sorted[lo];
  const above = sorted[lo + 1];
  return above !== undefined && above - x < x - below ? above : below;
}

/**
 * Every pitch (semitones from the voice's own, sorted) a melody can play on its out: the numbers written in it, read
 * through its table (`over=`, else its grid) and down to the grid's tuning (`map=edo`, `ed(r)`, `ratios`), over many
 * laps either side; the out's constant semitones added.
 */
function pitches(result: CompileResult, melody: string, o: Output, shifts: Shifts): number[] {
  const out = new Set<number>();
  const base = result.cells.get(o.voice)?.freq ?? 0;
  for (let i = -READ; i <= READ; i++) {
    const r = resolvePitch(result, melody, i, 0, shifts);
    const s = o.sign * semitones(result, r.root, r.position) + o.offset;
    const f = base * Math.pow(2, s / 12);
    if (Number.isFinite(s) && f >= LOWEST && f <= HIGHEST) out.add(Math.round(s * 1e9) / 1e9);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * What a keyboard plays on a cell: a kit, its members by drum note; a melody, the voice it plays, each key at the
 * nearest pitch the melody can play (`mode` 'played': as played); a voice, the voice, through the first melody that
 * plays it, or as played when none does. Null: the cell plays nothing (a clock, a table, a mix, a send).
 */
export function keyboardOf(result: CompileResult, cell: string, shifts: Shifts, { a4 = 440, mode = 'nearest' }: { a4?: number; mode?: KeyMode } = {}): Keyboard | null {
  const c = result.cells.get(cell);
  if (!c) return null;
  const arm = armable(result).find((a) => a.cell === cell);
  if (c.kit || arm?.kit) {
    const kit = arm?.voice ?? cell;
    const members = (result.cells.get(kit)?.units ?? []).flatMap((u) => (u.atom.kind === 'ref' && result.cells.get(u.atom.name)?.voice ? [u.atom.name] : []));
    const notes = [...kitNotes(members)];
    return {
      kind: 'kit',
      cell,
      drum: (gm) => {
        const hit = notes.find(([, n]) => gm.includes(n));
        return hit ? { voice: hit[0], freq: result.cells.get(hit[0])!.freq } : null;
      },
    };
  }
  if (!arm && !c.voice) return null;
  const voice = arm?.voice ?? cell;
  const o = result.outputs.find((x) => !x.silent && !x.tape && !x.gate && x.voice === voice && (arm?.cell === voice || x.cell === cell));
  const played = (note: number) => keyFrequency(note, a4);
  const base = result.cells.get(voice)!.freq;
  if (mode === 'played' || !o || o.cell === voice || !(base > 0)) return { kind: 'voice', cell, voice, key: played };
  // (worked out at the first key, not when asked which cells can play)
  let ladder: number[] | null = null;
  return {
    kind: 'voice',
    cell,
    voice,
    key: (note) => {
      ladder ??= pitches(result, o.cell, o, shifts);
      const s = nearest(ladder, 12 * Math.log2(played(note) / base));
      return s === null ? null : base * Math.pow(2, s / 12);
    },
  };
}

/**
 * A row of a cell as the note it plays (the piano roll's keys, #211): `value` is a number written in the cell (an
 * entry of its table, laps beyond climbing), read through its tables down to its grid's tuning as a played note is
 * (`realize.ts`), on the voice its out plays; a kit's row picks its member. A voice is read through the first melody
 * that plays it. Null: the cell plays nothing.
 */
export function rowNote(result: CompileResult, cell: string, value: number, shifts: Shifts): { readonly voice: string; readonly freq: number } | null {
  const plays = (x: Output) => !x.silent && !x.tape && !x.gate;
  const o = result.outputs.find((x) => plays(x) && x.cell === cell) ?? result.outputs.find((x) => plays(x) && x.voice === cell);
  if (!o) return null;
  if (o.kit) return voiceFor(result, o, value);
  const base = result.cells.get(o.voice)?.freq ?? 0;
  const r = resolvePitch(result, o.cell, value, 0, shifts);
  const freq = base * Math.pow(2, (o.sign * semitones(result, r.root, r.position) + o.offset) / 12);
  return freq > 0 && Number.isFinite(freq) ? { voice: o.voice, freq } : null;
}
