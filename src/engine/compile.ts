/**
 * The cell model.
 *
 * Every cell is a helix: a braid of k entries sitting in the grid of the cell
 * it is `over`. Index i past the end climbs the helix: entry (i mod k) plus one
 * lap of the grid below per wrap. The default grid &fifths12TET (12 per lap) is
 * implicit; any bare `cycle=n` cell is another root grid.
 *
 * Three operations, one idea — indexing a helix:
 *  - over=&t   a number x in this braid means "entry x of &t"
 *  - shift=n   rotate the braid by n (entries that wrap climb a lap);
 *              entry x of &t shifted by n is entry x+n of &t
 *  - &t±n      use &t shifted by n — in a braid (splice it rotated) or in over=
 *
 * Time is shifting too:
 *  - step=&d      shift by one per step of &d (`&d*2` every two steps, `&d/2` twice per step)
 *  - step={&d}    shift by one per full cycle of &d
 *  A played braid's shift is its playhead; a table's shift transposes / rotates
 *  what looks through it — so a key can turn once per pass of a theme.
 *
 *  - step=84bpm   shift at a rate (steps per second): a clock.
 *  - loop=…       the same forms, counting whole turns of the braid instead of steps.
 *                 A voice is a cell looped at audio rate: loop=440 plays its braid,
 *                 mapped to amplitude (map=amp|sin|&table), 440 times a second.
 *
 * One command routes sound, with no implicit voices:
 *  - out(&voice, &theme + &vibrato)   the voice's rate is pitch 0; &theme's pitches
 *    trigger notes; every further term adds its pitch (modulation).
 */
import type { Atom, Binding, Braid, Diagnostic, FreeSpec, ParseResult, Pick, Span } from './ast';
import { parse } from './parser';
import { compile as compileIn } from './compiler';
import { mod } from '../theory/modes';

export const ROOT = 'fifths12TET';
export const MAX_EVENTS = 50_000;
/** A voice without a rate loops at middle C. */
export const DEFAULT_FREQ = 261.63;

/** A step of a braid as written (before shifting). */
export interface Unit {
  readonly atom: Atom;
  readonly repeat: number;
  readonly subdivide: number;
  readonly elongate: number;
  /** x?p: its probability; null: the cell's chance=. */
  readonly chance?: number | null;
}

export interface ResolvedCell {
  readonly name: string;
  readonly span: Span;
  /** A bare grid (root). */
  readonly root: boolean;
  /** The default grid, added because the code didn't declare it. Not drawn. */
  readonly implicit: boolean;
  /** Table its numbers index. null: a root, or no over= (it reads through whoever splices it). */
  readonly over: string | null;
  /** Shift on the over= reference (`over=&scale[<<]`). */
  readonly overShift: number;
  /** Table used to show the cell on its own: over, else its first player's, else the default grid. */
  readonly context: string;
  /** Grid size (roots) / number of entries (tables). */
  readonly cycle: number;
  /**
   * cycle= as written: where a turning cell wraps. Without it a cell's turning
   * climbs a lap each time round, like every other shift.
   */
  readonly wrap: number | null;
  /** An unnamed cell (`&( … )`): its body as written. */
  readonly lambda: string | null;
  /** Numbers left free for the performer (free(…)): sliders on the node. */
  readonly frees: readonly FreeSpec[];
  /** laps=n: it plays n laps, then nothing it drives sounds. */
  readonly laps: number | null;
  /** loop=: it turns its whole braid at its rate (an oscillation), rather than stepping. */
  readonly loops: boolean;
  /** What a bare x? means here (½ unless chance= says). */
  readonly chance: number;
  /** Its sequence of chance (seed=, else from its name). */
  readonly seed: number;
  /** size=: how large it's drawn, against the others (1). */
  readonly size: number;
  /** tags= on a cell: its clusters in the graph (on the piece's card, tags= are the piece's). */
  readonly tags: readonly string[];
  /** On a note: the cells it explains (about=), drawn as links from the note. */
  readonly about: readonly string[];
  /** Steps a beat (beat=, or from meter(…)): a meter's bpm counts beats, 1 = every step a beat. */
  readonly beat: number;
  /** Written as levels (meter(…)): its values are 3 the bar, 2 a beat, 1 a subdivision, 0 finer. */
  readonly leveled: boolean;
  /**
   * A resonator's exciters (its braid): each a tuned element — a semitone shift from its fundamental,
   * with settings of its own (from a cell it refers to: hard=, ring=, body=). None written: the twelve
   * semitones, so every body plays chromatically.
   */
  readonly exciters?: readonly Exciter[];
  /** show= as written: how it's shown (the layout decides what fits). */
  readonly show: string | null;
  /** label= as written: a name to show, or (alone) a note in the graph. */
  readonly label: string | null;
  /** Only a label: an explanatory note, not a cell that does anything. */
  readonly note: boolean;
  /** A voice's own volume (env=) and pitch (pitch=): acting on every note it plays. */
  readonly env: string | null;
  readonly pitch: string | null;
  readonly braid: Braid['kind'];
  readonly units: readonly Unit[];
  /** A scan(…): its intervals, and its lap (their sum) — the cell climbs by that lap. */
  readonly scan: { readonly lap: number; readonly steps: readonly number[] } | null;
  /** shift= as written. */
  readonly shift: number;
  /** `off` as written. */
  readonly off: boolean;
  /** Cells spliced in with &ref, with how many slots reference each. */
  readonly children: ReadonlyMap<string, number>;
  /** Length in steps (a &ref takes the referenced cell's steps). */
  readonly steps: number;
  /** Steps taken by each unit as written (for picks like &x[1:3]). */
  readonly unitSteps: readonly number[];
  /** Whether the braid has numbers of its own (vs. only &refs and rests). */
  readonly hasValues: boolean;
  /** How far each step moves it (stride=), 1 by default. */
  readonly stride: number;
  /** step=/loop= driven by another cell: the driver, and the label for the edge. */
  readonly step: { readonly driver: string; readonly cycle: boolean; readonly whole: boolean; readonly label: string } | null;
  /** map= (how values become output): amp, sin or a table. */
  readonly map:
    | { readonly kind: 'amp' | 'lin' | 'sample' | 'adsr' | 'db' }
    | { readonly kind: 'edo'; readonly period: number }
    /** A grid of ratios: one period's tones, then the period (the last). */
    | { readonly kind: 'ratios'; readonly ratios: readonly number[] }
    | { readonly kind: 'table'; readonly table: string }
    | null;
  /** A mix cell (`&mix [&theme * &lead, …]`): its voices, as written. */
  readonly mix: readonly Binding[] | null;
  /** The sound card (`map=sample`): its entries are channels. */
  readonly sink: boolean;
  /** The clock this cell's stepping comes from, and its shifts per clock step. */
  readonly clock: string | null;
  readonly rate: number;
  /** dough sound parameters. */
  readonly params: Readonly<Record<string, number | string>>;
  /** Parameters that move: a range scaled by cells (or, no range, one cell's values as they are). */
  readonly paramCells: Readonly<Record<string, { readonly range: readonly [number, number] | null; readonly factors: readonly string[] }>>;
  /** Used as the voice of an out(…), or has sound parameters. */
  readonly voice: boolean;
  /** Voice: turns of its braid per second at pitch 0 (loop=f, or step=r over its k steps). */
  readonly freq: number;
  /** A braid of voices only: indexed by number, like a drum kit. */
  readonly kit: boolean;
}

/** A cell moved at a rate (step=84bpm, loop=2). */
/**
 * Resonators' bodies: their modes — ratio to the fundamental, share of the ring, level. A fork: its
 * tone and the clang (6.27×, gone at once); a bell: hum, prime, tierce, quint, nominal …; a free bar
 * (1 : 2.756 : 5.404 : 8.933); a plate (dense, inharmonic); a box (a few low, short modes).
 */
export const BODIES: Record<string, readonly (readonly [number, number, number])[]> = {
  fork: [[1, 1, 1], [6.27, 0.03, 0.35]],
  bell: [[0.5, 1, 0.5], [1, 0.8, 1], [1.2, 0.6, 0.7], [1.5, 0.5, 0.45], [2, 0.45, 0.6], [2.5, 0.3, 0.35], [2.67, 0.28, 0.3], [3, 0.22, 0.25]],
  bar: [[1, 1, 1], [2.756, 0.45, 0.5], [5.404, 0.22, 0.3], [8.933, 0.12, 0.18]],
  plate: [[1, 1, 0.8], [1.58, 0.8, 0.7], [2.24, 0.7, 0.6], [2.92, 0.55, 0.55], [3.15, 0.5, 0.5], [3.88, 0.4, 0.4], [4.47, 0.35, 0.35], [5, 0.3, 0.3]],
  box: [[1, 1, 1], [1.42, 0.7, 0.6], [1.91, 0.5, 0.45], [2.53, 0.35, 0.3]],
  // a tine (a bar clamped at one end, a kalimba's): its tone, and overtones near 5.9× and 17.6× that die at once
  tine: [[1, 1, 1], [5.93, 0.12, 0.35], [17.6, 0.03, 0.12]],
  // a pipe closed at one end: odd harmonics only, the higher dying sooner
  pipe: [1, 3, 5, 7, 9, 11, 13].map((n) => [n, 1 / Math.sqrt(n), 1 / n] as const),
  // a stiff wire: harmonics, stretched a little sharp (fₙ = n f √(1 + B n²), B .0006)
  wire: Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [n * Math.sqrt(1 + 0.0006 * n * n), 1 / (0.6 + 0.4 * n), 1 / n] as const),
  // a spring: not modes — a chirp (high before low) round a loop; drawn with one ring
  spring: [[1, 1, 1]],
};

export interface Exciter {
  readonly shift: number;
  readonly params: Readonly<Record<string, number | string>>;
}

/** What isn't a voice's: the sound card's level, and a clock's physics. */

export interface Clock {
  readonly cell: string;
  /** Steps per second. */
  readonly perSecond: number;
  /** A positional meter (a scan, a grid): its entries place its steps within the bar. */
  readonly positional: boolean;
  /** A belt (belt= on a driven cell): it follows its driver at this ratio through a spring, not rigidly. */
  readonly belt?: { readonly driver: string; readonly rate: number };
  /** swing=: of each pair of steps, the second starts this far through (.5 straight, .67 triplet swing). */
  readonly swing?: number;
}

/** A pitch term of an out sum. */
export interface PitchTerm {
  readonly cell: string;
  readonly pick: Pick | null;
  readonly shift: number;
  readonly sign: 1 | -1;
}

/** A resolved out(&voice, &theme + &mod …). */
export interface Output {
  readonly id: string;
  /** Voice cell, or kit cell (numbers pick a voice). */
  readonly voice: string;
  readonly kit: boolean;
  /** The term that triggers notes. */
  readonly cell: string;
  readonly pick: Pick | null;
  readonly shift: number;
  readonly sign: 1 | -1;
  /** Further terms: their pitch is added while notes sound. */
  readonly mods: readonly PitchTerm[];
  /** Volume streams (map=amp): their values multiply the level while notes sound; rests are silence. */
  readonly levels: readonly PitchTerm[];
  /** The term that starts notes is a volume stream, not a pitch: notes sound at pitch 0, at its level. */
  readonly gate: boolean;
  /** Constant semitones from numbers in pitch sums. */
  readonly offset: number;
  /** Level per channel [left, right], from the gains in the mixes the sound card plays. */
  readonly gains: readonly [number, number];
  /** The mix cells and sound card it goes through (for drawing). */
  readonly via: readonly string[];
  /** Instruments (mixes used like voices) it plays through. */
  readonly through: readonly string[];
  /** Per-note envelope from a map=adsr factor (seconds; sustain a level), or null for the voice's own. */
  readonly envelope: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number } | null;
  /** The map=adsr cell it comes from. */
  readonly envelopeCell: string | null;
  /** Where its level comes from: each mix and sound card it's in, and what that mix adds per channel. */
  readonly parts: readonly { readonly mix: string; readonly sink: string; readonly gains: readonly [number, number] }[];
  /**
   * Selectors it plays through (a cell reading a table of parts): it sounds while each picks its
   * entry, and starts again from its beginning each time it's picked — reading a table splices.
   */
  readonly select: readonly { readonly cell: string; readonly entry: number; readonly part: string }[];
  /** A send: played into what it feeds (a resonator, a tape), not heard from its voice itself. */
  readonly silent?: boolean;
  /** Played off a tape: its source's notes, through the tape (a read head at= after the write head). */
  readonly tape?: { readonly head: string; readonly tape: string; readonly at: number; readonly length: number; readonly erase: number };
  readonly span: Span;
}

/** A tape that records sound (write= a mix): its loop and colour, for the audio. */
export interface AudioTape {
  readonly name: string;
  readonly source: string;
  readonly length: number;
  readonly erase: number;
  /** The loss filter's corner (Hz), saturation drive, hiss level. */
  readonly tone: number;
  readonly drive: number;
  readonly hiss: number;
  /** Print-through: a faint pre-echo (its level), printgap= tape-seconds before each head. */
  readonly print: number;
  readonly printgap: number;
  /** Dropouts: brief gaps in the playback, about this many a second. */
  readonly dropout: number;
  /** Each head: where it sits, and how far and fast it wanders (a flying head). */
  readonly heads: readonly { readonly head: string; readonly at: number; readonly wander: number; readonly wanderhz: number }[];
}
/** A resonator in a mix on its own (not struck there): its ringing, at a level per channel. */
export interface Resonance {
  readonly cell: string;
  readonly gains: readonly [number, number];
}
/** A read head of a sound tape in a mix: its tap, at a level per channel. */
export interface TapeReturn {
  readonly head: string;
  readonly tape: string;
  readonly gains: readonly [number, number];
}

export interface CompileResult {
  readonly ok: boolean;
  readonly tapes: readonly AudioTape[];
  readonly returns: readonly TapeReturn[];
  readonly resonances: readonly Resonance[];
  readonly cells: ReadonlyMap<string, ResolvedCell>;
  readonly clocks: ReadonlyMap<string, Clock>;
  readonly outputs: readonly Output[];
  /** Node ids of cells written `off`. */
  readonly off: ReadonlySet<string>;
  readonly diagnostics: readonly Diagnostic[];
}

/** Shift of every cell; missing names use the code's shift=. */
export type Shifts = (name: string) => number;
export const codeShifts =
  (result: CompileResult): Shifts =>
  (name) =>
    result.cells.get(name)?.shift ?? 0;

/** Values the environment provides to the code (loop=SAMPLE_RATE, loop=A4). */
export interface Env {
  readonly SAMPLE_RATE: number;
  /** Concert pitch: every note name (C4, C#3, Bb2 …) is tuned from it, equal-tempered. */
  readonly A4: number;
  readonly [name: string]: number;
}
export const DEFAULT_ENV: Env = { SAMPLE_RATE: 48000, A4: 440 };

const LETTERS: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
/** Frequency of a note name (`A4`, `C#3`, `Bb2`, `E-1`) tuned from A4, or null if it isn't one. */
export function noteFrequency(name: string, a4 = 440): number | null {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!m) return null;
  const semis = LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (parseInt(m[3], 10) - 4);
  return a4 * Math.pow(2, semis / 12);
}

/** A parsed piece, compiled: the phases are in compiler/ (index.ts says their order). */
export function compile(parsed: ParseResult, env: Env = DEFAULT_ENV): CompileResult {
  return compileIn(parsed, env);
}

export const compileSource = (source: string, env: Env = DEFAULT_ENV): CompileResult => compile(parse(source), env);

export const pickText = (p: Pick | null) => (!p ? '' : p.kind === 'at' ? `[${p.i}]` : `[${p.from ?? ''}:${p.to ?? ''}${p.step ? `:${p.step}` : ''}]`);

/** Unit indices a pick selects from n units, Python-style; null if it selects nothing (or is out of range). */
export function pickIndices(n: number, pick: Pick | null): number[] | null {
  if (!pick) return Array.from({ length: n }, (_, i) => i);
  if (pick.kind === 'at') {
    const i = pick.i < 0 ? n + pick.i : pick.i;
    return i >= 0 && i < n ? [i] : null;
  }
  // Python's slices, step included: [::-1] runs backwards from the end
  const step = pick.step ?? 1;
  const norm = (x: number) => (x < 0 ? n + x : x);
  const out: number[] = [];
  if (step > 0) {
    const from = pick.from === null ? 0 : Math.max(0, Math.min(n, norm(pick.from)));
    const to = pick.to === null ? n : Math.max(0, Math.min(n, norm(pick.to)));
    for (let i = from; i < to; i += step) out.push(i);
  } else {
    const from = pick.from === null ? n - 1 : Math.max(-1, Math.min(n - 1, norm(pick.from)));
    const to = pick.to === null ? -1 : Math.max(-1, Math.min(n - 1, norm(pick.to)));
    for (let i = from; i > to; i += step) out.push(i);
  }
  return out.length ? out : null;
}

/** Steps taken by a pick from a cell (the whole cell when there's no pick). */
export function pickSteps(c: ResolvedCell, pick: Pick | null): number | null {
  if (!pick) return c.steps;
  const idx = pickIndices(c.units.length, pick);
  return idx ? idx.reduce((a, i) => a + c.unitSteps[i], 0) : null;
}

/** The envelope a map=adsr cell writes (its four values), or null if it isn't one. */
export function adsrOf(c: ResolvedCell): { attack: number; decay: number; sustain: number; release: number } | null {
  if (c.map?.kind !== 'adsr') return null;
  const v = c.units.map((u) => (u.atom.kind === 'note' ? u.atom.value : NaN));
  if (v.length !== 4 || v.some((x) => !(x >= 0))) return null;
  return { attack: v[0], decay: v[1], sustain: Math.min(1, v[2]), release: v[3] };
}

/** Scans (meters) and grids place their steps within the bar; a plain list steps evenly. */
export function isPositional(c: ResolvedCell): boolean {
  return c.root || c.scan !== null;
}

// ======================================================================
// Helix arithmetic — pure functions of a compiled program and the shifts.
// ======================================================================

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
