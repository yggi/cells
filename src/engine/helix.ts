/**
 * Helix arithmetic: pure functions of a compiled program and the shifts — a cell's entries as
 * turned, a number resolved through its tables down to a grid, positions as pitches and colours.
 */
import type { CompileResult, ResolvedCell, Shifts, Unit } from './program';
import { ROOT, codeShifts } from './program';
import { mod } from '../theory/modes';

export interface Entry {
  readonly value: number;
  readonly alter: number;
}

/** One lap of `name`'s helix, measured in the grid it sits on. */
export function period(result: CompileResult, name: string, ctx?: string): number {
  const c = result.cells.get(name);
  if (!c) return 12;
  if (c.root) return c.cycle;
  if (c.scan) return c.scan.lap; // a scan's lap is the sum of its intervals
  return result.cells.get(c.over ?? ctx ?? c.context)?.cycle ?? 12;
}

/**
 * The braid shifted by `shift`: list braids rotate (entries that wrap climb a
 * lap of the grid below); generated braids are read from index `shift` on.
 * Either way, entry i of the result is entry i + shift of the original helix.
 */
export function shiftedUnits(result: CompileResult, name: string, shift: number, ctx?: string): Unit[] {
  const c = result.cells.get(name)!;
  const k = c.units.length;
  if (k === 0 || shift === 0) return [...c.units];
  const p = period(result, name, ctx);
  const lap = Math.floor(shift / k);
  const r = shift - lap * k;
  return Array.from({ length: k }, (_, i) => {
    const u = c.units[(i + r) % k];
    const climb = p * (lap + (i + r >= k ? 1 : 0));
    const a = u.atom;
    if (climb === 0 || a.kind === 'rest' || a.kind === 'ref' || a.kind === 'mix') return u;
    return {
      ...u,
      atom:
        a.kind === 'note'
          ? { ...a, value: a.value + climb }
          : a.kind === 'choice'
            ? { ...a, values: a.values.map((x) => x + climb) }
            : { ...a, notes: a.notes.map((x) => x + climb) },
    };
  });
}

/**
 * `entries` is asked for the same table at the same shift over and over (every note of every glyph that reads
 * through it, on every flush: issue #41). It is a pure function of (program, cell, shift), so the answers are
 * kept per compiled program (a new compile starts empty and the old one's go with it), a few hundred at most.
 */
const ENTRY_CACHE = 256;
const entryCache = new WeakMap<CompileResult, Map<string, readonly Entry[]>>();

/** The cell as a lookup table: its numbers in order (chords contribute each member). Shared: don't change it. */
export function entries(result: CompileResult, name: string, shift: number): readonly Entry[] {
  let cache = entryCache.get(result);
  if (!cache) entryCache.set(result, (cache = new Map()));
  const key = `${name}|${shift}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Entry[] = [];
  for (const { atom: a } of shiftedUnits(result, name, shift)) {
    if (a.kind === 'note') out.push({ value: a.value, alter: a.alter });
    else if (a.kind === 'chord') a.notes.forEach((v, j) => out.push({ value: v, alter: a.alters[j] }));
  }
  if (cache.size >= ENTRY_CACHE) cache.delete(cache.keys().next().value!); // (the oldest)
  cache.set(key, out);
  return out;
}

/** Entry x of a table (its own shift plus `extra`), climbing the helix outside [0, k). */
export function lookup(result: CompileResult, name: string, x: number, shifts: Shifts, extra = 0): Entry {
  const c = result.cells.get(name)!;
  if (c.root) return { value: x + shifts(name) + extra, alter: 0 };
  const es = entries(result, name, shifts(name) + extra);
  if (es.length === 0) return { value: 0, alter: 0 };
  const xi = Math.floor(x);
  const lap = Math.floor(xi / es.length);
  const e = es[xi - lap * es.length];
  return { value: e.value + lap * period(result, name), alter: e.alter };
}

export interface Resolved {
  readonly root: string;
  readonly position: number;
  /** Each table touched, with the entry used (for display). */
  readonly path: { cell: string; index: number }[];
}

/**
 * Resolve a number that indexes `table` (used with `tableShift`), down to a
 * root. An accidental moves one step on the grid below the table indexed
 * (so `6#` over a scale is the 7th degree raised a semitone).
 */
export function resolveIn(result: CompileResult, table: string, tableShift: number, value: number, alter: number, shifts: Shifts): Resolved {
  const path: { cell: string; index: number }[] = [];
  let at = table;
  let atShift = tableShift;
  let x = value;
  let pending = alter;
  for (let guard = 0; guard < 64; guard++) {
    const c: ResolvedCell = result.cells.get(at)!;
    if (c.root) {
      const position = x + pending + shifts(at) + atShift;
      path.push({ cell: at, index: Math.round(position) });
      return { root: at, position, path };
    }
    path.push({ cell: at, index: Math.floor(x + atShift) });
    const e = lookup(result, at, x, shifts, atShift);
    x = e.value + pending;
    pending = e.alter;
    atShift = c.over ? c.overShift : 0;
    at = c.over ?? c.context;
  }
  return { root: at, position: x, path };
}

/** Resolve a number written in `cell`, shown on its own (through its over= or display context). */
export function resolvePitch(result: CompileResult, cell: string, value: number, alter: number, shifts: Shifts): Resolved {
  const c = result.cells.get(cell)!;
  if (c.root) return { root: cell, position: value + alter + shifts(cell), path: [] };
  return resolveIn(result, c.over ?? c.context, c.over ? c.overShift : 0, value, alter, shifts);
}

/** Semitones above the root's zero for a resolved position (12 per root cycle). */
export function semitones(result: CompileResult, root: string, position: number): number {
  const c = result.cells.get(root);
  if (c?.map?.kind === 'ratios') {
    // the tone's ratio in its period, times the period per lap (between tones: log-interpolated)
    const r = c.map.ratios;
    const n = r.length - 1;
    const period = r[n] / r[0];
    const lap = Math.floor(position / n);
    const at = position - lap * n;
    const i = Math.floor(at);
    const f = at - i;
    const ratio = Math.pow(r[i] / r[0], 1 - f) * Math.pow(r[i + 1] / r[0], f);
    return 12 * Math.log2(Math.pow(period, lap) * ratio);
  }
  // cycle= equal steps to the grid's period: an octave (2), or ed(r)'s ratio
  const period = c?.map?.kind === 'edo' ? c.map.period : 2;
  return (position * 12 * Math.log2(period)) / (c?.cycle ?? 12);
}

/** The colour of a position on a grid: a rainbow per period, by position (on 12 to the octave: C red, D yellow, G light blue …). */
export function positionHue(result: CompileResult, root: string, position: number): number {
  const cycle = result.cells.get(root)?.cycle ?? 12;
  return (mod(Math.round(position), cycle) / cycle) * 360;
}

/**
 * A position's octave on its grid, for colour: 0 the natural range — 0 … 12 inclusive, C4 to C5 on the
 * usual grid — then −1, 1 … below and above (muted, darker or lighter).
 */
export function positionOctave(result: CompileResult, root: string, position: number): number {
  const cycle = result.cells.get(root)?.cycle ?? 12;
  const p = Math.round(position);
  return p === cycle ? 0 : Math.floor(p / cycle);
}

/** Where a pitch (semitones from position 0) falls on a grid — the inverse of semitones(). */
export function positionOf(result: CompileResult, root: string, semis: number): number {
  const c = result.cells.get(root);
  const ratio = Math.pow(2, semis / 12);
  if (c?.map?.kind === 'ratios') {
    const given = c.map.ratios;
    const r = given.map((x) => x / given[0]);
    const n = r.length - 1;
    const lap = Math.floor(Math.log(ratio) / Math.log(r[n]) + 1e-9);
    const within = ratio / Math.pow(r[n], lap);
    let i = 0;
    while (i < n - 1 && r[i + 1] <= within + 1e-12) i++;
    const f = Math.log(within / r[i]) / Math.log(r[i + 1] / r[i]);
    return lap * n + i + f;
  }
  const period = c?.map?.kind === 'edo' ? c.map.period : 2;
  return (semis * (c?.cycle ?? 12)) / (12 * Math.log2(period));
}

/** The grid a voice's notes are read through (its melodies' root), or the default grid. */
export function voiceGrid(result: CompileResult, voice: string): string {
  for (const o of result.outputs)
    if (o.voice === voice && !o.kit && !o.gate)
      try {
        return resolvePitch(result, o.cell, 0, 0, codeShifts(result)).root;
      } catch {
        /* try the next */
      }
  return ROOT;
}

/** The colour of a frequency a voice sounds, on the voice's own grid (position 0 at its pitch 0). */
export function freqHue(result: CompileResult, voice: string, freq: number): number | null {
  const v = result.cells.get(voice);
  if (!v || !(freq > 0) || !(v.freq > 0)) return null;
  const root = voiceGrid(result, voice);
  return positionHue(result, root, positionOf(result, root, 12 * Math.log2(freq / v.freq)));
}

/**
 * A voice's note named on its own grid — for grids other than 12 to the octave:
 * the grid, the position, and the nearest 12-tone note with its distance in cents
 * (null on the 12-tone grid, where the note's name says it all).
 */
export function gridName(result: CompileResult, voice: string, freq: number): { grid: string; position: number; nearest: string; cents: number } | null {
  const v = result.cells.get(voice);
  if (!v || !(freq > 0) || !(v.freq > 0)) return null;
  const root = voiceGrid(result, voice);
  const g = result.cells.get(root);
  if (!g || (g.cycle === 12 && g.map?.kind === 'edo' && g.map.period === 2)) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const m = Math.round(midi);
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return {
    grid: root,
    position: Math.round(positionOf(result, root, 12 * Math.log2(freq / v.freq))),
    nearest: `${NAMES[mod(m, 12)]}${Math.floor(m / 12) - 1}`,
    cents: Math.round((midi - m) * 100),
  };
}

/** A table and every table below it, down to its root. */
export function tableChain(result: CompileResult, table: string): string[] {
  const out: string[] = [];
  let at: string | null = table;
  for (let guard = 0; at !== null && guard < 64; guard++) {
    out.push(at);
    const c: ResolvedCell | undefined = result.cells.get(at);
    at = !c || c.root ? null : (c.over ?? c.context);
  }
  return out;
}
