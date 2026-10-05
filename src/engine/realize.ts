/**
 * From a compiled program + shifts to sound. Nothing loops by itself: every
 * stepped cell's shift is a function of time (its clock's step count × its
 * rate), so a key that turns once per pass of a theme just works. Times are
 * seconds at the code's rates; the transport scales them (tempo control).
 * Pitches become frequencies: a voice steps at its own rate × 2^(semitones/12).
 */
import type { Pick } from './ast';
import { SECONDS_PER_STEP as LAW_SPS, notesBetween as lawNotes } from './fiveto12';
import {
  adsrOf,
  ROOT,
  MAX_EVENTS,
  pickIndices,
  pickSteps,
  period,
  resolveIn,
  semitones,
  shiftedUnits,
  tableChain,
  type CompileResult,
  type Output,
  type ResolvedCell,
  type Clock,
  type Shifts,
} from './compile';
import { beltWarp, onReset, warpOf } from './physics';
import { mod } from '../theory/modes';

export const cellId = (name: string) => `cell:${name}`;
export const edgeId = (source: string, target: string) => `${source}->${target}`;
/** step= links get their own ids: a cell can be both over= and step= another (`&scale over=&key step={&key}`). */
export const stepEdgeId = (source: string, target: string) => `${source}~>${target}`;

// ---------------------------------------------------------------- time

export interface TimeMap {
  /** Entries (steps) per bar; 1 for a clock without positions. */
  readonly beats: number;
  /** A physical clock: how fast it runs at real second t (1 on tempo); absent for an ideal one. */
  speed?(t: number): number;
  /** Seconds at step s (fractional), relative to step 0. */
  q(step: number): number;
  /** Inverse of q for t ≥ 0. */
  stepAt(t: number): number;
}

/**
 * A clock steps `perSecond` times a second on average. If its entries are
 * positions in a bar (a lap of its grid), they place the steps: an agogic
 * bar keeps its length but bends where the beats fall. Fractional steps
 * interpolate.
 */
export function timeMap(result: CompileResult, clock: Clock, shifts: Shifts): TimeMap {
  if (!clock.positional && clock.swing !== undefined) {
    // swing: a pair of steps keeps its length, its second step starts sw of the way through
    const sw = Math.min(0.95, Math.max(0.05, clock.swing));
    const ps = clock.perSecond;
    const q = (s: number) => {
      const pair = Math.floor(s / 2);
      const f = s / 2 - pair; // 0…1 through the pair
      return (2 * pair + 2 * (f < 0.5 ? (f / 0.5) * sw : sw + ((f - 0.5) / 0.5) * (1 - sw))) / ps;
    };
    const stepAt = (t: number) => {
      const x = (t * ps) / 2;
      const pair = Math.floor(x);
      const f = x - pair;
      return 2 * (pair + (f < sw ? (f / sw) * 0.5 : 0.5 + ((f - sw) / (1 - sw)) * 0.5));
    };
    return { beats: 1, q, stepAt };
  }
  if (!clock.positional) return { beats: 1, q: (s) => s / clock.perSecond, stepAt: (t) => t * clock.perSecond };
  const name = clock.cell;
  const values = shiftedUnits(result, name, shifts(name)).flatMap((u) => (u.atom.kind === 'note' ? [u.atom.value + u.atom.alter] : []));
  const k = Math.max(1, values.length);
  const lap = period(result, name);
  const barSeconds = k / clock.perSecond;
  const ticks = (j: number) => values[mod(j, k)] + lap * Math.floor(j / k);
  const raw = (s: number) => {
    const j = Math.floor(s);
    const t0 = ticks(j);
    return ((t0 + (s - j) * (ticks(j + 1) - t0)) / lap) * barSeconds;
  };
  const origin = raw(0);
  const q = (s: number) => raw(s) - origin;
  const stepAt = (t: number) => {
    let j = Math.floor(t / barSeconds) * k;
    while (q(j + 1) <= t) j++;
    while (j > 0 && q(j) > t) j--;
    const a = q(j);
    const b = q(j + 1);
    return j + (b > a ? (t - a) / (b - a) : 0);
  };
  return { beats: k, q, stepAt };
}

// ---------------------------------------------------------------- flatten

/** A cell's units as played: rotated by its shift (plus a [<<]/[>>] shift) — or, for a pick, as written. */
export function unitsFor(result: CompileResult, name: string, shifts: Shifts, pick: Pick | null, table?: string, extra = 0) {
  if (!pick) return shiftedUnits(result, name, shifts(name) + extra, table);
  const all = shiftedUnits(result, name, 0, table);
  return (pickIndices(all.length, pick) ?? []).map((i) => all[i]);
}

/** Steps taken by a (picked) cell. */
export const stepsOf = (result: CompileResult, name: string, pick: Pick | null) => pickSteps(result.cells.get(name)!, pick) ?? 0;

const pickKey = (p: Pick | null, shift = 0) => (!p ? `>${shift}` : p.kind === 'at' ? `@${p.i}` : `${p.from}:${p.to}`);

export interface StepEvent {
  readonly step: number;
  readonly duration: number;
  readonly value: number;
  readonly alter: number;
  /** Cell the number was written in. */
  readonly cell: string;
  /** Table it indexes (the cell's over=, else its player's), with that reference's shift. */
  readonly table: string;
  readonly tableShift: number;
  /** Grid steps it's transposed by (the ^n of every reference it was spliced through). */
  readonly transpose?: number;
  /** x?p: the probability it sounds (each time round, reproducibly). */
  readonly chance?: number;
  /** [a|b|c]: what it chooses from (value is the first, for drawing). */
  readonly options?: readonly { readonly value: number; readonly alter: number }[];
}

export class ExpansionLimit extends Error {}

/**
 * All numbers a cell plays, in its own steps, with &refs spliced in.
 * `&x+n` splices x shifted by n. A spliced cell without over= reads its
 * numbers through the table of whoever splices it.
 */
export function flatten(
  result: CompileResult,
  root: string,
  shifts: Shifts,
  rootPick: Pick | null = null,
  silent: (name: string) => boolean = () => false,
  rootShift = 0,
  rootCtx = ROOT,
): StepEvent[] {
  const memo = new Map<string, StepEvent[]>();
  const walk = (name: string, pick: Pick | null, extra: number, ctx: string, ctxShift: number): StepEvent[] => {
    const cell = result.cells.get(name)!;
    const table = cell.root ? name : (cell.over ?? ctx);
    const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
    const key = `${name}|${pickKey(pick, extra)}|${table}|${tShift}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const out: StepEvent[] = [];
    if (!silent(name)) {
      let base = 0;
      for (const u of unitsFor(result, name, shifts, pick, table, extra)) {
        const a = u.atom;
        const unit = a.kind === 'ref' ? stepsOf(result, a.name, a.pick) || 1 : 1;
        const foot = unit * u.elongate;
        const dur = foot / u.subdivide;
        for (let r = 0; r < u.repeat; r++) {
          for (let s = 0; s < u.subdivide; s++) {
            const at = base + s * dur;
            const ev = { step: at, duration: dur, cell: name, table, tableShift: tShift };
            // x?p: its probability (a bare ? takes the cell's chance=)
            const odds = u.chance === undefined ? {} : { chance: u.chance === null ? (cell.chance ?? 0.5) : u.chance };
            if (a.kind === 'note') out.push({ ...ev, value: a.value, alter: a.alter, ...odds });
            else if (a.kind === 'chord') a.notes.forEach((v, j) => out.push({ ...ev, value: v, alter: a.alters[j], ...odds }));
            else if (a.kind === 'choice')
              out.push({ ...ev, value: a.values[0], alter: a.alters[0], ...odds, options: a.values.map((v, j) => ({ value: v, alter: a.alters[j] })) });
            else if (a.kind === 'ref') {
              const k = dur / (stepsOf(result, a.name, a.pick) || 1);
              const up = a.transpose ?? 0;
              for (const e of walk(a.name, a.pick, a.shift, table, tShift))
                out.push({ ...e, step: at + e.step * k, duration: e.duration * k, ...(up || e.transpose ? { transpose: (e.transpose ?? 0) + up } : {}) });
            }
            if (out.length > MAX_EVENTS) throw new ExpansionLimit(name);
          }
          base += foot;
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return [...walk(root, rootPick, rootShift, rootCtx, 0)].sort((a, b) => a.step - b.step || a.value - b.value);
}

// ---------------------------------------------------------------- stepping

const EPS = 1e-9;

/**
 * Cells whose braid is played — the terms of every out (triggers and
 * modulators) and everything they splice: their moving shift is a playhead,
 * not a turn of a table.
 */
export function playedCells(result: CompileResult): Set<string> {
  const out = new Set<string>();
  const walk = (n: string) => {
    if (out.has(n)) return;
    out.add(n);
    for (const k of result.cells.get(n)?.children.keys() ?? []) walk(k);
  };
  for (const o of result.outputs) {
    walk(o.cell);
    for (const m of [...o.mods, ...o.levels]) walk(m.cell);
  }
  return out;
}

export interface Clocking {
  /** Fractional step count of a clock at `seconds`. */
  stepOf(clock: string): number;
  map(clock: string): TimeMap;
}

const belts = new WeakMap<CompileResult, Map<string, import('./physics').Warp>>();
onReset((r) => belts.delete(r));

/**
 * The physics of a physical cell (a meter with a motor, or a belted cell): to put a hand on it, and
 * to read a belt's state. Null for a cell that turns ideally.
 */
export function physicsOf(result: CompileResult, statics: Shifts, cell: string): import('./physics').Warp | null {
  const c = result.cells.get(cell);
  if (!c) return null;
  if (typeof c.params.motor === 'number') return warpOf(result, cell);
  if (typeof c.params.belt === 'number' && result.clocks.get(cell)?.belt) {
    clocking(result, statics).map(cell); // (builds the belt if it isn't yet)
    return belts.get(result)?.get(cell) ?? null;
  }
  return null;
}

/** varispeed= on a clock (the meter, or a belted cell): how fully pitch follows its speed (0 not at all). */
function varispeedOf(result: CompileResult, clock: string): number {
  const v = result.cells.get(result.clocks.get(clock)?.cell ?? '')?.params.varispeed;
  return typeof v === 'number' ? v : 0;
}

export function clocking(result: CompileResult, statics: Shifts, seconds = 0): Clocking {
  const maps = new Map<string, TimeMap>();
  const map = (clock: string) => {
    let m = maps.get(clock);
    if (!m) {
      const info = result.clocks.get(clock)!;
      if (info.belt) {
        // a belt: where its driver would put it (the driver's own map, physics and all), through a spring
        const drv = result.clocks.get(info.belt.driver)!;
        const idealD = timeMap(result, drv, statics);
        const moving = map(info.belt.driver);
        const cell = result.cells.get(info.cell)!;
        const num = (key: string, dflt: number) => (typeof cell.params[key] === 'number' ? (cell.params[key] as number) : dflt);
        const k = Math.max(1e-3, num('belt', 200));
        const mass = Math.max(1e-3, num('mass', 1));
        const c = num('damping', 0.6 * Math.sqrt(k * mass)); // (a little bounce: ζ ≈ 0.3)
        // (one belt per program and clock: every time map of this program shares its simulation)
        let byClock = belts.get(result);
        if (!byClock) belts.set(result, (byClock = new Map()));
        let bw = byClock.get(clock);
        if (!bw) byClock.set(clock, (bw = beltWarp(result, k, mass, c, num('slip', Infinity), (t) => idealD.q(moving.stepAt(t)))));
        const belt = bw;
        // (rate: its steps per step of its driver — so its step st is its driver's st / rate)
        const rate = info.belt.rate;
        m = { beats: 1, q: (st) => belt.real(idealD.q(st / rate)), stepAt: (t) => idealD.stepAt(belt.nominal(t)) * rate, speed: (t) => belt.speed(t) };
      } else {
        const ideal = timeMap(result, info, statics);
        // a clock with a motor turns physically: its time warped (spin-up, sag under load, running down)
        const w = warpOf(result, info.cell);
        m = w ? { beats: ideal.beats, q: (st) => w.real(ideal.q(st)), stepAt: (t) => ideal.stepAt(w.nominal(t)), speed: (t) => w.speed(t) } : ideal;
      }
      maps.set(clock, m);
    }
    return m;
  };
  return { map, stepOf: (clock) => map(clock).stepAt(Math.max(0, seconds)) };
}

/**
 * Shifts at a moment: the static shift, plus — for stepped cells that are
 * looked through rather than played — the turns their step= chain has made,
 * times their stride. Turns climb (a lap each time round) unless the cell
 * declares cycle=, where they wrap.
 */
export function shiftsAt(result: CompileResult, statics: Shifts, seconds: number, played: ReadonlySet<string> = playedCells(result)): Shifts {
  const clk = clocking(result, statics, seconds);
  const steps = new Map<string, number>();
  return (name) => {
    const base = statics(name);
    const c = result.cells.get(name);
    // a meter (a clock of its own) places time: read as a table, it doesn't turn;
    // a selector sequences its parts: it steps, it doesn't turn either
    // … and what loops (loop=) oscillates: it doesn't turn either
    if (!c || !c.step || !c.clock || played.has(name) || result.clocks.has(name) || selects(result, name) || c.loops) return base;
    let s = steps.get(c.clock);
    if (s === undefined) steps.set(c.clock, (s = clk.stepOf(c.clock)));
    // turns climb, like every shift; a cell that declares cycle= wraps there instead
    const turns = Math.floor(c.rate * s + EPS) * c.stride;
    return base + (c.wrap ? mod(turns, c.wrap) : turns);
  };
}

// ---------------------------------------------------------------- playing

export interface Played {
  /** Absolute start in seconds at the code's rates. */
  readonly at: number;
  readonly dur: number;
  /** Voice cell that sounds it, and at what frequency (modulation at the start included). */
  readonly voice: string;
  readonly freq: number;
  /** Pitch changes while it sounds, from modulating terms: cents relative to the start (ramp: glide there). */
  readonly bends: readonly { readonly at: number; readonly cents: number; readonly ramp?: boolean }[];
  /** Level per channel [left, right], from the mixes. */
  readonly gains: readonly [number, number];
  /** Volume over the note: its level at the start, then each change (volume streams, a gate). */
  readonly levels: readonly { readonly at: number; readonly level: number; readonly ramp?: boolean }[];
  /** The instrument (a mix used like a voice) it plays through, if any. */
  readonly instrument?: string;
  /** Its voice's moving parameters over the note (lpf=200..3000 * &fenv …). */
  readonly params?: Readonly<Record<string, ParamTrack>>;
  /** The value that started it (a resonator reads it as where it's struck). */
  readonly value?: number;
  /** Its envelope (map=adsr, seconds), or absent for the voice's own. */
  readonly env?: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };
}

interface Series {
  readonly sign: 1 | -1;
  /** map=lin: values ramp from step to step instead of holding. */
  readonly lin: boolean;
  /** map=db: values are decibels (0 full, −6 about half). */
  readonly db: boolean;
  /** null: a static term (no clock) — it holds its first value. */
  readonly clock: string | null;
  readonly rate: number;
  /** The cell's length in its own steps. */
  readonly period: number;
  readonly events: readonly StepEvent[];
}

interface PlanTrack extends Series {
  readonly output: Output;
  readonly clock: string;
  readonly mods: readonly Series[];
  /** Volume streams (map=amp). */
  readonly levels: readonly Series[];
  /** The selectors it plays through, with the entry that picks it (and how many entries they read). */
  readonly selects: readonly { readonly series: Series; readonly entry: number; readonly entries: number }[];
  /** When it stops, in seconds (laps= on a cell that drives it); Infinity if it loops. */
  readonly end: number;
}

/** The static part of playback (braids flattened); pitches are resolved per moment. */
export interface Plan {
  readonly result: CompileResult;
  readonly statics: Shifts;
  readonly muted: ReadonlySet<string>;
  readonly tracks: readonly PlanTrack[];
  readonly played: ReadonlySet<string>;
  /** Each voice's moving parameters: their cells as series (an envelope among them, apart). */
  readonly voiceParams: ReadonlyMap<string, Readonly<Record<string, VoiceParam>>>;
  /** When the piece ends, in seconds: the last track's end — Infinity if anything loops (or nothing plays). */
  readonly end: number;
}

/**
 * When an output stops: laps= on its cell, the chain of cells that step it, its
 * clock, or a selector it plays through — the earliest of those. Infinity: it loops.
 */
function endOf(result: CompileResult, statics: Shifts, o: Output): number {
  const clk = clocking(result, statics);
  const seen = new Set<string>();
  const ends: number[] = [];
  const visit = (name: string | null | undefined) => {
    for (let guard = 0; name && !seen.has(name) && guard < 32; guard++) {
      seen.add(name);
      const c = result.cells.get(name);
      if (!c) return;
      if (c.laps && c.clock) ends.push(clk.map(c.clock).q((c.laps * Math.max(1, stepsOf(result, name, null))) / c.rate));
      if (c.clock && c.clock !== name) visit(c.clock);
      name = c.step?.driver;
    }
  };
  visit(o.cell);
  for (const x of o.select) visit(x.cell);
  return ends.length ? Math.min(...ends) : Infinity;
}

/** A number in [0, 1) from a text: the same text, the same number (cyrb53). */
export function chanceOf(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0) * 2 ** 21 + (h1 >>> 11)) / 2 ** 53;
}

/**
 * Chance, thrown: does this step sound this time round (x?p), and which does it
 * choose ([a|b|c])? Reproducible — the same cell, voice, lap and step always
 * throw the same — and different each lap. A chord's notes share their step,
 * so they sound or rest together.
 */
function thrown(result: CompileResult, t: PlanTrack, e: StepEvent, lap: number): StepEvent | null {
  if (e.chance === undefined && !e.options) return e;
  const key = `${result.cells.get(t.output.cell)?.seed ?? 0}|${t.output.cell}|${t.output.voice}|${lap}|${e.step.toFixed(6)}`;
  if (e.chance !== undefined && chanceOf(`${key}|sounds`) >= e.chance) return null;
  if (!e.options) return e;
  const o = e.options[Math.floor(chanceOf(`${key}|picks`) * e.options.length)];
  return { ...e, value: o.value, alter: o.alter };
}

/** Is it a selector (a cell reading a table whose entries are parts)? */
function selects(result: CompileResult, name: string): boolean {
  const t = result.cells.get(result.cells.get(name)?.over ?? '');
  return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && !!result.cells.get(u.atom.name)?.mix && !result.cells.get(u.atom.name)?.sink);
}

/** The entries a selector picks right now. */
function picksNow(result: CompileResult, statics: Shifts, name: string, seconds: number): Set<number> {
  const c = result.cells.get(name);
  const entries = result.cells.get(c?.over ?? '')?.units.length ?? 0;
  if (!c?.clock || entries === 0) return new Set();
  const period = Math.max(1, stepsOf(result, name, null));
  const local = mod(clocking(result, statics).map(c.clock).stepAt(seconds) * c.rate, period);
  const out = new Set<number>();
  for (const e of flatten(result, name, statics, null))
    if (local >= e.step - EPS && local < e.step + e.duration - EPS) out.add(mod(Math.round(e.value + e.alter), entries));
  return out;
}

/**
 * When a selector picks an entry, in [from, to): its windows, in seconds. Reading a
 * table of parts splices: each window is where the picked part starts again.
 */
function windowsOf(p: Plan, sel: PlanTrack['selects'][number], from: number, to: number): { a: number; b: number }[] {
  const m = sel.series;
  if (!m.clock || m.events.length === 0) return [];
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { a: number; b: number }[] = [];
  for (let lap = Math.floor(c0 / m.period) - 1; lap * m.period < c1; lap++)
    for (const e of m.events) {
      if (mod(Math.round(e.value + e.alter), sel.entries) !== sel.entry) continue;
      const s0 = lap * m.period + e.step;
      const s1 = s0 + e.duration;
      if (s1 <= c0 + EPS || s0 >= c1 - EPS) continue;
      out.push({ a: tm.q(s0 / m.rate), b: tm.q(s1 / m.rate) });
    }
  return out.sort((x, y) => x.a - y.a);
}

interface VoiceParam {
  readonly range: readonly [number, number] | null;
  readonly series: readonly Series[];
  readonly env: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number } | null;
}

/**
 * A parameter over one note: points (held, or ramp: glide there), or an
 * envelope from `from` up to `peak` and down to its sustain, released after the note.
 */
export type ParamTrack =
  | { readonly kind: 'points'; readonly points: readonly { readonly at: number; readonly value: number; readonly ramp?: boolean }[] }
  | { readonly kind: 'env'; readonly from: number; readonly peak: number; readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };

const chainMuted = (result: CompileResult, table: string, muted: ReadonlySet<string>) =>
  tableChain(result, table).some((c) => muted.has(cellId(c)));

/** Is anything in a cell's chain of step= drivers switched off (&t steps by &swing, &swing by &bar …)? */
const driverMuted = (result: CompileResult, name: string, muted: ReadonlySet<string>) => {
  let c = result.cells.get(name);
  for (let guard = 0; c?.step && guard < 32; guard++) {
    if (muted.has(cellId(c.step.driver))) return true;
    c = result.cells.get(c.step.driver);
  }
  return false;
};

/** An output's level per channel, leaving out mixes (or sound cards) that are switched off. */
export function liveGains(o: Output, muted: ReadonlySet<string>): [number, number] {
  // a send (a mix played only into a resonator or a tape): its own gain, unless its mix is off
  if (o.silent) return [...o.via].some((m) => muted.has(cellId(m))) ? [0, 0] : [o.gains[0], o.gains[1]];
  const g: [number, number] = [0, 0];
  for (const p of o.parts)
    if (!muted.has(cellId(p.mix)) && !muted.has(cellId(p.sink))) {
      g[0] += p.gains[0];
      g[1] += p.gains[1];
    }
  return g;
}

export function outputSounds(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean {
  if (muted.has(cellId(o.voice)) || muted.has(cellId(o.cell))) return false;
  const c = result.cells.get(o.cell);
  if (!c?.clock || chainMuted(result, c.clock, muted) || driverMuted(result, o.cell, muted)) return false;
  // the instruments it plays through (and its envelope) must be on, and it has to reach a sound card through a mix that's on
  if (o.through.some((t) => muted.has(cellId(t))) || (o.envelopeCell && muted.has(cellId(o.envelopeCell)))) return false;
  // a selector, its table or the part switched off: silent
  if (o.select.some((x) => muted.has(cellId(x.cell)) || muted.has(cellId(x.part)) || muted.has(cellId(result.cells.get(x.cell)!.over!)))) return false;
  // … or the score it reads (what its steps are spliced from)
  if (o.select.some((x) => [...result.cells.get(x.cell)!.children.keys()].some((c) => muted.has(cellId(c))))) return false;
  const g = liveGains(o, muted);
  return g[0] > 0 || g[1] > 0;
}

export function plan(result: CompileResult, statics: Shifts, muted: ReadonlySet<string> = new Set()): Plan {
  const tracks: PlanTrack[] = [];
  const voiceParams = new Map<string, Record<string, VoiceParam>>();
  for (const o of result.outputs) {
    if (!outputSounds(result, o, muted)) continue;
    const c = result.cells.get(o.cell)!;
    const series = (cell: string, pick: Pick | null, shift: number, sign: 1 | -1): Series => {
      const m = result.cells.get(cell)!;
      const events = muted.has(cellId(cell))
        ? []
        : flatten(result, cell, statics, pick, (n) => muted.has(cellId(n)), shift).filter((e) => !chainMuted(result, e.table, muted));
      return { sign, lin: m.map?.kind === 'lin', db: m.map?.kind === 'db', clock: m.clock, rate: m.rate, period: Math.max(1, stepsOf(result, cell, pick)), events };
    };
    try {
      const main = series(o.cell, o.pick, o.shift, o.sign);
      // the voices' moving parameters (lpf=200..3000 * &fenv …): their cells, as series
      for (const voice of o.kit ? (result.cells.get(o.voice)?.units ?? []).flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])) : [o.voice]) {
        if (voiceParams.has(voice)) continue;
        const vc = result.cells.get(voice);
        const out: Record<string, VoiceParam> = {};
        for (const [key, pc] of Object.entries(vc?.paramCells ?? {})) {
          const envCell = pc.factors.find((f) => result.cells.get(f)?.map?.kind === 'adsr');
          out[key] = {
            range: pc.range,
            series: pc.factors.filter((f) => f !== envCell).map((f) => series(f, null, 0, 1)),
            env: envCell ? adsrOf(result.cells.get(envCell)!) : null,
          };
        }
        voiceParams.set(voice, out);
      }
      const mods = o.mods.map((t) => series(t.cell, t.pick, t.shift, t.sign)).filter((m) => m.events.length > 0);
      const levels = o.levels.map((t) => series(t.cell, t.pick, t.shift, t.sign));
      const selects = o.select.map((x) => ({
        series: series(x.cell, null, 0, 1),
        entry: x.entry,
        entries: result.cells.get(result.cells.get(x.cell)!.over!)!.units.length,
      }));
      if (main.events.length) tracks.push({ ...main, output: o, clock: c.clock!, mods, levels, selects, end: endOf(result, statics, o) });
    } catch (e) {
      if (!(e instanceof ExpansionLimit)) throw e;
    }
  }
  const ends = tracks.map((t) => t.end);
  // a clock that runs down (wind=) ends the piece where it comes to rest
  let stops = -Infinity;
  for (const c of result.clocks.values()) {
    const at = warpOf(result, c.cell)?.stopsAt();
    if (at != null) stops = Math.max(stops, at);
  }
  const lapsEnd = ends.length ? Math.max(...ends) : Infinity;
  return { result, statics, muted, tracks, played: playedCells(result), voiceParams, end: Math.min(lapsEnd, stops > -Infinity ? stops : Infinity) };
}

/** A voice's moving parameters over one note [at, at + dur). */
function paramTracks(p: Plan, voice: string, at: number, dur: number): Record<string, ParamTrack> | undefined {
  const vp = p.voiceParams.get(voice);
  if (!vp || Object.keys(vp).length === 0) return undefined;
  const out: Record<string, ParamTrack> = {};
  for (const [key, prm] of Object.entries(vp)) {
    const series = prm.series.map((m) => levelSeries(p, m, at, at + dur));
    // the factors, multiplied, at a time
    const product = (time: number) => series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1);
    const scaled = (x: number) => (prm.range ? prm.range[0] + (prm.range[1] - prm.range[0]) * x : x);
    if (prm.env && prm.range) {
      // an envelope per note: from the bottom of the range to its top scaled by the other factors (an accent, a knob) at the start
      out[key] = { kind: 'env', from: prm.range[0], peak: scaled(product(at)), ...prm.env };
    } else {
      const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
      out[key] = {
        kind: 'points',
        points: (times.length ? times : [at]).map((time) => ({
          at: time,
          value: scaled(product(time)),
          ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
        })),
      };
    }
  }
  return out;
}


/** Pitch of a step event, in semitones, looking tables up as they stand at `at`. */
function pitchOf(p: Plan, e: StepEvent, at: number): number {
  const found = resolveIn(p.result, e.table, e.tableShift, e.value, e.alter, shiftsAt(p.result, p.statics, at + EPS, p.played));
  const r = e.transpose ? { ...found, position: found.position + e.transpose } : found; // ^n: grid steps up
  return semitones(p.result, r.root, r.position);
}

/**
 * A modulating term over [from, to): its value at `from`, then each change
 * (hold between steps). Rests hold the previous value; a static term holds
 * its first.
 */
export function modulation(p: Plan, m: Series, from: number, to: number): { at: number; semis: number; ramp?: boolean }[] {
  if (m.events.length === 0) return [{ at: from, semis: 0 }];
  if (!m.clock) return [{ at: from, semis: m.sign * pitchOf(p, m.events[0], from) }];
  if (m.lin) return rampedSeries(p, m, from, to, (e, at) => m.sign * pitchOf(p, e, at)).map((x) => ({ at: x.at, semis: x.v, ramp: x.ramp }));
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { at: number; semis: number }[] = [];
  // the value in force at `from`: the last event starting at or before c0
  const lap0 = Math.floor(c0 / m.period);
  let last: StepEvent | null = null;
  for (const lap of [lap0, lap0 - 1]) {
    for (const e of m.events) if (lap * m.period + e.step <= c0 + EPS) last = e;
    if (last) break;
  }
  out.push({ at: from, semis: last ? m.sign * pitchOf(p, last, from) : 0 });
  for (let lap = lap0; lap * m.period < c1; lap++) {
    for (const e of m.events) {
      const s = lap * m.period + e.step;
      if (s <= c0 + EPS || s >= c1 - EPS) continue;
      const at = tm.q(s / m.rate);
      out.push({ at, semis: m.sign * pitchOf(p, e, at) });
    }
  }
  return out;
}

/**
 * A ramped series (map=lin) over [from, to): the value at `from`, a ramp to each
 * step's value as it starts, and to the value at `to`. Values ramp from one
 * step's start to the next; the last holds until the braid starts again (a
 * step). Chords use their first value.
 */
function rampedSeries(p: Plan, m: Series, from: number, to: number, valueOf: (e: StepEvent, at: number) => number) {
  const tm = clocking(p.result, p.statics).map(m.clock!);
  const starts = [...new Map(m.events.map((e) => [e.step, e])).values()].sort((a, b) => a.step - b.step);
  const at = (c: number) => tm.q(c / m.rate);
  // the value at step c: between the step before and the step after (laps wrap)
  const valueAt = (c: number) => {
    const lap = Math.floor(c / m.period);
    const local = c - lap * m.period;
    let i = starts.length - 1;
    for (let k = 0; k < starts.length; k++) if (starts[k].step <= local + EPS) i = k;
    const a = starts[i];
    const aStep = a.step > local + EPS ? a.step - m.period : a.step;
    const va = valueOf(a, at(lap * m.period + aStep));
    // the last value holds: a braid ramps through its values, and starting again is a step
    if (i === starts.length - 1 || aStep < 0) return va;
    const b = starts[i + 1];
    const vb = valueOf(b, at(lap * m.period + b.step));
    return va + ((vb - va) * (local - aStep)) / Math.max(EPS, b.step - aStep);
  };
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { at: number; v: number; ramp: boolean }[] = [{ at: from, v: valueAt(c0), ramp: false }];
  for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
    for (const e of starts) {
      const c = lap * m.period + e.step;
      if (c > c0 + EPS && c < c1 - EPS) out.push({ at: at(c), v: valueOf(e, at(c)), ramp: e !== starts[0] });
    }
  out.push({ at: to, v: valueAt(c1 - 1e-6), ramp: true }); // just before the end, not the next pass's start
  return out;
}

/**
 * A volume stream over [from, to): its level at `from`, then each change.
 * Levels are the values as written (map=amp: 1 full, 0 silent); a rest is
 * silence; a stream that doesn't move holds its first value.
 */
export function levelSeries(p: Plan, m: Series, from: number, to: number): { at: number; level: number; ramp?: boolean }[] {
  const val = (e: StepEvent) => (m.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter));
  if (m.events.length === 0) return [{ at: from, level: 0 }];
  if (!m.clock) return [{ at: from, level: val(m.events[0]) }];
  if (m.lin) return rampedSeries(p, m, from, to, (e) => val(e)).map((x) => ({ at: x.at, level: Math.max(0, x.v), ramp: x.ramp }));
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  // the level at a step: the event sounding there (chords: the loudest), else silence
  const levelAt = (c: number) => {
    const local = c - Math.floor(c / m.period) * m.period;
    let best = -1;
    for (const e of m.events) if (local >= e.step - EPS && local < e.step + e.duration - EPS) best = Math.max(best, val(e));
    return best < 0 ? 0 : best;
  };
  const out: { at: number; level: number }[] = [{ at: from, level: levelAt(c0) }];
  const edges = new Set<number>();
  for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
    for (const e of m.events)
      for (const s of [lap * m.period + e.step, lap * m.period + e.step + e.duration]) if (s > c0 + EPS && s < c1 - EPS) edges.add(s);
  for (const s of [...edges].sort((a, b) => a - b)) {
    const level = levelAt(s + EPS * 10);
    if (level !== out[out.length - 1].level) out.push({ at: tm.q(s / m.rate), level });
  }
  return out;
}

/**
 * A series' value at a time: held series hold their last point; ramped ones
 * (any point with ramp) are interpolated between the points around it.
 */
function valueThen<T extends { at: number; ramp?: boolean }>(s: readonly T[], time: number, v: (x: T) => number): number {
  let i = 0;
  for (let k = 0; k < s.length; k++) if (s[k].at <= time + EPS) i = k;
  const next = s[i + 1];
  if (!next?.ramp || Math.abs(s[i].at - time) < EPS) return v(s[i]);
  return v(s[i]) + ((v(next) - v(s[i])) * (time - s[i].at)) / Math.max(EPS, next.at - s[i].at);
}

/** Which voice a number plays on, and that voice's base frequency. */
function voiceFor(result: CompileResult, o: Output, value: number): { voice: string; freq: number } | null {
  if (!o.kit) return { voice: o.voice, freq: result.cells.get(o.voice)!.freq };
  const kit = result.cells.get(o.voice)!;
  const u = kit.units[mod(Math.round(value), kit.units.length)];
  if (u?.atom.kind !== 'ref') return null;
  return { voice: u.atom.name, freq: result.cells.get(u.atom.name)!.freq };
}

/**
 * Everything that starts in [from, to). The triggering term's pitch (tables as
 * they stand at that moment) plus every modulating term sets the voice's rate:
 * freq = voice rate × 2^(semitones / 12). Kits take the number as an index.
 */
/**
 * A tape: what its write head records passes a read head d tape-seconds on, when the tape has moved
 * that far — and on a loop of length L again every L, (1 − erase) as loud each pass under the write
 * head. The tape moves with its clock (a meter, a belt: physics and hands and all); pos(t), how far.
 */
export function eventsBetween(p: Plan, from: number, to: number): Played[] {
  // (a law's cell plays only what its law computes — not its steps counted as values)
  const lawful = (t: PlanTrack) => p.result.cells.get(t.output.cell)?.params.law !== undefined;
  const plain = p.tracks.filter((t) => !t.output.tape && !lawful(t));
  const taped = p.tracks.filter((t) => t.output.tape);
  const out = plainEvents({ ...p, tracks: plain }, from, to);
  // a law (law=fiveto12): its notes computed, not written — any moment of its day at once
  for (const o of p.result.outputs) {
    if (p.result.cells.get(o.cell)?.params.law !== 'fiveto12') continue;
    const g = liveGains(o, p.muted);
    if (!(g[0] > 0 || g[1] > 0)) continue;
    const base = p.result.cells.get(o.voice)?.freq || 261.63;
    for (const n of lawNotes(Math.ceil(from / LAW_SPS - 1e-9), Math.ceil(to / LAW_SPS - 1e-9))) {
      const at = n.step * LAW_SPS;
      out.push({
        at,
        dur: n.dur * LAW_SPS,
        voice: o.voice,
        freq: base * Math.pow(2, n.semis / 12),
        bends: [],
        gains: [g[0] * Math.min(1, 1 - n.pan), g[1] * Math.min(1, 1 + n.pan)],
        levels: [{ at, level: n.level }],
      });
    }
  }
  if (!taped.length) return out;
  const clk = clocking(p.result, p.statics);
  for (const t of taped) {
    const tp = t.output.tape!;
    const tc = p.result.cells.get(tp.tape);
    const { pos, real, speed, moving: m } = tapeMotion(p.result, clk, tp.tape);
    const vari = typeof tc?.params.varispeed === 'number' ? tc.params.varispeed : 0;
    const keep = 1 - tp.erase;
    const passes = tp.length > 0 ? Math.min(40, keep > 0 ? Math.ceil(Math.log(0.02) / Math.log(keep)) : 1) : 1;
    const source = { ...t, output: { ...t.output, tape: undefined } };
    for (let k = 0; k < passes; k++) {
      const shift = tp.at + k * tp.length;
      const g = Math.pow(keep, k);
      const s0 = real(pos(from) - shift);
      const s1 = real(pos(to) - shift);
      if (!(s1 > 0) || !Number.isFinite(s1)) continue;
      const through = (x: number) => real(pos(x) + shift);
      for (const e of plainEvents({ ...p, tracks: [source] }, Math.max(0, s0), s1)) {
        const at = through(e.at);
        if (!(at >= from && at < to) || !Number.isFinite(at)) continue;
        const end = through(e.at + e.dur);
        // (a tape at a standstill records nothing; and its pitch moves two octaves at most, either way)
        if (m && speed(e.at) < 0.05) continue;
        const ratio = vari ? Math.min(4, Math.max(0.25, Math.pow(speed(at) / speed(e.at), vari))) : 1;
        out.push({
          ...e,
          at,
          dur: Math.max(0.01, (Number.isFinite(end) ? end : at + e.dur) - at),
          freq: e.freq * ratio,
          bends: e.bends.map((b) => ({ ...b, at: through(b.at) })),
          levels: e.levels.map((l) => ({ ...l, at: through(l.at) })),
          gains: [e.gains[0] * g, e.gains[1] * g],
          ...(e.params
            ? { params: Object.fromEntries(Object.entries(e.params).map(([key, tr]) => [key, tr.kind === 'points' ? { ...tr, points: tr.points.map((x) => ({ ...x, at: through(x.at) })) } : tr])) }
            : {}),
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * A tape's motion: how far it has moved (tape-seconds) at real second x, when it has moved u, and how
 * fast it runs (1 on tempo). It runs at its clock's own time — a meter, a belt; none: real time.
 */
export function tapeMotion(result: CompileResult, clk: Clocking, tape: string) {
  const tc = result.cells.get(tape);
  const info = tc?.clock ? result.clocks.get(tc.clock) : undefined;
  const moving = tc?.clock && info ? clk.map(tc.clock) : null;
  const per = info ? info.perSecond : 1;
  const pos = (x: number) => (moving ? moving.stepAt(Math.max(0, x)) / per : x);
  const real = (u: number) => (u <= 0 ? 0 : moving ? moving.q(u * per) : u);
  const speed = (x: number) => Math.max(1e-3, (pos(x + 0.01) - pos(Math.max(0, x - 0.01))) / (x + 0.01 - Math.max(0, x - 0.01)));
  return { pos, real, speed, moving };
}

function plainEvents(p: Plan, from: number, to: number): Played[] {
  const out: Played[] = [];
  const { result, statics } = p;
  const clk = clocking(result, statics);
  for (const t of p.tracks) {
    const tm = clk.map(t.clock);
    const until = Math.min(to, t.end); // laps=: nothing after its end
    if (until <= from) continue;
    const c0 = tm.stepAt(Math.max(0, from)) * t.rate;
    const c1 = tm.stepAt(Math.max(0, until)) * t.rate;
    if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 <= c0) continue; // (a clock gone wild: nothing from it)
    // a note at step s, lasting until step `upto` (a window's end cuts it)
    const emit = (s: number, e: StepEvent, upto: number) => {
        const at = tm.q(s / t.rate);
        if (!Number.isFinite(at)) return; // (a clock run down: this step never comes)
        if (at >= t.end - EPS) return;
        // (a note whose clock stops beneath it never reaches its end: it rings 8 s at most)
        const ends = Math.min(tm.q(upto / t.rate), t.end);
        const dur = Number.isFinite(ends) ? ends - at : 8;
        const v = voiceFor(result, t.output, e.value);
        if (!v || p.muted.has(cellId(v.voice))) return;
        // a gate starts notes at pitch 0, at its own level
        let semis = t.output.kit || t.output.gate ? t.output.offset : t.sign * pitchOf(p, e, at) + t.output.offset;
        // modulation: the sum at the start sets the pitch; later changes become bends
        const bends: { at: number; cents: number; ramp?: boolean }[] = [];
        if (!t.output.kit && t.mods.length) {
          const series = t.mods.map((m) => modulation(p, m, at, at + dur));
          const start = series.reduce((a, s) => a + s[0].semis, 0);
          semis += start;
          const times = [...new Set(series.flatMap((s) => s.slice(1).map((x) => x.at)))].sort((a, b) => a - b);
          for (const time of times) {
            // a ramped term ramps the whole sum to here; held ones step
            const ramp = series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS));
            const total = series.reduce((a, s) => a + valueThen(s, time, (x) => x.semis), 0);
            bends.push({ at: time, cents: 100 * (total - start), ...(ramp ? { ramp } : {}) });
          }
        }
        // varispeed: on a physical clock that asks for it, pitch follows its speed — as tape does
        const vs = varispeedOf(result, t.clock);
        if (vs && tm.speed && !t.output.kit && !t.output.gate) {
          const sp = (x: number) => Math.max(1e-3, tm.speed!(x));
          const s0 = sp(at);
          if (s0 < 0.05) return; // (tape at a standstill: nothing sounds)
          semis += 12 * vs * Math.log2(s0);
          if (!bends.length)
            for (let x = at + 0.04, n = 0; x < at + dur && n < 400; x += 0.04, n++) {
              const cents = 1200 * vs * Math.log2(sp(x) / s0);
              if (Math.abs(cents) > 1) bends.push({ at: x, cents, ramp: true });
            }
        }
        // volume: the product of the streams (and a gate's own value), over the note
        const own = t.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter);
        const level: { at: number; level: number; ramp?: boolean }[] = [{ at, level: t.output.gate ? own : 1 }];
        if (t.levels.length) {
          const series = t.levels.map((m) => levelSeries(p, m, at, at + dur));
          const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
          const base = level[0].level;
          level.length = 0;
          for (const time of times)
            level.push({
              at: time,
              level: base * series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1),
              ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
            });
        }
        const freq = v.freq * Math.pow(2, semis / 12);
        const params = paramTracks(p, v.voice, at, dur);
        if (freq > 0 && freq < 20000 && level.some((l) => l.level > 0)) out.push({ at, dur, voice: v.voice, freq, bends, value: e.value + e.alter, gains: liveGains(t.output, p.muted), levels: level, ...(t.output.envelope ? { env: t.output.envelope } : {}), ...(t.output.through.length ? { instrument: t.output.through[0] } : {}), ...(params ? { params } : {}) });
    };
    if (t.selects.length === 0) {
      for (let lap = Math.floor(c0 / t.period) - 1; lap * t.period < c1; lap++)
        for (const e of t.events) {
          const s = lap * t.period + e.step;
          if (s < c0 - EPS || s >= c1 - EPS) continue;
          const r = thrown(result, t, e, lap);
          if (r) emit(s, r, s + e.duration);
        }
      continue;
    }
    // picked by selectors: where they all pick it, starting again from its beginning (reading a table splices)
    let windows = windowsOf(p, t.selects[0], from, until);
    for (const sel of t.selects.slice(1)) {
      const other = windowsOf(p, sel, from, until);
      windows = windows.flatMap((w) => other.flatMap((x) => (Math.max(w.a, x.a) < Math.min(w.b, x.b) ? [{ a: Math.max(w.a, x.a), b: Math.min(w.b, x.b) }] : [])));
    }
    for (const w of windows) {
      const sA = tm.stepAt(w.a) * t.rate;
      const sB = tm.stepAt(w.b) * t.rate;
      const lo = Math.max(c0, sA);
      const hi = Math.min(c1, sB);
      if (hi <= lo) continue;
      for (let lap = Math.floor((lo - sA) / t.period) - 1; sA + lap * t.period < hi; lap++)
        for (const e of t.events) {
          const s = sA + lap * t.period + e.step;
          if (lap < 0 || s < lo - EPS || s >= hi - EPS) continue;
          const r = thrown(result, t, e, lap);
          if (r) emit(s, r, Math.min(s + e.duration, sB));
        }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------- live view

export interface LiveCell {
  /** Playhead inside the instance being played, in this cell's steps (braids). */
  local: number | null;
  /** Table entries being looked up right now. */
  entries: Set<number>;
}

export interface LiveState {
  readonly seconds: number;
  /** Shifts as they stand now (stepped tables turned). */
  readonly shifts: Shifts;
  readonly cells: ReadonlyMap<string, LiveCell>;
  readonly edges: ReadonlySet<string>;
  readonly voices: ReadonlySet<string>;
  /** Bar count per clocked meter (0-based). */
  readonly bars: ReadonlyMap<string, number>;
  /** How far each clocked cell is through its current step, 0…1 (drives the pulses on edges). */
  readonly phases: ReadonlyMap<string, number>;
}

export function liveAt(result: CompileResult, statics: Shifts, muted: ReadonlySet<string>, seconds: number): LiveState {
  const cells = new Map<string, LiveCell>();
  const edges = new Set<string>();
  const voices = new Set<string>();
  const bars = new Map<string, number>();
  const played = playedCells(result);
  const now = shiftsAt(result, statics, seconds, played);
  const clk = clocking(result, statics, seconds);
  const mark = (name: string): LiveCell => {
    let c = cells.get(name);
    if (!c) cells.set(name, (c = { local: null, entries: new Set() }));
    return c;
  };
  const markChain = (from: string, table: string, tableShift: number, value: number, alter: number) => {
    let prev = from;
    for (const p of resolveIn(result, table, tableShift, value, alter, now).path) {
      mark(p.cell).entries.add(p.index);
      edges.add(edgeId(cellId(prev), cellId(p.cell)));
      prev = p.cell;
    }
  };

  // selectors: where in their sections the playhead is, and which parts they pick now (until they end)
  for (const c of result.cells.values()) {
    const t = c.over ? result.cells.get(c.over) : undefined;
    if (!c.clock || !t || t.units.length === 0) continue;
    if (!t.units.every((u) => u.atom.kind === 'ref' && !!result.cells.get(u.atom.name)?.mix && !result.cells.get(u.atom.name)?.sink)) continue;
    const period = Math.max(1, stepsOf(result, c.name, null));
    const at = clk.stepOf(c.clock) * c.rate;
    if (c.laps && at >= c.laps * period) continue;
    const live = mark(c.name);
    live.local = mod(at, period);
    for (const k of picksNow(result, statics, c.name, seconds)) live.entries.add(k);
  }

  // what oscillates (loop=, played by nothing, moving something): where in its cycle it is
  for (const c of result.cells.values()) {
    if (!c.loops || !c.clock || c.voice || c.mix || c.sink || played.has(c.name)) continue;
    const period = Math.max(1, stepsOf(result, c.name, null));
    const live = mark(c.name);
    if (live.local === null) live.local = mod(clk.stepOf(c.clock) * c.rate, period);
  }

  // clocks: the beat under the playhead, and the bar count
  for (const name of result.clocks.keys()) {
    const beat = Math.floor(clk.stepOf(name) + EPS);
    const k = clk.map(name).beats;
    mark(name).entries.add(mod(beat, k));
    bars.set(name, Math.floor(beat / k));
  }

  for (const o of result.outputs) {
    if (!outputSounds(result, o, muted)) continue;
    // after its end, nothing; picked by selectors, only while they pick it
    if (seconds >= endOf(result, statics, o)) continue;
    if (o.select.length && !o.select.every((x) => picksNow(result, statics, x.cell, seconds).has(x.entry))) continue;
    const top = result.cells.get(o.cell)!;
    voices.add(cellId(o.voice));
    mark(o.voice);
    edges.add(edgeId(cellId(o.cell), cellId(o.voice)));
    // the mix and the sound card it goes through
    for (const v of o.via) if (!muted.has(cellId(v))) mark(v);
    for (const v of o.via)
      if (result.cells.get(v)?.mix && !muted.has(cellId(v))) {
        edges.add(edgeId(cellId(o.voice), cellId(v)));
        for (const sink of o.via) if (sink !== v && result.cells.get(sink)?.sink) edges.add(edgeId(cellId(sink), cellId(v)));
      }
    for (const m of [...o.mods, ...o.levels]) {
      if (muted.has(cellId(m.cell))) continue;
      const mc = result.cells.get(m.cell)!;
      const live = mark(m.cell);
      if (mc.clock) live.local = mod(clk.stepOf(mc.clock) * mc.rate, Math.max(1, mc.steps));
      edges.add(edgeId(cellId(m.cell), cellId(o.voice)));
    }
    for (let at: string | null = o.cell, g = 0; at && g < 64; g++) {
      const st: ResolvedCell['step'] = result.cells.get(at)?.step ?? null;
      if (!st) break;
      edges.add(stepEdgeId(cellId(at), cellId(st.driver)));
      at = st.driver;
    }

    // descend the braid to the step under the playhead
    let at = o.cell;
    let pick = o.pick;
    let extra = o.shift;
    let local = mod(clk.stepOf(top.clock!) * top.rate, Math.max(1, stepsOf(result, o.cell, o.pick)));
    let ctx = ROOT;
    let ctxShift = 0;
    for (let guard = 0; guard < 64; guard++) {
      if (muted.has(cellId(at))) break;
      const cell = result.cells.get(at)!;
      const table = cell.root ? at : (cell.over ?? ctx);
      const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
      // a pick is drawn on the whole cell: offset the playhead to where the pick starts
      const before = pick ? (pickIndices(cell.units.length, pick)?.[0] ?? 0) : 0;
      const offset = cell.unitSteps.slice(0, before).reduce((x, y) => x + y, 0);
      mark(at).local = pick ? offset + local : local;
      let base = 0;
      let hit: { atom: (typeof cell.units)[number]['atom']; offset: number; dur: number } | null = null;
      for (const u of unitsFor(result, at, statics, pick, table, extra)) {
        const unit = u.atom.kind === 'ref' ? stepsOf(result, u.atom.name, u.atom.pick) || 1 : 1;
        const foot = unit * u.elongate;
        const dur = foot / u.subdivide;
        const span = foot * u.repeat;
        if (local >= base - EPS && local < base + span - EPS) {
          const lapIn = Math.floor((local - base) / foot + EPS);
          const slot = Math.floor(mod(local - base, foot) / dur + EPS);
          hit = { atom: u.atom, offset: base + lapIn * foot + slot * dur, dur };
          break;
        }
        base += span;
      }
      if (!hit) break;
      const a = hit.atom;
      if (a.kind === 'note' || a.kind === 'chord') {
        if (o.kit && a.kind === 'note') {
          const v = voiceFor(result, o, a.value);
          if (v) {
            mark(v.voice);
            voices.add(cellId(v.voice));
            edges.add(edgeId(cellId(o.voice), cellId(v.voice)));
          }
        } else if (!o.kit && !chainMuted(result, table, muted)) {
          if (a.kind === 'note') markChain(at, table, tShift, a.value, a.alter);
          else a.notes.forEach((v, j) => markChain(at, table, tShift, v, a.alters[j]));
        }
        break;
      }
      if (a.kind !== 'ref') break;
      edges.add(edgeId(cellId(at), cellId(a.name)));
      const span = stepsOf(result, a.name, a.pick) || 1;
      local = Math.min(span - EPS, Math.max(0, ((local - hit.offset) / hit.dur) * span));
      at = a.name;
      pick = a.pick;
      extra = a.shift;
      ctx = table;
      ctxShift = tShift;
    }
  }
  const phases = new Map<string, number>();
  for (const c of result.cells.values())
    if (c.clock && !c.voice) {
      const s = clk.stepOf(c.clock) * c.rate;
      phases.set(c.name, s - Math.floor(s));
    }
  // an edge with a switched-off end is never live, whichever path marked it
  for (const id of [...edges]) {
    const [a, b] = id.split(/->|~>/);
    if (muted.has(a) || muted.has(b)) edges.delete(id);
  }
  return { seconds, shifts: now, cells, edges, voices, bars, phases };
}

/** Node ids that contribute to some sounding output (for dimming the rest). */
export function routedNodes(result: CompileResult, muted: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const o of result.outputs) {
    if (!outputSounds(result, o, muted)) continue;
    const found = new Set<string>();
    let sounding = false;
    const seen = new Set<string>();
    const walk = (n: string, ctx: string) => {
      const cell = result.cells.get(n)!;
      const table = cell.root ? n : (cell.over ?? ctx);
      if (seen.has(`${n}|${table}`) || muted.has(cellId(n))) return;
      seen.add(`${n}|${table}`);
      if (cell.hasValues) {
        if (chainMuted(result, table, muted)) return;
        for (const t of tableChain(result, table)) found.add(cellId(t));
        sounding = true;
      }
      found.add(cellId(n));
      for (const child of cell.children.keys()) walk(child, table);
    };
    walk(o.cell, ROOT);
    if (!sounding) continue;
    for (const id of found) out.add(id);
    out.add(cellId(o.voice));
    for (const t of o.through) out.add(cellId(t));
    if (o.envelopeCell && !muted.has(cellId(o.envelopeCell))) out.add(cellId(o.envelopeCell));
    for (const part of o.parts)
      if (!muted.has(cellId(part.mix)) && !muted.has(cellId(part.sink))) out.add(cellId(part.mix)).add(cellId(part.sink));
    // picked by a selector: it, its table of parts and the part are on the way
    for (const x of o.select) {
      out.add(cellId(x.cell)).add(cellId(result.cells.get(x.cell)!.over!)).add(cellId(x.part));
      // and what its steps are spliced from (a score it reads: &leftEar … &scenes)
      for (const child of result.cells.get(x.cell)!.children.keys()) if (!muted.has(cellId(child))) out.add(cellId(child));
    }
    for (const m of [...o.mods, ...o.levels])
      if (!muted.has(cellId(m.cell))) {
        out.add(cellId(m.cell));
        const mc = result.cells.get(m.cell)!;
        for (const t of tableChain(result, mc.over ?? mc.context)) out.add(cellId(t));
        if (mc.clock) for (const t of tableChain(result, mc.clock)) out.add(cellId(t));
      }
    if (o.kit) for (const k of result.cells.get(o.voice)!.children.keys()) if (!muted.has(cellId(k))) out.add(cellId(k));
    // the step= chain that moves it, down to its clock
    for (let at: string | null = o.cell, g = 0; at && g < 64; g++) {
      const st: ResolvedCell['step'] = result.cells.get(at)?.step ?? null;
      if (!st) break;
      out.add(cellId(st.driver));
      at = st.driver;
    }
    const clock = result.cells.get(o.cell)!.clock!;
    for (const t of tableChain(result, clock)) out.add(cellId(t));
  }
  // tapes: a note tape's output — its read head and its tape (and what moves the tape); a sound
  // tape's read heads in mixes — the head, the tape, what moves it, what it records, the sound card
  const chain = (n: string) => {
    for (let at: string | null = n, g = 0; at && g < 64; g++) {
      if (muted.has(cellId(at))) break;
      out.add(cellId(at));
      at = result.cells.get(at)?.step?.driver ?? null;
    }
  };
  for (const o of result.outputs)
    if (o.tape && out.has(cellId(o.cell)) && !muted.has(cellId(o.tape.head))) {
      out.add(cellId(o.tape.head));
      chain(o.tape.tape);
    }
  for (const r of result.returns) {
    const tp = result.tapes.find((t) => t.name === r.tape);
    if (!tp || muted.has(cellId(r.head)) || muted.has(cellId(r.tape)) || !out.has(cellId(tp.source))) continue;
    out.add(cellId(r.head));
    chain(r.tape);
    for (const c of result.cells.values()) if (c.sink && !muted.has(cellId(c.name))) out.add(cellId(c.name));
  }
  return out;
}


/**
 * A cell's value at real second t (for an oscilloscope): the entry of its braid it's at, its clock
 * says — null in a rest; a map=lin cell glides from one entry to the next.
 */
const flatCache = new WeakMap<CompileResult, Map<string, { statics: Shifts; flat: StepEvent[]; lap: number }>>();

export function valueAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number | null {
  const c = result.cells.get(name);
  if (!c?.clock) return null;
  const steps = (clk ?? clocking(result, statics, t)).stepOf(c.clock) * (c.clock === name ? 1 : c.rate);
  if (!Number.isFinite(steps)) return null;
  // (flattened once per program, shifts and cell: an oscilloscope asks a hundred times a frame)
  let byCell = flatCache.get(result);
  if (!byCell) flatCache.set(result, (byCell = new Map()));
  let hit = byCell.get(name);
  if (!hit || hit.statics !== statics) {
    const f = flatten(result, name, statics);
    byCell.set(name, (hit = { statics, flat: f, lap: f.length ? Math.max(...f.map((e) => e.step + e.duration)) : 0 }));
  }
  const { flat, lap } = hit;
  if (!flat.length) return null;
  if (!(lap > 0)) return null;
  const s = ((steps % lap) + lap) % lap;
  const i = flat.findIndex((e) => s >= e.step && s < e.step + e.duration);
  if (i < 0) return null;
  const e = flat[i];
  const v = e.value + e.alter;
  if (c.map?.kind !== 'lin') return v;
  const next = flat[(i + 1) % flat.length];
  return v + ((next.value + next.alter - v) * (s - e.step)) / e.duration;
}


/** Every value a cell sounds at real second t (a chord: all of it) — [] in a rest. */
export function valuesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number[] {
  const c = result.cells.get(name);
  if (!c?.clock) return [];
  const steps = (clk ?? clocking(result, statics, t)).stepOf(c.clock) * (c.clock === name ? 1 : c.rate);
  if (!Number.isFinite(steps)) return [];
  let byCell = flatCache.get(result);
  if (!byCell) flatCache.set(result, (byCell = new Map()));
  let hit = byCell.get(name);
  if (!hit || hit.statics !== statics) {
    const f = flatten(result, name, statics);
    byCell.set(name, (hit = { statics, flat: f, lap: f.length ? Math.max(...f.map((e) => e.step + e.duration)) : 0 }));
  }
  if (!(hit.lap > 0)) return [];
  const s = ((steps % hit.lap) + hit.lap) % hit.lap;
  return hit.flat.filter((e) => s >= e.step && s < e.step + e.duration).map((e) => e.value + e.alter);
}


/** Every note a cell sounds at real second t, with how long ago it began (seconds) — for envelopes. */
export function notesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): { value: number; since: number }[] {
  const c = result.cells.get(name);
  if (!c?.clock) return [];
  const steps = (clk ?? clocking(result, statics, t)).stepOf(c.clock) * (c.clock === name ? 1 : c.rate);
  if (!Number.isFinite(steps)) return [];
  valuesAt(result, statics, name, t, clk); // (fills the cache)
  const hit = flatCache.get(result)?.get(name);
  if (!hit || !(hit.lap > 0)) return [];
  const s = ((steps % hit.lap) + hit.lap) % hit.lap;
  const perStep = 1 / Math.max(1e-9, (result.clocks.get(c.clock)?.perSecond ?? 1) * (c.clock === name ? 1 : c.rate));
  return hit.flat.filter((e) => s >= e.step && s < e.step + e.duration).map((e) => ({ value: e.value + e.alter, since: (s - e.step) * perStep }));
}
