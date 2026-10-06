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
import type { Atom, Binding, Braid, CellDecl, Diagnostic, FreeSpec, ParseResult, Pick, Span } from './ast';
import { parse } from './parser';
import { DOUGH_SOURCES, MOVING_PARAMS } from './dough-params';
import { even as evenPositions, intervals, mod, scan as scanOf } from '../theory/modes';

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
const PHYSICS = ['level', 'motor', 'mass', 'friction', 'wind', 'belt', 'damping', 'slip', 'varispeed', 'wow', 'beat', 'swing', 'write', 'play', 'length', 'at', 'erase', 'tone', 'drive', 'hiss', 'print', 'printgap', 'dropout', 'wander', 'wanderhz', 'couple', 'coupling', 'excite', 'board', 'scope', 'fold', 'bins', 'channels', 'law', 'anchor', 'sun'];

export interface Clock {
  readonly cell: string;
  /** Steps per second. */
  readonly perSecond: number;
  /** A generated meter (agogic, even): its entries place its steps within the bar. */
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

class Abort extends Error {}
const IMPLICIT: Span = { line: 1, col: 1, len: 1 };

export function compile(parsed: ParseResult, env: Env = DEFAULT_ENV): CompileResult {
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];
  const error = (message: string, span: Span) => diagnostics.push({ severity: 'error', message, span });
  const warn = (message: string, span: Span) => diagnostics.push({ severity: 'warning', message, span });
  // a rate written as a number, or read from the environment
  const unknownEnv = new Set<CellDecl['step']>();
  const rateOf = (st: CellDecl['step']): number | null => {
    if (!st) return null;
    if (st.kind === 'rate') return st.perSecond;
    if (st.kind === 'env') {
      const v = env[st.name] ?? noteFrequency(st.name, env.A4 ?? 440) ?? undefined;
      if (typeof v === 'number' && v > 0) return v;
      if (!unknownEnv.has(st)) error(`Unknown environment value ${st.name} (known: ${Object.keys(env).join(', ')}, and note names like C4, F#3, Bb2)`, st.span);
      unknownEnv.add(st);
      return null;
    }
    return null;
  };

  const decls = new Map<string, CellDecl>();
  for (const c of parsed.cells) {
    if (decls.has(c.name)) error(`&${c.name} is already defined on line ${decls.get(c.name)!.span.line}`, c.span);
    else decls.set(c.name, c);
  }
  const implicitRoot = !decls.has(ROOT);
  // scale(tonic, phase) shorthands: the two tables they stand for, not drawn
  const implicit = new Set<string>();
  for (const d of [...decls.values()]) {
    const m = d.over && /^scale:(-?\d+):(\d+)$/.exec(d.over.name);
    if (!m || decls.has(d.over!.name)) continue;
    const [, tonic, phase] = m;
    const key = `key:${tonic}`;
    const span = d.over!.span;
    const blank = { over: null, off: false, step: null, map: null, stride: null, cycle: null, params: {}, paramSpans: {} };
    if (!decls.has(key)) decls.set(key, { ...blank, name: key, span, shift: parseInt(tonic, 10), braid: { kind: 'blank' } });
    decls.set(d.over!.name, {
      ...blank,
      name: d.over!.name,
      span,
      shift: null,
      over: { name: key, pick: null, shift: 0, span },
      braid: { kind: 'scan', steps: intervals(evenPositions(7, 12, parseInt(phase, 10)), 12), span },
    });
    implicit.add(key).add(d.over!.name);
  }
  // a grid says so: map=edo (the default grid is one). cycle= is only ever its lap / a table's wrap.
  const isRootDecl = (d: CellDecl) =>
    d.over === null && ((d.braid.kind === 'blank' && (d.name === ROOT || d.map?.kind === 'edo')) || d.map?.kind === 'ratios');
  if (implicitRoot)
    decls.set(ROOT, {
      name: ROOT,
      span: IMPLICIT,
      over: null,
      shift: null,
      off: false,
      step: null,
      map: { kind: 'edo', period: 2, span: IMPLICIT },
      stride: null,
      cycle: 12,
      params: {},
      paramSpans: {},
      braid: { kind: 'blank' },
    });
  const rootDecl = decls.get(ROOT)!;
  if (!isRootDecl(rootDecl)) error(`&${ROOT} is the default grid: give it only cycle= and shift=`, rootDecl.span);

  /** Static table for lengths and defaults (no over= → the default grid). */
  const tableOf = (d: CellDecl): string | null => (isRootDecl(d) ? null : (d.over?.name ?? ROOT));

  // ---- over= chains: known, acyclic
  const overOk = new Map<string, boolean>();
  const checkOver = (name: string, seen: string[]): boolean => {
    if (overOk.has(name)) return overOk.get(name)!;
    const d = decls.get(name)!;
    const o = tableOf(d);
    let ok = true;
    if (o !== null) {
      if (!decls.has(o)) {
        error(`Unknown cell &${o}`, d.over!.span);
        ok = false;
      } else if (seen.includes(o)) {
        error(`over= loops: ${[...seen.slice(seen.indexOf(o)), name, o].map((n) => '&' + n).join(' → ')}`, d.over?.span ?? d.span);
        ok = false;
      } else ok = checkOver(o, [...seen, name]);
    }
    overOk.set(name, ok);
    return ok;
  };
  for (const name of decls.keys()) checkOver(name, []);

  // ---- number of entries (as a table)
  /** A grid's steps per period: cycle=, or — a ratios grid — its tones before the period. */
  const gridSteps = (d: CellDecl) =>
    d.map?.kind === 'ratios' && d.braid.kind === 'list' ? Math.max(1, d.braid.tokens.length - 1) : (d.cycle ?? 12);
  const lengthOf = (name: string, guard = 0): number => {
    const d = decls.get(name);
    if (!d || guard > 64) return 12;
    if (tableOf(d) === null) return gridSteps(d);
    const b = d.braid;
    if (b.kind === 'scan') return b.steps.length;
    if (b.kind === 'sin') return b.n;
    if (b.kind === 'list')
      return b.tokens.reduce((s, t) => s + (t.atom.kind === 'note' ? 1 : t.atom.kind === 'chord' ? t.atom.notes.length : 0), 0);
    // blank: as long as the table below (cycle= here is only where its turning wraps)
    return lengthOf(tableOf(d)!, guard + 1);
  };

  // ---- braids as units
  const unitsOf = (d: CellDecl): Unit[] => {
    const plain = (atom: Atom): Unit => ({ atom, repeat: 1, subdivide: 1, elongate: 1 });
    const note = (value: number): Unit => plain({ kind: 'note', value, alter: 0 });
    const b = d.braid;
    const o = tableOf(d);
    if (o === null) return Array.from({ length: gridSteps(d) }, (_, i) => note(i));
    if (b.kind === 'list')
      return b.tokens.map(({ atom, repeat, subdivide, elongate, chance }) => ({ atom, repeat, subdivide, elongate, ...(chance !== undefined ? { chance } : {}) }));
    if (b.kind === 'scan') return scanOf(b.steps).positions.map(note);
    if (b.kind === 'sin') return Array.from({ length: b.n }, (_, i) => note(+Math.sin((2 * Math.PI * i) / b.n).toFixed(6)));
    // blank: the identity of the table below — entry i is index i
    return Array.from({ length: lengthOf(o) }, (_, i) => note(i));
  };

  // ---- &refs (time structure), with cycle detection
  const cells = new Map<string, ResolvedCell>();
  const visiting: string[] = [];
  const resolve = (name: string, at: Span): ResolvedCell => {
    const done = cells.get(name);
    if (done) return done;
    const d = decls.get(name)!;
    if (visiting.includes(name)) {
      error(`Circular reference: ${[...visiting.slice(visiting.indexOf(name)), name].map((n) => '&' + n).join(' → ')}`, at);
      throw new Abort();
    }
    visiting.push(name);
    const units = unitsOf(d);
    const children = new Map<string, number>();
    const unitSteps: number[] = [];
    const toks = d.braid.kind === 'list' ? d.braid.tokens : [];
    units.forEach((u, i) => {
      let unit = 1;
      if (u.atom.kind === 'ref') {
        const ref = u.atom.name;
        const span = toks[i]?.span ?? d.span;
        if (!decls.has(ref)) {
          error(`Unknown cell &${ref}`, span);
          throw new Abort();
        }
        const child = resolve(ref, span);
        const picked = pickSteps(child, u.atom.pick);
        if (picked === null) {
          error(`&${ref}${pickText(u.atom.pick)} picks nothing — &${ref} has ${child.units.length} steps`, span);
          throw new Abort();
        }
        unit = picked;
        children.set(ref, (children.get(ref) ?? 0) + u.repeat * u.subdivide);
      }
      unitSteps.push(unit * u.elongate * u.repeat);
    });
    const steps = unitSteps.reduce((a, b) => a + b, 0);
    visiting.pop();
    const o = tableOf(d);
    const b = d.braid;
    const cell: ResolvedCell = {
      name,
      span: d.span,
      root: o === null,
      implicit: (name === ROOT && implicitRoot) || implicit.has(name),
      over: o === null ? null : (d.over?.name ?? null),
      overShift: d.over?.shift ?? 0,
      context: o ?? name,
      cycle: o === null ? gridSteps(d) : lengthOf(name),
      wrap: d.cycle ?? null,
      lambda: d.lambda ?? null,
      frees: d.frees ?? [],
      show: d.show ?? null,
      laps: d.laps ?? null,
      loops: !!d.step?.whole,
      chance: d.chance ?? 0.5,
      seed: d.seed ?? 0,
      size: d.size ?? 1,
      tags: (d.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      about: (d.about ?? []).map((r) => r.name),
      beat: typeof d.params.beat === 'number' ? d.params.beat : ((d.braid as { perBeat?: number }).perBeat ?? 1),
      leveled: (d.braid as { perBeat?: number }).perBeat !== undefined,
      label: d.label ?? null,
      note:
        !!(d.label || d.title) &&
        d.braid.kind === 'blank' &&
        d.over === null &&
        d.step === null &&
        d.map === null &&
        d.cycle === null &&
        d.shift === null &&
        d.stride === null &&
        !d.off &&
        !(d.frees?.length) &&
        !d.env &&
        !d.pitch &&
        Object.keys(d.params).length === 0,
      env: d.env?.name ?? null,
      pitch: d.pitch?.name ?? null,
      braid: o === null ? 'blank' : b.kind,
      units,
      scan: b.kind === 'scan' ? { lap: scanOf(b.steps).lap, steps: b.steps } : null,
      shift: d.shift ?? 0,
      off: d.off,
      children,
      steps,
      unitSteps,
      hasValues: units.some((u) => u.atom.kind === 'note' || u.atom.kind === 'chord'),
      step:
        d.step?.kind === 'driven'
          ? {
              driver: d.step.driver.name,
              cycle: d.step.cycle,
              whole: d.step.whole,
              label: (d.step.whole ? 'loop ' : '') + (d.step.cycle ? '⟳' : '') + d.step.label,
            }
          : null,
      map: d.map
        ? d.map.kind === 'table'
          ? { kind: 'table', table: d.map.table.name }
          : d.map.kind === 'edo'
            ? { kind: 'edo', period: d.map.period }
            : d.map.kind === 'ratios'
              ? { kind: 'ratios', ratios: d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [] }
              : { kind: d.map.kind }
        : null,
      // a mix: one chord of sounds — or, on a sound card, its channels written in place (all their voices)
      mix:
        units.length > 0 && units.every((u) => u.atom.kind === 'mix') && (units.length === 1 || d.map?.kind === 'sample')
          ? units.flatMap((u) => (u.atom.kind === 'mix' ? u.atom.bindings : []))
          : null,
      sink: d.map?.kind === 'sample',
      clock: null,
      rate: 0,
      stride: d.stride ?? 1,
      params: d.params,
      paramCells: Object.fromEntries(Object.entries(d.paramCells ?? {}).map(([k, v]) => [k, { range: v.range, factors: v.factors.map((f) => f.name) }])),
      // (level= is the sound card's own; motor= mass= friction= wind= a clock's physics: none makes a voice)
      voice: Object.keys(d.params).some((k) => !PHYSICS.includes(k)),
      freq: d.step?.kind === 'rate' || d.step?.kind === 'env' ? (d.step.whole ? (rateOf(d.step) ?? DEFAULT_FREQ) : (rateOf(d.step) ?? DEFAULT_FREQ) / Math.max(1, steps)) : DEFAULT_FREQ,
      kit: false,
    };
    cells.set(name, cell);
    return cell;
  };
  for (const [name, d] of decls) {
    if (!overOk.get(name)) continue;
    try {
      resolve(name, d.span);
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
      visiting.length = 0;
    }
  }

  for (const [name, d] of decls) {
    const cell = cells.get(name);
    if (!cell || cell.root) continue;
    const o = cell.over ?? ROOT;
    if (!cells.get(o)?.root && d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'note' && !Number.isInteger(t.atom.value)))
      warn(`&${o} is a table, so decimal indexes are rounded down`, d.span);
  }

  // ---- voices: the signal of every out binding (last factor), and cells with sound parameters.
  // A cell made only of &refs to voices is a kit: numbers pick a voice.
  const hasParams = (n: string) => Object.keys(decls.get(n)?.params ?? {}).length > 0;
  const isKit = (c: ResolvedCell) => c.units.length > 0 && c.units.every((u) => u.atom.kind === 'ref' && hasParams(u.atom.name));
  for (const c of [...cells.values()]) if (!c.voice && !c.root && isKit(c)) cells.set(c.name, { ...c, kit: true });
  // ---- the sound card: cells with map=sample; their entries are channels (mix cells)
  const sinks = [...cells.values()].filter((c) => c.sink);
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (c && !c.mix && c.units.some((u) => u.atom.kind === 'mix'))
      error(c.sink ? `A sound card's channels are all mixes: [left …] [right …], or &left &right` : `A mix is one chord of sounds: &${name} [&a * &v, &b * &w]`, d.span);
  }
  /** A selector: a cell reading a table whose entries are mixes (parts): its numbers pick which play. */
  const partsOf = (c: ResolvedCell | undefined): string[] | null => {
    const t = c?.over ? cells.get(c.over) : undefined;
    if (!t || !t.units.length) return null;
    const names = t.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : null));
    return names.every((n) => n !== null && cells.get(n)?.mix && !cells.get(n)?.sink) ? (names as string[]) : null;
  };
  type Sel = { cell: string; entry: number; part: string };
  type Gathered = {
    select: Sel[];
    b: Binding;
    span: Span;
    gains: [number, number];
    via: Set<string>;
    parts: { mix: string; sink: string; gains: [number, number] }[];
    through: Set<string>;
    /** Played, but not heard: a mix that only excites a resonator or feeds a tape (a send). */
    silent?: boolean;
  };
  /**
   * A mix used like a voice (an instrument: `[&(map=adsr …) * &saw]`) distributes:
   * the pitches, volumes and gain acting on it act on each of its voices.
   */
  const expand = (b: Binding, through: readonly string[] = [], select: readonly Sel[] = []): { b: Binding; through: readonly string[]; select: readonly Sel[] }[] => {
    const v = cells.get(b.voice.name);
    // a selector: each of its parts, as if in the mix — sounding when picked
    const parts = partsOf(v);
    if (v && parts) {
      if (select.some((x) => x.cell === v.name) || select.length > 8) {
        error(`&${v.name} selects itself`, v.span);
        return [];
      }
      return parts.flatMap((part, entry) =>
        cells.get(part)!.mix!.flatMap((inner) =>
          expand({ voice: inner.voice, pitches: [...b.pitches, ...inner.pitches], offset: b.offset + inner.offset, gain: b.gain * inner.gain }, through, [...select, { cell: v.name, entry, part }]),
        ),
      );
    }
    if (!v?.mix || v.sink) return [{ b, through, select }];
    if (through.includes(v.name) || through.length > 16) {
      error(`&${v.name} plays itself through its mixes`, v.span);
      return [];
    }
    return v.mix.flatMap((inner) =>
      expand({ voice: inner.voice, pitches: [...b.pitches, ...inner.pitches], offset: b.offset + inner.offset, gain: b.gain * inner.gain }, [...through, v.name], select),
    );
  };
  const gathered = new Map<string, Gathered>();
  const termKey = (b: Binding, select: readonly Sel[] = []) =>
    [b.voice.name, b.offset, ...b.pitches.map((t) => `${t.sign}${t.ref.name}${JSON.stringify(t.ref.pick)}${t.ref.shift}`), ...select.map((x) => `@${x.cell}:${x.entry}`)].join('|');
  for (const sink of sinks) {
    const d = decls.get(sink.name)!;
    const channels = sink.units;
    if (channels.length === 0 || channels.length > 2) {
      error(`The sound card takes one channel (mono) or two (left, right): &${sink.name} map=sample &left &right`, d.span);
      continue;
    }
    channels.forEach((u, ch) => {
      // a channel is a mix cell (&left), or a mix written in place on the sound card itself
      const inPlace = u.atom.kind === 'mix' ? u.atom.bindings : null;
      const mix = u.atom.kind === 'ref' ? cells.get(u.atom.name) : inPlace ? sink : undefined;
      // (a selector as a channel: its parts, as they're picked)
      const bindings =
        inPlace ??
        (u.atom.kind === 'ref' && mix?.mix && !mix.sink
          ? mix.mix
          : u.atom.kind === 'ref' && partsOf(mix)
            ? [{ voice: { name: u.atom.name, pick: null, shift: 0, span: mix!.span }, pitches: [], offset: 0, gain: 1 }]
            : null);
      if (!mix || !bindings) {
        error(`A channel of the sound card is a mix: &mix, or [&theme * &lead] written in place`, d.span);
        return;
      }
      for (const { b, through, select } of bindings.flatMap((x) => expand(x))) {
        const key = termKey(b, select);
        let g = gathered.get(key);
        if (!g) gathered.set(key, (g = { b, span: mix.span, gains: [0, 0], via: new Set(), parts: [], through: new Set(), select: [...select] }));
        for (const t of through) g.through.add(t);
        // mono: one channel feeds both sides
        const part: [number, number] = channels.length === 1 ? [b.gain, b.gain] : ch === 0 ? [b.gain, 0] : [0, b.gain];
        g.gains[0] += part[0];
        g.gains[1] += part[1];
        g.parts.push({ mix: mix.name, sink: sink.name, gains: part });
        g.via.add(mix.name).add(sink.name);
        // (picked by a selector: the selector, its table of parts and the part are on its way too)
        for (const x of select) g.via.add(x.cell).add(cells.get(x.cell)!.over!).add(x.part);
      }
    });
  }
  // a stream read through a kit (&drums over=&kit) is a signal: the kit is its voice,
  // the stream the term that starts notes (its numbers pick the drum)
  const throughKit = (name: string) => {
    const t = decls.get(name)?.over?.name;
    return t && cells.get(t)?.kit ? t : null;
  };
  // sends: a mix a resonator is excited by (excite=), or a sound tape records (write=), that no sound
  // card plays — its notes still play (into what it feeds), but it isn't heard itself
  {
    const heard = new Set([...gathered.values()].flatMap((g) => g.parts.map((p) => p.mix)));
    const sends = new Set<string>();
    for (const d of decls.values())
      for (const k of ['excite', 'write'] as const) {
        const m = d.params[k];
        if (typeof m === 'string' && cells.get(m)?.mix && !heard.has(m)) sends.add(m);
      }
    for (const name of sends) {
      const mix = cells.get(name)!;
      for (const { b, through, select } of mix.mix!.flatMap((x) => expand(x))) {
        // (a tape head in it drives what it feeds directly — it isn't a note to play)
        if (typeof cells.get(b.voice.name)?.params.play === 'string') continue;
        const key = 'send:' + termKey(b, select);
        if (gathered.has(key) || [...gathered.values()].some((g) => termKey(g.b, g.select) === termKey(b, select))) continue;
        gathered.set(key, { b, span: mix.span, gains: [b.gain, b.gain], via: new Set([name]), parts: [], through: new Set(through), select: [...select], silent: true });
      }
    }
  }
  const bindings = [...gathered.values()].map((g) => {
    const kit = throughKit(g.b.voice.name);
    return kit
      ? { ...g, b: { ...g.b, voice: { name: kit, pick: null, shift: 0, span: g.b.voice.span }, pitches: [{ ref: g.b.voice, sign: 1 as const }, ...g.b.pitches] } }
      : g;
  });
  // a read head of a sound tape (write= a mix) is sound already: in a mix it's a return, not a voice
  const soundHead = (name: string) => {
    const h = cells.get(name);
    const t = h && typeof h.params.play === 'string' ? cells.get(h.params.play) : undefined;
    const src = t && typeof t.params.write === 'string' ? cells.get(t.params.write) : undefined;
    return !!src?.mix && !src.sink;
  };
  for (const { b } of bindings) {
    const v = cells.get(b.voice.name);
    if (v && !v.root && !v.kit && !soundHead(v.name) && !b.pitches.some((t) => t.ref.name === v.name)) cells.set(v.name, { ...v, voice: true });
  }
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (!c) continue;
    if (c.map?.kind === 'table' && !decls.has(c.map.table)) error(`Unknown cell &${c.map.table}`, d.map!.span);
    if (d.about) {
      if (!c.note) error('about= belongs on a note: a cell with a label= (or title=) and nothing else', d.about[0].span);
      for (const r of d.about) if (!decls.has(r.name)) error(`Unknown cell &${r.name}`, r.span);
    }
    if (!c.voice) continue;
    const src = d.params.s;
    if (src !== undefined && !(String(src) in DOUGH_SOURCES))
      error(`Unknown sound '${src}' (${Object.keys(DOUGH_SOURCES).join(', ')})`, d.paramSpans.s ?? d.span);
    if (src !== undefined && d.braid.kind !== 'blank') warn(`s=${src} plays a built-in waveform; the braid is ignored`, d.paramSpans.s);
    for (const [k, v] of Object.entries(d.params)) if (!['s', 'fm', 'write', 'play', 'body', 'couple', 'excite', 'board', 'scope', 'channels', 'law', 'sun'].includes(k) && typeof v !== 'number') error(`${k}= takes a number`, d.paramSpans[k]);
    if (d.step?.kind === 'driven') error(`A voice moves at a rate — its pitch, like loop=C4`, d.step.span);
    else if (d.step && !d.step.whole) error(`A voice's pitch is loop= (one turn of its braid per cycle): loop=C4`, d.step.span);
  }

  // ---- clocks: non-voice cells moved at a rate
  const clocks = new Map<string, Clock>();
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (!c || c.voice || c.kit || (d.step?.kind !== 'rate' && d.step?.kind !== 'env')) continue;
    const r = rateOf(d.step);
    if (r === null) continue;
    // the bpm counts beats: beat= steps a beat (given, or from meter(…)) — so a meter can step in
    // sixteenths and still read 96 for its quarter notes
    const beat = typeof d.params.beat === 'number' ? d.params.beat : ((d.braid as { perBeat?: number }).perBeat ?? 1);
    const perSecond = (d.step.whole ? r * Math.max(1, c.steps) : r) * (d.step.whole ? 1 : beat);
    const swing = typeof d.params.swing === 'number' && d.params.swing !== 0.5 ? d.params.swing : undefined;
    clocks.set(name, { cell: name, perSecond, positional: isPositional(c), ...(swing !== undefined ? { swing } : {}) });
  }

  // ---- step= / loop= chains: every cell's steps per step of its clock
  // (a driven meter — a scan that drives other cells, like swung eighths — becomes a clock of its own:
  //  its rate from its driver's, its positions bending its own lap)
  const drivers = new Set([...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : [])));
  const timing = new Map<string, { clock: string; rate: number } | null>();
  const stepping: string[] = [];
  const timeOf = (name: string): { clock: string; rate: number } | null => {
    if (timing.has(name)) return timing.get(name)!;
    if (clocks.has(name)) {
      timing.set(name, { clock: name, rate: 1 });
      return timing.get(name)!;
    }
    const st = decls.get(name)?.step;
    if (!st || st.kind !== 'driven' || cells.get(name)?.voice) {
      timing.set(name, null);
      return null;
    }
    const drv = st.driver.name;
    const what = st.whole ? 'loop=' : 'step=';
    let result: { clock: string; rate: number } | null = null;
    if (!decls.has(drv)) error(`Unknown cell &${drv}`, st.driver.span);
    else if (stepping.includes(drv) || drv === name)
      error(`${what} loops back: ${[...stepping.slice(stepping.indexOf(drv)), name, drv].map((n) => '&' + n).join(' → ')}`, st.span);
    else if (cells.get(drv)?.voice) error(`&${drv} is a voice: it moves at audio rate`, st.driver.span);
    else {
      stepping.push(name);
      const d = timeOf(drv);
      stepping.pop();
      const lap = cells.get(drv)?.steps ?? 0;
      const own = cells.get(name)?.steps ?? 0;
      if (!d) warn(`&${drv} never moves, so &${name} stands still — give &${drv} a rate (step=84bpm) or ${what}&cell`, st.driver.span);
      else if (st.cycle && lap === 0) error(`&${drv} has no cycle to count`, st.driver.span);
      else if (st.whole && own === 0) error(`&${name} has no steps to loop`, st.span);
      else {
        result = { clock: d.clock, rate: (d.rate * st.ratio * (st.whole ? own : 1)) / (st.cycle ? lap : 1) };
        const c = cells.get(name);
        if (c && c.scan && drivers.has(name) && !st.whole) {
          clocks.set(name, { cell: name, perSecond: clocks.get(d.clock)!.perSecond * result.rate, positional: true });
          result = { clock: name, rate: 1 };
        }
        // a belt: the cell follows its driver through a spring — a clock of its own, to stretch and slip
        else if (c && typeof decls.get(name)?.params.belt === 'number' && !st.whole) {
          clocks.set(name, { cell: name, perSecond: clocks.get(d.clock)!.perSecond * result.rate, positional: false, belt: { driver: d.clock, rate: result.rate } });
          result = { clock: name, rate: 1 };
        }
      }
    }
    timing.set(name, result);
    return result;
  };
  for (const c of [...cells.values()]) {
    const t = timeOf(c.name);
    if (t) cells.set(c.name, { ...c, clock: t.clock, rate: t.rate });
  }
  // times given as a clock (delaytime=&bar/2): one step of it, in seconds, at the clock's tempo
  for (const d of decls.values())
    for (const [key, st] of Object.entries(d.paramClocks ?? {})) {
      if (st.kind !== 'driven') continue;
      const drv = timeOf(st.driver.name);
      const c = cells.get(d.name);
      if (!drv || !c) {
        error(`${key}=&${st.driver.name}: that cell keeps no time`, st.span);
        continue;
      }
      const perSecond = clocks.get(drv.clock)!.perSecond * drv.rate * st.ratio;
      cells.set(d.name, { ...c, params: { ...c.params, [key]: +(1 / perSecond).toFixed(6) } });
    }
  // resonators: body= one of the known bodies; couple= another resonator; excite= a mix
  for (const c of cells.values()) {
    const span = (k: string) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name)!.span;
    if (typeof c.params.body === 'string' && !(c.params.body in BODIES)) error(`body=${c.params.body}: one of ${Object.keys(BODIES).join(', ')}`, span('body'));
    if (typeof c.params.board === 'string' && c.params.board !== 'none' && !(c.params.board in BODIES)) error(`board=${c.params.board}: none, or one of ${Object.keys(BODIES).join(', ')}`, span('board'));
    if (typeof c.params.couple === 'string') {
      const o = cells.get(c.params.couple);
      if (!o) error(`Unknown cell &${c.params.couple}`, span('couple'));
      else if (typeof o.params.body !== 'string') error(`couple=&${o.name}: it couples to another resonator (a cell with body=)`, span('couple'));
    }
    if (typeof c.params.excite === 'string' && !cells.get(c.params.excite)?.mix) error(`excite=&${c.params.excite}: a resonator is driven by sound — a mix`, span('excite'));
  }
  // tapes: write= names what it records (not a voice); play= names a tape (a cell with write=)
  for (const c of cells.values()) {
    const span = (k: string) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name)!.span;
    if (typeof c.params.write === 'string') {
      const w = cells.get(c.params.write);
      if (!w) error(`Unknown cell &${c.params.write}`, span('write'));
      else if (w.voice) error(`write=&${w.name}: a tape records what plays — a melody, not a voice`, span('write'));
    }
    if (typeof c.params.play === 'string') {
      const t = cells.get(c.params.play);
      if (!t) error(`Unknown cell &${c.params.play}`, span('play'));
      else if (typeof t.params.write !== 'string') error(`play=&${t.name}: a read head plays a tape — a cell with write= (what it records)`, span('play'));
    }
  }
  // FM: fm= names a voice; a chain of modulators may not come back round to where it began
  for (const c of cells.values()) {
    const first = c.params.fm;
    if (typeof first !== 'string') continue;
    const span = decls.get(c.name)?.paramSpans?.fm ?? decls.get(c.name)!.span;
    const m = cells.get(first);
    if (!m) error(`Unknown cell &${first}`, span);
    else if (!m.voice) error(`fm=&${first}: a modulator is a voice (s=sine ratio=…)`, span);
    else {
      const seen = new Set([c.name]);
      for (let at: string | undefined = first; at; at = typeof cells.get(at)?.params.fm === 'string' ? (cells.get(at)!.params.fm as string) : undefined) {
        if (seen.has(at)) {
          error(`fm=&${first}: the modulators come back round to &${at} — FM chains can't loop`, span);
          break;
        }
        seen.add(at);
      }
    }
  }
  // parameters that move: only those that can, through cells that exist; one envelope at most
  for (const d of decls.values())
    for (const [key, pc] of Object.entries(d.paramCells ?? {})) {
      if (!MOVING_PARAMS.has(key)) error(`${key}= can't move: it takes a number (these can: ${[...MOVING_PARAMS].join(' ')})`, pc.span);
      if (pc.range && !(pc.range[0] >= 0 && pc.range[1] >= 0)) error(`${key}=: a range of positive values, low..high`, pc.span);
      let envs = 0;
      for (const f of pc.factors) {
        const fc = cells.get(f.name);
        if (!fc) error(`Unknown cell &${f.name}`, f.span);
        else if (fc.map?.kind === 'adsr') envs++;
      }
      if (envs > 1) error(`${key}=: one envelope (map=adsr) at most — the other factors scale it`, pc.span);
      if (envs && !pc.range) error(`${key}=&env: an envelope runs 0 to 1 — give it a range: ${key}=200..3000 * &env`, pc.span);
    }
  for (const d of decls.values())
    if (d.stride !== null && d.step?.kind !== 'driven') warn(`stride= only matters with step=&cell`, d.span);
  for (const d of decls.values()) {
    for (const [key, r] of [['env', d.env], ['pitch', d.pitch]] as const) {
      if (!r) continue;
      const t = cells.get(r.name);
      if (!t) error(`Unknown cell &${r.name}`, r.span);
      else if (key === 'env' && t.map?.kind !== 'adsr' && t.map?.kind !== 'amp' && t.map?.kind !== 'lin' && t.map?.kind !== 'db')
        error(`env= takes a volume: a cell with map=adsr (an envelope), map=amp, map=db or map=lin`, r.span);
      else if (key === 'pitch' && (t.map?.kind === 'adsr' || t.map?.kind === 'amp' || t.map?.kind === 'db'))
        error(`pitch= takes a pitch (a vibrato, map=lin to glide), not a volume`, r.span);
    }
  }
  for (const d of decls.values()) {
    if (d.map?.kind !== 'adsr') continue;
    const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
    if (vals.length !== 4 || vals.some((v) => !(v >= 0)) || vals[2] > 1)
      error(`map=adsr takes four numbers: attack decay sustain release — seconds, and sustain a level 0…1 (map=adsr .01 .3 .5 .4)`, d.map.span);
  }
  for (const d of decls.values()) {
    if (d.map?.kind !== 'ratios') continue;
    const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
    if (d.over !== null) error(`A grid (map=ratios) reads nothing: its braid is its tones`, d.map.span);
    else if (vals.length < 2 || vals.some((v, i) => !(v > 0) || (i > 0 && !(v > vals[i - 1]))))
      error(`map=ratios lists one period's tones as rising ratios, the last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`, d.map.span);
  }
  for (const d of decls.values())
    if (d.map?.kind === 'edo' && (d.over !== null || d.braid.kind !== 'blank'))
      error(`A grid (map=edo, map=ed(r)) reads nothing and has no braid: &${d.name} cycle=19 map=edo`, d.map.span);

  // ---- outputs: one per voice binding. Articulation (rule 2): the step= term
  // starts notes; loop= terms bend them; terms that don't move hold (transpose).
  const outputs: Output[] = [];
  const returns: TapeReturn[] = [];
  const resonances: Resonance[] = [];
  const articulates = (c: ResolvedCell) => !!c.clock && decls.get(c.name)?.step?.whole === false;
  for (const { b, span, gains, via, parts, through, select, silent } of bindings) {
    const known = (r: { name: string; span: Span }) => {
      if (decls.has(r.name)) return true;
      error(`Unknown cell &${r.name}`, r.span);
      return false;
    };
    if (![b.voice, ...b.pitches.map((t) => t.ref)].every(known)) continue;
    // a sound tape's read head in a mix: its tap returns to the sound card at these levels
    if (soundHead(b.voice.name) && b.pitches.length === 0) {
      returns.push({ head: b.voice.name, tape: cells.get(b.voice.name)!.params.play as string, gains: [gains[0], gains[1]] });
      continue;
    }
    const voice = cells.get(b.voice.name);
    if (!voice) continue;
    // a resonator alone in a mix: heard ringing (from a hand, a neighbour, what drives it)
    if (typeof voice.params.body === 'string' && b.pitches.length === 0) {
      resonances.push({ cell: voice.name, gains: [gains[0], gains[1]] });
      continue;
    }
    if (voice.kit && !b.pitches.some((t) => decls.get(t.ref.name)?.over?.name === voice.name)) {
      error(`A kit is a table of voices: read the pattern through it, &drums over=&${voice.name}, and mix &drums`, b.voice.span);
      continue;
    }
    if (voice.root) {
      error(`&${voice.name} is a grid, not a voice`, b.voice.span);
      continue;
    }
    if (b.voice.pick || b.voice.shift) {
      error(`Pick or shift the melody, not the voice: &theme[0] * &${voice.name}`, b.voice.span);
      continue;
    }
    if (decls.get(voice.name)?.step?.kind === 'driven') {
      error(`&${voice.name} moves with step=&… — it reads as a melody, not a voice. In a product the voice comes last: &${voice.name} * &voice`, b.voice.span);
      continue;
    }
    if (!voice.params.s && voice.freq < 20)
      warn(`&${voice.name} loops at ${+voice.freq.toFixed(2)} Hz, below hearing — is it a pitch? Pitches go left of the voice: (&theme + &${voice.name}) * &lead`, b.voice.span);
    // the voice's own env= (a volume) and pitch= (added, as in a pitch sum) join every product it's in
    const own = [
      ...(voice.env ? [{ ref: decls.get(voice.name)!.env!, sign: 1 as const, inSum: false }] : []),
      ...(voice.pitch ? [{ ref: decls.get(voice.name)!.pitch!, sign: 1 as const, inSum: true }] : []),
    ];
    const moved = b.pitches.find((t) => t.ref.transpose);
    if (moved) error(`&${moved.ref.name}^${moved.ref.transpose}: transposing (^) is for braids — in a mix, add pitch: &${moved.ref.name} + ${moved.ref.transpose}`, moved.ref.span);
    // a read head plays its tape: what the tape's write head recorded, retimed through the tape
    const tapeOf = new Map<unknown, NonNullable<Output['tape']>>();
    const terms = [...b.pitches, ...own]
      .map((t) => {
        let c = cells.get(t.ref.name)!;
        const tp = c && typeof c.params.play === 'string' ? cells.get(c.params.play) : undefined;
        const src = tp && typeof tp.params.write === 'string' ? cells.get(tp.params.write) : undefined;
        if (c && tp && src) {
          tapeOf.set(t, {
            head: c.name,
            tape: tp.name,
            at: typeof c.params.at === 'number' ? c.params.at : 0,
            length: typeof tp.params.length === 'number' ? tp.params.length : 0,
            erase: typeof tp.params.erase === 'number' ? Math.min(1, Math.max(0, tp.params.erase)) : 1,
          });
          c = src;
        }
        return { t, c };
      })
      .filter((x) => x.c);
    const voiced = terms.filter((x) => x.c.voice);
    if (voiced.length) {
      error(`&${voiced[0].c.name} is a voice, not a pitch`, voiced[0].t.ref.span);
      continue;
    }
    // volume streams: map=amp cells in the product are levels, not pitches
    // amp: a volume; lin: a volume as a bare factor, a pitch inside a pitch sum (a smooth vibrato)
    const isEnvelope = (x: (typeof terms)[number]) => x.c.map?.kind === 'adsr';
    const isLevel = (x: (typeof terms)[number]) => x.c.map?.kind === 'amp' || x.c.map?.kind === 'db' || (x.c.map?.kind === 'lin' && !x.t.inSum);
    const envelopes = terms.filter(isEnvelope);
    const pitches = terms.filter((x) => !isLevel(x) && !isEnvelope(x));
    const levels = terms.filter((x) => isLevel(x));
    if (envelopes.length > 1) {
      error(`One envelope per note: &${envelopes[0].c.name} and &${envelopes[1].c.name} both shape &${voice.name}`, envelopes[1].t.ref.span);
      continue;
    }
    const envBad = envelopes.find((x) => x.t.inSum || x.t.sign < 0);
    if (envBad) {
      error(`&${envBad.c.name} is an envelope (map=adsr): a volume, it multiplies — keep it out of pitch sums`, envBad.t.ref.span);
      continue;
    }
    const env = envelopes[0] ? adsrOf(envelopes[0].c) : null;
    const negLevel = levels.find((x) => x.t.sign < 0);
    if (negLevel) {
      error(`&${negLevel.c.name} is a volume (map=amp): it multiplies, it can't be subtracted`, negLevel.t.ref.span);
      continue;
    }
    // notes start on a pitch's steps; with none, on a volume stream's (a gate)
    let lead = pitches.filter((x) => articulates(x.c));
    const gate = lead.length === 0;
    if (gate) lead = levels.filter((x) => articulates(x.c));
    if (lead.length === 0) {
      error(
        terms.length
          ? `Nothing starts notes on &${voice.name}: give a pitch or a volume (map=amp) step= timing (step=&bar); loop= terms only bend`
          : `&${voice.name} has nothing to play: &melody * &${voice.name}`,
        span,
      );
      continue;
    }
    if (lead.length > 1) {
      error(`Both &${lead[0].c.name} and &${lead[1].c.name} would start notes on &${voice.name} — make one loop= (it then bends or shapes them)`, lead[1].t.ref.span);
      continue;
    }
    const { t, c: cell } = lead[0];
    const badPick = terms.find((x) => pickSteps(x.c, x.t.ref.pick) === null);
    if (badPick) {
      error(`&${badPick.c.name}${pickText(badPick.t.ref.pick)} picks nothing — &${badPick.c.name} has ${badPick.c.units.length} steps`, badPick.t.ref.span);
      continue;
    }
    if (pickSteps(cell, t.ref.pick) === 0) {
      error(`&${cell.name} has no steps to play`, t.ref.span);
      continue;
    }
    outputs.push({
      id: `${voice.name}:${cell.name}:${t.ref.span.line}:${t.ref.span.col}${select.map((x) => `@${x.cell}:${x.entry}`).join('')}`,
      voice: voice.name,
      kit: voice.kit,
      cell: cell.name,
      pick: t.ref.pick,
      shift: t.ref.shift,
      sign: t.sign,
      gate,
      mods: pitches.filter((x) => x !== lead[0]).map((x) => ({ cell: x.c.name, pick: x.t.ref.pick, shift: x.t.ref.shift, sign: x.t.sign })),
      levels: levels.filter((x) => x !== lead[0]).map((x) => ({ cell: x.c.name, pick: x.t.ref.pick, shift: x.t.ref.shift, sign: x.t.sign })),
      offset: b.offset,
      gains: [gains[0], gains[1]],
      parts,
      select,
      ...(tapeOf.has(t) ? { tape: tapeOf.get(t)! } : {}),
      ...(silent ? { silent: true } : {}),
      through: [...through],
      envelope: env,
      envelopeCell: envelopes[0]?.c.name ?? null,
      via: [...via],
      span,
    });
  }
  if (sinks.length === 0 && parsed.cells.length > 0)
    warn('Nothing plays yet — add a mix and the sound card: &mix [&melody * &voice] and &out loop=44k map=sample &mix &mix', IMPLICIT);

  // ---- display context: a cell without over= is shown through the table of its first player
  const ctx = new Map<string, string>();
  for (const c of cells.values()) if (c.root || c.over) ctx.set(c.name, c.root ? c.name : c.over!);
  for (let changed = true, guard = 0; changed && guard < 64; guard++) {
    changed = false;
    for (const c of cells.values()) {
      const mine = ctx.get(c.name);
      if (!mine) continue;
      for (const child of c.children.keys()) {
        if (!ctx.has(child)) {
          ctx.set(child, mine);
          changed = true;
        }
      }
    }
  }
  for (const c of cells.values()) cells.set(c.name, { ...c, context: ctx.get(c.name) ?? ROOT });
  // resonators: their exciters — values are shifts; a cell referred to brings its own settings
  for (const c of cells.values()) {
    if (typeof c.params.body !== 'string') continue;
    const exciters: Exciter[] = [];
    for (const u of c.units) {
      if (u.atom.kind === 'note') exciters.push({ shift: u.atom.value + u.atom.alter, params: {} });
      else if (u.atom.kind === 'ref') {
        const r = cells.get(u.atom.name);
        if (r) for (const v of r.units) if (v.atom.kind === 'note') exciters.push({ shift: v.atom.value + v.atom.alter, params: r.params });
      } else if (u.atom.kind === 'chord') for (const [j, v] of u.atom.notes.entries()) exciters.push({ shift: v + u.atom.alters[j], params: {} });
    }
    cells.set(c.name, { ...c, exciters: exciters.length ? exciters : Array.from({ length: 12 }, (_, i) => ({ shift: i, params: {} })) });
  }

  const ok = !diagnostics.some((x) => x.severity === 'error');
  diagnostics.sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
  const off = new Set([...cells.values()].filter((c) => c.off).map((c) => `cell:${c.name}`));
  // sound tapes: a tape whose write= is a mix — its loop, its colour, its heads
  const num = (c: ResolvedCell, k: string, d: number) => (typeof c.params[k] === 'number' ? (c.params[k] as number) : d);
  const tapes: AudioTape[] = [...cells.values()]
    .filter((c) => typeof c.params.write === 'string' && !!cells.get(c.params.write as string)?.mix)
    .map((c) => ({
      name: c.name,
      source: c.params.write as string,
      length: num(c, 'length', 0),
      erase: Math.min(1, Math.max(0, num(c, 'erase', 1))),
      tone: num(c, 'tone', 7000),
      drive: num(c, 'drive', 0.15),
      hiss: num(c, 'hiss', 0),
      print: num(c, 'print', 0),
      printgap: num(c, 'printgap', 0.6),
      dropout: num(c, 'dropout', 0),
      heads: [...cells.values()]
        .filter((h) => h.params.play === c.name)
        .map((h) => ({ head: h.name, at: num(h, 'at', 0), wander: num(h, 'wander', 0), wanderhz: num(h, 'wanderhz', 0.2) })),
    }));
  return { ok, cells, clocks, outputs, off, diagnostics, tapes, returns, resonances };
}

export const compileSource = (source: string, env: Env = DEFAULT_ENV): CompileResult => compile(parse(source), env);

const pickText = (p: Pick | null) => (!p ? '' : p.kind === 'at' ? `[${p.i}]` : `[${p.from ?? ''}:${p.to ?? ''}${p.step ? `:${p.step}` : ''}]`);

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

/** Generated meters (agogic, even) and grids place their steps within the bar; a plain list steps evenly. */
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
