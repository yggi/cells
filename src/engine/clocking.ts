/**
 * Time: when each clock steps. A clock's time map (`timeMap`: swing, positions in
 * a bar, a motor or a belt bending it), all of a program's clocks at a moment
 * (`clocking`), and what that does to shifts (`shiftsAt`: a table turns as its
 * step= chain steps). Nothing loops by itself: every stepped cell's shift is a
 * function of time.
 */
import type { CompileResult, Clock, Shifts } from './program';
import { isPicked, period, shiftedUnits } from './helix';
import { beltWarp, onReset, warpOf, type Warp } from './physics';
import { mod } from '../theory/modes';

export const EPS = 1e-9;

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
    const c = result.cells.get(n);
    for (const k of c?.children.keys() ?? []) {
      // (a cell only picked from, &k[0] &k[$0], isn't played: it is a table, turning under its taps)
      const refs = c!.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === k ? [u.atom] : []));
      if (!refs.length || !refs.every((r) => isPicked(result, k, r.pick))) walk(k);
    }
  };
  // (a mix plays a cell on its own clock, picked or not)
  for (const o of result.outputs) for (const t of [o, ...o.mods, ...o.levels]) walk(t.cell);
  return out;
}

export interface Clocking {
  /** Fractional step count of a clock at `seconds`. */
  stepOf(clock: string): number;
  map(clock: string): TimeMap;
}

const belts = new WeakMap<CompileResult, Map<string, Warp>>();
// (a program's time maps, built once per shifts: a map reads its clock's braid, and the plan, shiftsAt and
// the views ask for one per note and per frame; a reset of the physics forgets them with the warps they read)
const built = new WeakMap<CompileResult, WeakMap<Shifts, Map<string, TimeMap>>>();
onReset((r) => {
  belts.delete(r);
  built.delete(r);
});

/**
 * The physics of a physical cell (a meter with a motor, or a belted cell): to put a hand on it, and
 * to read a belt's state. Null for a cell that turns ideally.
 */
export function physicsOf(result: CompileResult, statics: Shifts, cell: string): Warp | null {
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
export function varispeedOf(result: CompileResult, clock: string): number {
  const v = result.cells.get(result.clocks.get(clock)?.cell ?? '')?.params.varispeed;
  return typeof v === 'number' ? v : 0;
}

/** A program's clocks read at `seconds`: each clock's time map, and how many steps it has taken. */
export function clocking(result: CompileResult, statics: Shifts, seconds = 0): Clocking {
  let byShifts = built.get(result);
  if (!byShifts) built.set(result, (byShifts = new WeakMap()));
  const maps = byShifts.get(statics) ?? new Map<string, TimeMap>();
  byShifts.set(statics, maps);
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
 * times their stride. They come round after the table's own length, or
 * where cycle= says (more laps climb on the way).
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
    // a turning table comes round after its own length (a key of 12 after 12, a scale after 7, a
    // braid of chords after its chords); cycle= says otherwise (cycle=24: two laps, climbing, then round)
    const turns = Math.floor(c.rate * s + EPS) * c.stride;
    const wrap = c.wrap ?? (c.units.length || c.cycle);
    return base + (wrap > 0 ? mod(turns, wrap) : turns);
  };
}

/** Is it a selector (a cell reading a table whose entries are parts)? */
export function selects(result: CompileResult, name: string): boolean {
  const t = result.cells.get(result.cells.get(name)?.over ?? '');
  return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && !!result.cells.get(u.atom.name)?.mix && !result.cells.get(u.atom.name)?.sink);
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
