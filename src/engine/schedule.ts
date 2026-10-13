/**
 * What to play next: everything the sound needs for a window of the piece, as plain data — the notes that
 * start in it and, for sound tapes on a moving clock, their speed through it. Times are seconds at the
 * code's tempo; putting them on an audio clock is the player's business (audio/player.ts), and so is how
 * they sound (audio/voices.ts). Plain data on purpose: a window can be worked out anywhere — in this
 * thread, in a worker (audio/engine.worker.ts), offline (audio/render.ts) — and passed on by structured clone.
 */
import type { CompileResult } from './program';
import { clocking, tapeMotion } from './clocking';
import { eventsBetween, type Held, type Plan, type Played } from './realize';
import { ticksBetween, type ClockTicks } from './midiclock';

/** A sound tape's speed (1 on tempo) at moments through a window: its delays follow it. */
export interface TapeSpeed {
  readonly tape: string;
  readonly points: readonly { readonly at: number; readonly speed: number }[];
}

export interface Window {
  readonly from: number;
  readonly to: number;
  /** The notes that start in [from, to), in order, each naming its output (which mixes' wheels hear it). */
  readonly events: readonly Played[];
  /** Tapes whose speed moves (a moving clock, dropouts, wandering heads): sampled every SPEED_STEP. */
  readonly tapes: readonly TapeSpeed[];
  /** The MIDI clock's ticks that fall in it, on the main meter (midiclock.ts); none without one. */
  readonly clock?: ClockTicks | null;
}

/** How finely a tape's speed is sampled (seconds). */
const SPEED_STEP = 0.05;

/**
 * Each moving tape's speed from `from` to `to` (inclusive), every SPEED_STEP seconds. Tapes that run
 * steadily — on real time, without dropouts or wandering heads — need none and are left out.
 */
export function tapeSpeeds(p: Plan, from: number, to: number): TapeSpeed[] {
  if (!p.result.tapes.length) return [];
  const clk = clocking(p.result, p.statics);
  const out: TapeSpeed[] = [];
  for (const tp of p.result.tapes) {
    const motion = tapeMotion(p.result, clk, tp.name);
    if (!motion.moving && !tp.dropout && !tp.heads.some((h) => h.wander > 0)) continue;
    const points: { at: number; speed: number }[] = [];
    for (let x = from; x <= to; x += SPEED_STEP) points.push({ at: x, speed: motion.speed(x) });
    out.push({ tape: tp.name, points });
  }
  return out;
}

/**
 * The window [from, from + length): its notes, and its moving tapes' speeds (sampled a hair past the end,
 * so the last point of one window meets the first of the next). `held`: where the run of windows began (a drone's
 * note starts there: decision 028) and where its listener stops.
 */
export function windowAt(p: Plan, from: number, length: number, held: Held = {}): Window {
  return {
    from,
    to: from + length,
    events: eventsBetween(p, from, from + length, true, held),
    tapes: tapeSpeeds(p, from, from + length + 1e-9),
    clock: ticksBetween(p, from, from + length),
  };
}

/**
 * Pieces with physical clocks (a motor, a belt): a hand on one should be heard quickly, so the player
 * schedules them closer to now.
 */
export function isPhysical(result: CompileResult): boolean {
  for (const c of result.cells.values()) if (typeof c.params.motor === 'number' || typeof c.params.belt === 'number') return true;
  return false;
}

/**
 * A window's times put onto another clock, linearly: code second x sounds at `time + (x − from) × scale`
 * (a note's start, its bends, levels and moving parameters, a tape's speed points), and lengths are
 * stretched by `scale`. The player's clock runs `scale` seconds per code second (the tempo control).
 */
export function retime(w: Window, time: number, scale: number): { events: Played[]; tapes: TapeSpeed[]; clock: ClockTicks | null } {
  const at = (x: number) => time + (x - w.from) * scale;
  return {
    events: w.events.map((e) => ({
      ...e,
      at: at(e.at),
      code: e.code ?? e.at,
      dur: e.dur * scale,
      bends: e.bends.map((b) => ({ at: at(b.at), cents: b.cents, ramp: b.ramp })),
      levels: e.levels.map((l) => ({ at: at(l.at), level: l.level, ramp: l.ramp })),
      params:
        e.params && Object.fromEntries(Object.entries(e.params).map(([k, t]) => [k, t.kind === 'points' ? { ...t, points: t.points.map((x) => ({ ...x, at: at(x.at) })) } : t])),
      // (a glide's run's notes, which MIDI out sends: on the same clock)
      ...(e.legato && {
        legato: {
          glide: e.legato.glide * scale,
          notes: e.legato.notes.map((n) => ({ ...n, at: at(n.at), dur: n.dur * scale, bends: n.bends.map((b) => ({ ...b, at: at(b.at) })) })),
        },
      }),
    })),
    tapes: w.tapes.map((t) => ({ tape: t.tape, points: t.points.map((p) => ({ at: at(p.at), speed: p.speed })) })),
    clock: w.clock ? { first: w.clock.first, at: w.clock.at.map(at), before: at(w.clock.before) } : null,
  };
}
