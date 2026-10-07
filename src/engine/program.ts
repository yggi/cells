/**
 * A compiled program: its types (cells as helices over grids, clocks, outputs, tapes), its
 * constants, and the small readers of a cell (picks, envelopes, positional meters). compile()
 * makes one (compile.ts, compiler/); helix.ts reads it through the shifts. What the cells mean is
 * on the language pages (docs/language/overview.md).
 */
import type { Atom, Binding, Braid, Diagnostic, FreeSpec, Pick, Span } from './ast';

export const ROOT = 'fifths12TET';
/**
 * The most notes a cell's braid may stand for, every &ref spliced in (`&b &a!4000` with `&a 0!4000` is 16 million):
 * more is a compile error. The largest in examples/ is 1,120 (bwv847's &tempo).
 */
export const MAX_EVENTS = 50_000;
/**
 * The most notes a second a played cell may start (`step=1000000` would plan millions for a few seconds): more is a
 * compile error. The busiest in examples/ is 84 a second (dtmf's &dial); audio-rate cells (voices, wave shapes)
 * start no notes and aren't counted.
 */
export const MAX_NOTES_PER_SECOND = 2_000;
/** The fields a label= can hold, {tempo} or {&key:tonic} (filled in by layout/labels.ts); any other is a warning. */
export const LABEL_FIELDS = ['name', 'notes', 'tonic', 'mode', 'steps', 'tempo', 'shift'] as const;
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
  fork: [
    [1, 1, 1],
    [6.27, 0.03, 0.35],
  ],
  bell: [
    [0.5, 1, 0.5],
    [1, 0.8, 1],
    [1.2, 0.6, 0.7],
    [1.5, 0.5, 0.45],
    [2, 0.45, 0.6],
    [2.5, 0.3, 0.35],
    [2.67, 0.28, 0.3],
    [3, 0.22, 0.25],
  ],
  bar: [
    [1, 1, 1],
    [2.756, 0.45, 0.5],
    [5.404, 0.22, 0.3],
    [8.933, 0.12, 0.18],
  ],
  plate: [
    [1, 1, 0.8],
    [1.58, 0.8, 0.7],
    [2.24, 0.7, 0.6],
    [2.92, 0.55, 0.55],
    [3.15, 0.5, 0.5],
    [3.88, 0.4, 0.4],
    [4.47, 0.35, 0.35],
    [5, 0.3, 0.3],
  ],
  box: [
    [1, 1, 1],
    [1.42, 0.7, 0.6],
    [1.91, 0.5, 0.45],
    [2.53, 0.35, 0.3],
  ],
  // a tine (a bar clamped at one end, a kalimba's): its tone, and overtones near 5.9× and 17.6× that die at once
  tine: [
    [1, 1, 1],
    [5.93, 0.12, 0.35],
    [17.6, 0.03, 0.12],
  ],
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
interface PitchTerm {
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
