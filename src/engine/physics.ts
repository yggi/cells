/**
 * Physical clocks: a meter with a motor (motor=) is a body that turns — it has mass
 * (mass=), feels drag (friction=), and carries what it drives (their mass= and
 * friction=) as load. Its motor pulls towards the tempo with a torque that falls to
 * nothing at full speed (a real motor's curve); a spring that winds down (wind=
 * seconds) holds its pull, then gives out — 1 − (t/wind)⁴ — and the clock coasts to a stop.
 *
 * It doesn't replace the clock's time map — it warps it. Nominal time (where the
 * clock would be, ideal) runs at v per real second:
 *     M · dv/dt = motor · (1 − v) · spring(t) − F · v,       v(0) = 0 (from rest)
 * so a step due at nominal second s sounds when the clock has come that far.
 * Deterministic: fixed steps of 2 ms, the same every time.
 */
import type { CompileResult } from './program';

export interface Warp {
  /** Nominal seconds covered at real second t. */
  nominal(t: number): number;
  /** The real second at which nominal second s is reached (Infinity: never — it has stopped). */
  real(s: number): number;
  /** When it comes to rest (wind= run down), in real seconds — null if it never does. */
  stopsAt(): number | null;
  /** How fast it runs at real second t (1: on tempo). */
  speed(t: number): number;
  /**
   * A hand on it, from real second t: it's pulled hard towards the finger's speed (nominal units:
   * 1 = on tempo, 0 = held still, −1 = backwards) — null lets go. What's worked out past t is
   * thrown away and worked out again. Live only: nothing is kept with the piece.
   */
  grab(t: number, speed: number | null): void;
  /** Forget everything past real second t (something it's driven by changed there). */
  cut(t: number): void;
  /** A belt's state at t: how far it's stretched (driver ahead: +), and whether it's slipping. */
  state?(t: number): { stretch: number; slipping: boolean };
}

/** How hard a hand pulls: the share of the gap to the finger's speed closed each step of 2 ms (~13 ms to follow). */
const HAND = 0.15;

/**
 * A hand's history on one clock: from t on, the finger's speed (null: let go) — each for a moment
 * only (HOLD seconds): the finger vouches for no more than that. While it's down, it's renewed;
 * if it isn't, the hand counts as gone (and nothing waits forever on a hand that might be).
 */
type Hand = { t: number; speed: number | null }[];
const HOLD = 0.35;
const handAt = (hand: Hand, t: number) => {
  let h: Hand[number] | null = null;
  for (const x of hand) if (x.t <= t) h = x;
  return h && h.speed !== null && t <= h.t + HOLD ? h.speed : null;
};

/** Every warp of a program — a hand on one cuts the others (they may be driven by it). */
const family = new WeakMap<CompileResult, Set<Warp>>();
const join = (result: CompileResult, w: Warp) => {
  let set = family.get(result);
  if (!set) family.set(result, (set = new Set()));
  set.add(w);
  return w;
};

/** A hand on a physical clock (its cell's name), from real second t; null lets go. */
export function grab(result: CompileResult, w: Warp, t: number, speed: number | null): void {
  w.grab(t, speed);
  for (const other of family.get(result) ?? []) if (other !== w) other.cut(t);
}

/** Back to how it was written: every hand forgotten (each play starts clean — the hand doesn't count). */
export function resetPhysics(result: CompileResult): void {
  warps.delete(result);
  family.delete(result);
  resets.forEach((f) => f(result));
}
const resets: ((r: CompileResult) => void)[] = [];
/** (realize keeps its belts: it registers how to forget them) */
export const onReset = (f: (r: CompileResult) => void) => resets.push(f);

const DT = 0.002;
const HORIZON = 3600; // an hour of physics; past that, the last speed carries on

const warps = new WeakMap<CompileResult, Map<string, Warp | null>>();

/** The physics of a clock cell, if it has a motor (else null: ideal, as it always was). Once per program. */
export function warpOf(result: CompileResult, clock: string): Warp | null {
  let byClock = warps.get(result);
  if (!byClock) warps.set(result, (byClock = new Map()));
  if (!byClock.has(clock)) byClock.set(clock, makeWarp(result, clock));
  return byClock.get(clock)!;
}

function makeWarp(result: CompileResult, clock: string): Warp | null {
  const c = result.cells.get(clock);
  const num = (k: string, d: number) => (typeof c?.params[k] === 'number' ? (c!.params[k] as number) : d);
  if (!c || typeof c.params.motor !== 'number') return null;
  const motor = Math.max(1e-6, num('motor', 1));
  // the load: what this clock drives brings its mass and its drag
  let mass = Math.max(1e-6, num('mass', 1));
  let friction = Math.max(0, num('friction', 0));
  for (const d of result.cells.values()) {
    if (d.name === clock || d.step?.driver !== clock) continue;
    if (typeof d.params.mass === 'number') mass += d.params.mass;
    if (typeof d.params.friction === 'number') friction += d.params.friction;
  }
  const wind = num('wind', Infinity);
  // wow: the motor's target swings slowly (an off-centre capstan) by this fraction, 0.55 times a second
  const wow = num('wow', 0);
  // nominal time and speed at each step of 2 ms, worked out as far as asked
  const tau: number[] = [0];
  const vs: number[] = [0];
  let v = 0;
  let stopped = false;
  const hand: Hand = [];
  const extend = (until: number) => {
    while (!stopped && (tau.length - 1) * DT < Math.min(until, HORIZON)) {
      const t = (tau.length - 1) * DT;
      // a spring holds its pull, then gives out towards the end (as a music box's governor keeps it even)
      const spring = Number.isFinite(wind) ? Math.max(0, 1 - Math.pow(t / wind, 4)) : 1;
      const target = 1 + wow * Math.sin(2 * Math.PI * 0.55 * t);
      const held = handAt(hand, t);
      v += ((motor * (target - v) * spring - friction * v) / mass) * DT;
      // a hand: the speed pulled towards the finger's, a fixed share a step (stable, whatever the body)
      if (held !== null) v += (held - v) * HAND;
      if (!Number.isFinite(v)) v = 0;
      if (v < 0 && held === null) v = 0;
      tau.push(tau[tau.length - 1] + v * DT);
      vs.push(v);
      // run down: no torque left and hardly moving (2% of its speed) — it has stopped
      if (spring === 0 && held === null && v < 0.02) stopped = true;
    }
  };
  const cut = (t: number) => {
    const k = Math.max(1, Math.floor(t / DT));
    if (k >= tau.length) return;
    tau.length = k + 1;
    vs.length = k + 1;
    v = vs[k];
    stopped = false;
  };
  const last = () => ({ t: (tau.length - 1) * DT, s: tau[tau.length - 1] });
  return join(result, {
    grab(t: number, speed: number | null) {
      cut(t);
      hand.push({ t, speed });
    },
    cut,
    speed(t: number) {
      const h = 0.01;
      return Math.max(0, (this.nominal(t + h) - this.nominal(Math.max(0, t - h))) / (t + h - Math.max(0, t - h)));
    },
    stopsAt() {
      if (!Number.isFinite(wind)) return null;
      extend(HORIZON);
      return stopped ? (tau.length - 1) * DT : null;
    },
    nominal(t: number) {
      if (t <= 0) return 0;
      extend(t + DT);
      const i = t / DT;
      if (i >= tau.length - 1) {
        const l = last();
        return stopped ? l.s : l.s + (t - l.t) * v; // (past the horizon: the last speed)
      }
      const k = Math.floor(i);
      return tau[k] + (tau[k + 1] - tau[k]) * (i - k);
    },
    real(s: number) {
      if (s <= 0) return 0;
      // extend until reached, stopped, or the horizon (at most a minute past what's worked out, per ask)
      const cap = (tau.length - 1) * DT + 60;
      while (!stopped && tau[tau.length - 1] < s && (tau.length - 1) * DT < Math.min(HORIZON, cap)) extend((tau.length - 1) * DT + 10);
      if (tau[tau.length - 1] < s) {
        if (stopped || v <= 1e-9) return Infinity;
        const l = last();
        return l.t + (s - l.s) / v;
      }
      let lo = 0;
      let hi = tau.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tau[mid] < s) lo = mid;
        else hi = mid;
      }
      const span = tau[hi] - tau[lo];
      return (lo + (span > 0 ? (s - tau[lo]) / span : 0)) * DT;
    },
  });
}


/**
 * A belt: the driven cell is a body (mass=) pulled towards where its driver would put it (x, in the
 * driver's nominal seconds) by a spring (belt=, its stiffness) with damping (damping=). Past its grip
 * (slip=) the belt slips: the pull can't grow, and the cell falls behind for good. It may swing back,
 * but its time never runs backwards: where it would, it holds.
 */
export function beltWarp(result: CompileResult | null, k: number, m: number, c: number, slip: number, x: (t: number) => number): Warp {
  const ys: number[] = [0]; // its time, never running back (the top it has reached)
  const st: { y: number; v: number; off: number; px: number; stretch: number; slipping: boolean }[] = [{ y: 0, v: 0, off: 0, px: 0, stretch: 0, slipping: false }];
  let still = 0; // how long nothing has moved
  let stopped = false;
  const hand: Hand = [];
  const extend = (until: number) => {
    while (!stopped && (ys.length - 1) * DT < Math.min(until, HORIZON)) {
      const t = (ys.length - 1) * DT;
      const prev = st[st.length - 1];
      let { y, v, off } = prev;
      const xt = x(t + DT);
      const xv = (xt - prev.px) / DT;
      let stretch = xt - off - y;
      let slipping = false;
      if (k * Math.abs(stretch) > slip) {
        // slipping: the belt gives — what it can't pull is lost
        const keep = (Math.sign(stretch) * slip) / k;
        off += stretch - keep;
        stretch = keep;
        slipping = true;
      }
      const held = handAt(hand, t);
      v += ((k * stretch + c * (xv - v)) / m) * DT;
      // a hand: the speed pulled towards the finger's (a fixed share a step: stable on any belt)
      if (held !== null) v += (held - v) * HAND;
      if (!Number.isFinite(v)) v = 0;
      y += v * DT;
      ys.push(Math.max(ys[ys.length - 1], y));
      st.push({ y, v, off, px: xt, stretch, slipping });
      // at rest: its driver stopped, the cell still, the belt relaxed — it moves no more
      still = Math.abs(xv) < 1e-6 && Math.abs(v) < 1e-4 && Math.abs(stretch) < 1e-4 && held === null ? still + DT : 0;
      if (still > 0.5) stopped = true;
    }
  };
  const cut = (t: number) => {
    const kk = Math.max(1, Math.floor(t / DT));
    if (kk >= ys.length) return;
    ys.length = kk + 1;
    st.length = kk + 1;
    still = 0;
    stopped = false;
  };
  const nominal = (t: number) => {
    if (t <= 0) return 0;
    extend(t + DT);
    const i = Math.min(t / DT, ys.length - 1);
    const kk = Math.floor(i);
    return kk >= ys.length - 1 ? ys[ys.length - 1] : ys[kk] + (ys[kk + 1] - ys[kk]) * (i - kk);
  };
  const w: Warp = {
    nominal,
    real(s: number) {
      if (s <= 0) return 0;
      const cap = (ys.length - 1) * DT + 60;
      while (!stopped && ys[ys.length - 1] < s && (ys.length - 1) * DT < Math.min(HORIZON, cap)) extend((ys.length - 1) * DT + 10);
      if (ys[ys.length - 1] < s) return Infinity;
      let lo = 0;
      let hi = ys.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (ys[mid] < s) lo = mid;
        else hi = mid;
      }
      const span = ys[hi] - ys[lo];
      return (lo + (span > 0 ? (s - ys[lo]) / span : 0)) * DT;
    },
    stopsAt: () => null,
    speed(t: number) {
      const h = 0.01;
      return Math.max(0, (nominal(t + h) - nominal(Math.max(0, t - h))) / (t + h - Math.max(0, t - h)));
    },
    grab(t: number, speed: number | null) {
      cut(t);
      hand.push({ t, speed });
    },
    cut,
    state(t: number) {
      if (t <= 0) return { stretch: 0, slipping: false };
      extend(t + DT);
      const i = Math.min(Math.floor(t / DT), st.length - 1);
      // (a slip shows a moment: any in the last tenth of a second)
      let slipping = false;
      for (let j = Math.max(0, i - 50); j <= i; j++) if (st[j].slipping) slipping = true;
      return { stretch: st[i].stretch, slipping };
    },
  };
  return result ? join(result, w) : w;
}
