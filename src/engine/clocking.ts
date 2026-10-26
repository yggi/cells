/**
 * Time: when each clock steps. A clock's time map (`timeMap`: swing, positions in
 * a bar, a motor or a belt bending it), all of a program's clocks at a moment
 * (`clocking`), and what that does to shifts (`shiftsAt`: a table turns as its
 * step= chain steps). Nothing loops by itself: every stepped cell's shift is a
 * function of time.
 */
import type { CompileResult, Clock, Shifts } from './program';
import { isPicked, isRelativePick, period, shiftedUnits, tableUnits } from './helix';
import { footOf, leaves, slots, type Laps } from './subseq';
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
  // (a tap reads its meter unswung: its own positions carry the swing, #18)
  if (clock.tap) return tapMap(clock.tap, plainMap(result, result.clocks.get(clock.tap.meter)!, shifts));
  const plain = plainMap(result, clock, shifts);
  return clock.swung ? swungMap(clock.swung, plain) : plain;
}

/**
 * A meter's own steps under its swing (#18): step i of each bar where `swung` puts it, in its steps, laid through the
 * meter's map as it would be unswung; fractional steps interpolate between them.
 */
function swungMap(swung: readonly number[], inner: TimeMap): TimeMap {
  const k = Math.max(1, swung.length);
  const at = (i: number) => (i < k ? swung[i] : k);
  const S = (s: number) => {
    const j = Math.floor(s);
    const b = Math.floor(j / k);
    const i = j - b * k;
    return b * k + at(i) + (s - j) * (at(i + 1) - at(i));
  };
  const back = (x: number) => {
    const b = Math.floor(x / k);
    const r = x - b * k;
    let i = 0;
    while (i + 1 < k && at(i + 1) <= r) i++;
    const span = at(i + 1) - at(i);
    return b * k + i + (span > 0 ? (r - at(i)) / span : 0);
  };
  return { beats: inner.beats, q: (s) => inner.q(S(s)), stepAt: (t) => back(inner.stepAt(t)), ...(inner.speed ? { speed: inner.speed } : {}) };
}

/** A clock's time map before a meter's swing: a rate, pairs of a list's steps swung, or a scan's positions. */
function plainMap(result: CompileResult, clock: Clock, shifts: Shifts): TimeMap {
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
 * A tap's time map (decision 040): its step j at the position the tap gives it in its lap (the bar, or cycle= bars), in
 * the meter's steps, and that laid through the meter's own map — so it swings, bends with a scan and runs with a motor
 * as the meter does, and comes round at the bar. Fractional steps interpolate within the meter's steps.
 */
function tapMap(tap: NonNullable<Clock['tap']>, meter: TimeMap): TimeMap {
  const { positions, lap } = tap;
  const k = Math.max(1, positions.length);
  // even steps (16n in 4/4, pulse, 8t): a rate on the meter, worked out as one — the same floats as step=&bar*4 had
  if (positions.every((p, i) => Math.abs(p - (i * lap) / k) < 1e-9))
    return { beats: k, q: (j) => meter.q((j * lap) / k), stepAt: (t) => (meter.stepAt(t) * k) / lap, ...(meter.speed ? { speed: meter.speed } : {}) };
  const at = (i: number) => (i < k ? positions[i] : lap);
  const meterStep = (j: number) => {
    const n = Math.floor(j);
    const b = Math.floor(n / k);
    const i = n - b * k;
    return b * lap + at(i) + (j - n) * (at(i + 1) - at(i));
  };
  const stepAt = (t: number) => {
    const m = meter.stepAt(t);
    // (plain arithmetic, no snapping: a tap that says what step=&bar*2 said lands on the same floats)
    const b = Math.floor(m / lap);
    const r = m - b * lap;
    let i = 0;
    while (i + 1 < k && at(i + 1) <= r) i++;
    const span = at(i + 1) - at(i);
    return b * k + i + (span > 0 ? (r - at(i)) / span : 0);
  };
  return { beats: k, q: (j) => meter.q(meterStep(j)), stepAt, ...(meter.speed ? { speed: meter.speed } : {}) };
}

/**
 * Cells whose braid is played — the terms of every out (triggers and
 * modulators) and everything they splice: their own notes read their moving
 * shift as a playhead, not a turn of a table (`playing`).
 */
export function playedCells(result: CompileResult): ReadonlySet<string> {
  let out = playedCache.get(result);
  if (out) return out;
  playedCache.set(result, (out = new Set<string>()));
  const walk = (n: string) => {
    if (out.has(n)) return;
    out.add(n);
    const c = result.cells.get(n);
    for (const k of c?.children.keys() ?? []) {
      // (a cell only picked from, &k[0] &k[$0], isn't played: it is a table, turning under its picks)
      const refs = c!.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === k ? [u.atom] : []));
      if (!refs.length || !refs.every((r) => isPicked(result, k, r.pick))) walk(k);
    }
  };
  // (a mix plays a cell on its own clock, picked or not)
  // (a drone's cell is its voice: a waveform, not a braid played)
  for (const o of result.outputs) for (const t of [...(o.drone ? [] : [o]), ...o.mods, ...o.levels]) walk(t.cell);
  return out;
}

const playedCache = new WeakMap<CompileResult, Set<string>>();
const readCache = new WeakMap<CompileResult, Set<string>>();

/**
 * Cells a line reads through (#203): every over= (and the table a cell without one is shown through), every grid, and
 * every cell a relative pick reads (`&k[0]`, a fixed reader following it as it turns). A played cell turns in
 * `shiftsAt` only when it is one of these: its own notes read their shift as a playhead (`playing`).
 */
export function readThrough(result: CompileResult): ReadonlySet<string> {
  let out = readCache.get(result);
  if (out) return out;
  readCache.set(result, (out = new Set<string>()));
  for (const c of result.cells.values()) {
    if (c.root) out.add(c.name);
    if (c.over) out.add(c.over);
    if (!c.root) out.add(c.context);
    for (const u of c.units) if (u.atom.kind === 'ref' && isRelativePick(result, u.atom.name, u.atom.pick)) out.add(u.atom.name);
  }
  return out;
}

export interface Clocking {
  /** Fractional step count of a clock at `seconds`. */
  stepOf(clock: string): number;
  map(clock: string): TimeMap;
  /** A clock's time map as written: a swung meter's taps without its swing (#287), else its map. */
  written(clock: string): TimeMap;
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
  const map = (clock: string): TimeMap => {
    let m = maps.get(clock);
    if (!m) {
      const info = result.clocks.get(clock)!;
      // a tap: through its meter's map as the meter moves (physics and all), unswung: its positions carry the swing (#18)
      if (info.tap) m = tapMap(info.tap, base(info.tap.meter));
      else m = info.swung ? swungMap(info.swung, base(clock)) : base(clock);
      maps.set(clock, m);
    }
    return m;
  };
  // (a clock's map before a meter's swing, kept beside it: what a tap reads; no cell's name holds a NUL)
  const base = (clock: string): TimeMap => {
    let m = maps.get(`${clock}\0plain`);
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
        const ideal = plainMap(result, info, statics);
        // a clock with a motor turns physically: its time warped (spin-up, sag under load, running down)
        const w = warpOf(result, info.cell);
        m = w ? { beats: ideal.beats, q: (st) => w.real(ideal.q(st)), stepAt: (t) => ideal.stepAt(w.nominal(t)), speed: (t) => w.speed(t) } : ideal;
      }
      maps.set(`${clock}\0plain`, m);
    }
    return m;
  };
  const written = (clock: string): TimeMap => {
    const tap = result.clocks.get(clock)?.tap;
    if (!tap?.written) return map(clock);
    let m = maps.get(`${clock}\0written`);
    if (!m) maps.set(`${clock}\0written`, (m = tapMap({ ...tap, positions: tap.written }, base(tap.meter))));
    return m;
  };
  return { map, written, stepOf: (clock) => map(clock).stepAt(Math.max(0, seconds)) };
}

/**
 * Shifts at a moment, as a line reading through them sees them: the static shift, plus — for stepped cells a line
 * reads through (`readThrough`), played or not — the turns their step= chain has made, times their stride. A table that also plays turns
 * for what reads through it, so a reader sees the entry sounding (#167). A table turns by its braid's own steps (#122):
 * an entry held `@n` (or `_`) or repeated `!n` stays in force n steps, and a subsequence's steps turn within its step.
 * They come round after the braid's own length, or where cycle= says (more laps climb on the way). A played cell's own
 * notes read their own shift as it stands (`playing`), so a played cell nothing reads through doesn't turn (#203).
 */
export function shiftsAt(result: CompileResult, statics: Shifts, seconds: number): Shifts {
  const clk = clocking(result, statics, seconds);
  const played = playedCells(result);
  const read = readThrough(result);
  const steps = new Map<string, number>();
  return (name) => {
    const base = statics(name);
    const c = result.cells.get(name);
    // a meter (a clock of its own) places time: read as a table, it doesn't turn;
    // a selector sequences its parts: it steps, it doesn't turn either
    // … and what loops (loop=) oscillates: it doesn't turn either
    // … and a played cell nothing reads through is a braid played, not a table turning (#203)
    if (!c || !c.step || !c.clock || result.clocks.has(name) || selects(result, name) || c.loops || (played.has(name) && !read.has(name))) return base;
    let s = steps.get(c.clock);
    if (s === undefined) steps.set(c.clock, (s = clk.stepOf(c.clock)));
    // a turning table comes round after its own length (a key of 12 after 12, a scale after 7, a
    // braid of chords after its chords); cycle= says otherwise (cycle=24: two laps, climbing, then round)
    const step = Math.floor(c.rate * s + EPS);
    const turns = step * c.stride;
    const own = ownSteps(result, name);
    if (!own) {
      const wrap = c.wrap ?? ownLength(result, name);
      return base + (wrap > 0 ? mod(turns, wrap) : turns);
    }
    // (a subsequence turns within its step: how far through it)
    const at = turns + Math.min(1 - EPS, Math.max(0, c.rate * s - step));
    const wrap = c.wrap ?? own.length;
    const b = wrap > 0 ? mod(at, wrap) : at;
    const lap = Math.floor(b / own.length);
    return base + lap * own.entries + own.inForce(b - lap * own.length, Math.floor(at / own.length));
  };
}

/**
 * Shifts as a played cell's own notes read them (#167): its moving shift is its playhead, the steps its braid has
 * played, so its own shift is the static one (a played grid's notes, a relative pick's entry as a mix plays it); every
 * table it reads through turns as `shiftsAt` turns it, played or not.
 */
export const playing =
  (now: Shifts, statics: Shifts, cell: string): Shifts =>
  (name) =>
    name === cell ? statics(name) : now(name);

/** Where a turning table comes round by itself: its braid's own length in steps (a key of 12 after 12, `[0,2,4]@3 [5,7,9]` after 4). */
export const ownLength = (result: CompileResult, name: string) => {
  const c = result.cells.get(name)!;
  return ownSteps(result, name)?.length ?? (c.units.length || c.cycle);
};

/** A turn of a table's braid: from `at` (in its steps, within a lap) entry `index` is in force, on the laps `laps` says. */
interface Turn {
  readonly at: number;
  readonly index: number;
  readonly laps?: Laps;
}

/** How a table turns by its own steps: its braid's length in steps, its entries, and the entry in force at a step of a lap. */
interface OwnSteps {
  readonly length: number;
  readonly entries: number;
  inForce(at: number, lap: number): number;
}

const ownCache = new WeakMap<CompileResult, Map<string, OwnSteps | null>>();

/**
 * A table whose steps aren't one entry each (`@n`, `_`, `!n`, a subsequence): which entry is in force when, as its braid
 * would play (subseq.ts `slots`: `<a b>` by lap, a choice its first option). Null when every step is one entry, where
 * the step count is the entry.
 */
function ownSteps(result: CompileResult, name: string): OwnSteps | null {
  let cache = ownCache.get(result);
  if (!cache) ownCache.set(result, (cache = new Map()));
  if (cache.has(name)) return cache.get(name)!;
  const units = result.cells.get(name)!.units;
  let own: OwnSteps | null = null;
  if (units.some((u) => u.repeat !== 1 || u.elongate !== 1 || u.atom.kind === 'seq')) {
    const first: number[] = [];
    let n = 0;
    for (const u of units) {
      first.push(n);
      n += u.atom.kind === 'seq' ? leaves(u.atom).length : 1;
    }
    const turns: Turn[] = slots(units, () => 1)
      .filter((sl) => !sl.chosen || sl.chosen.every((p) => p.is === 0))
      .map((sl) => {
        const u = units[sl.top];
        const index = first[sl.top] + (u.atom.kind === 'seq' ? leaves(u.atom).indexOf(sl.atom) : 0);
        return { at: sl.at, index, ...(sl.laps ? { laps: sl.laps } : {}) };
      })
      .sort((x, y) => x.at - y.at);
    const length = units.reduce((t, u) => t + footOf(u.atom, () => 1) * u.elongate * u.repeat, 0);
    const sounds = (t: Turn, lap: number) => !t.laps || mod(lap, t.laps.of) === t.laps.is;
    const entries = tableUnits(result, name).length;
    own = {
      length,
      entries,
      inForce(at, lap) {
        // the last turn begun on this lap, the first written of those begun together (none yet: the last of the lap
        // before, a lap down)
        let found: Turn | undefined;
        for (const t of turns) if (t.at <= at + EPS && sounds(t, lap) && (!found || t.at > found.at + EPS)) found = t;
        if (found) return found.index;
        for (const t of turns) if (sounds(t, lap - 1) && (!found || t.at > found.at + EPS)) found = t;
        return found ? found.index - entries : 0;
      },
    };
  }
  cache.set(name, own);
  return own;
}

/** Is it a selector (a cell reading a table of sections: decision 016)? */
export function selects(result: CompileResult, name: string): boolean {
  const table = result.cells.get(name)?.over ?? '';
  const t = result.cells.get(table);
  return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && result.sections?.get(u.atom.name) === table);
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
