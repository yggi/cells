/**
 * A recompiled piece anchored where it is heard (#56): when a tempo moves (a `free()` slider rewrites the text), the new
 * plan's time map starts from 0 at the piece's start, so asking it for the second being heard would jump the beat.
 * `keepBeat` says where in the new plan the old one's position continues: the second at which the new plan's beat clock
 * has taken the steps the old one had taken, its fraction of a beat included. Played on from there, the beat in progress
 * keeps its place and only what follows runs at the new rate: an onset the old plan had `d` seconds ahead comes `d`
 * times the old rate over the new one.
 *
 * The beat clock is the piece's main meter (`midiclock.ts`), its own steps (a swing's taps lean within them, a bend's
 * scan places them); a piece without one is followed by its first played line's clock. Where either plan has none, or
 * they can't be read, the new plan continues at the same second: a load as it was before an anchor.
 */
import { clocking } from './clocking';
import { mainMeter } from './midiclock';
import type { Plan } from './realize';

/** The clock whose steps are the piece's position: its main meter, else the clock its first played line steps with. */
function beatClock(p: Plan): string | null {
  if (!p.result.ok) return null;
  const meter = mainMeter(p.result);
  if (meter) return meter.cell;
  const first = p.tracks[0]?.clock;
  return first && p.result.clocks.has(first) ? first : null;
}

/**
 * The second of `after` at which `before`, heard at its second `seconds`, goes on: where `after`'s beat clock has taken as
 * many steps as `before`'s had. A frontend swapping plans asks `after` from there what it would have asked `before` from
 * `seconds` on, each second of `after` past it one second later (Cell studio's plan swap, Jambot's seam; the host does
 * it for a `load` that carries `anchor`).
 */
export function keepBeat(before: Plan, after: Plan, seconds: number): number {
  const was = beatClock(before);
  const now = beatClock(after);
  if (!was || !now || !(seconds > 0)) return seconds;
  const steps = clocking(before.result, before.statics).map(was).stepAt(seconds);
  const at = clocking(after.result, after.statics).map(now).q(steps);
  return Number.isFinite(at) && at >= 0 ? at : seconds;
}

/** Where a recompiled plan takes over (#701): the old plan's second at the bar line it waits for, and the new plan's there. */
export interface KeptBar {
  /** The second of `before` at the next bar line of its main meter: `before` answers up to it. */
  readonly line: number;
  /** The second of `after` that goes on from there: `keepBeat(before, after, line)`. */
  readonly at: number;
}

// (how finely a bar is compared, in points a step of the beat clock: 24, as the MIDI clock's ticks a beat)
const GRAIN = 24;

/** The steps of a plan's beat clock that make a bar: a meter's steps, a scan's entries. */
function barSteps(p: Plan, clock: string): number {
  const levels = p.result.cells.get(clock)?.meter?.levels.length;
  return Math.max(1, levels ?? clocking(p.result, p.statics).map(clock).beats);
}

/**
 * Where a recompiled plan waits for the bar line (#701, decision 081 §3): `before`, heard at its second `seconds`, keeps
 * the bar it is in when `after` places that bar otherwise than at another tempo (a swing's share or a bend's depth moved:
 * the bar's points, as its beat clock plays them, at other shares of the bar's length). Then `before` answers up to the
 * next bar line and `after` from there, anchored at it, the line no time map moves. Null where nothing waits: the two
 * place the bar alike (a tempo moved alone keeps #56's behaviour, the beat in progress kept and what follows at the new
 * rate at once), `seconds` is on a bar line, or either plan has no beat clock or bars of another length.
 */
export function keepBar(before: Plan, after: Plan, seconds: number): KeptBar | null {
  const was = beatClock(before);
  const now = beatClock(after);
  if (!was || !now || !(seconds > 0)) return null;
  const bar = barSteps(before, was);
  if (barSteps(after, now) !== bar) return null;
  const old = clocking(before.result, before.statics).map(was);
  const steps = old.stepAt(seconds);
  if (!Number.isFinite(steps)) return null;
  const b = Math.floor(steps / bar + 1e-9);
  const next = (b + 1) * bar;
  if (Math.abs(steps - b * bar) < 1e-9) return null;
  // (the bar as each plays it, its points as shares of its length: a tempo scales them all alike, a warp doesn't)
  const shares = (p: Plan, clock: string) => {
    const map = clocking(p.result, p.statics).played(clock);
    const start = map.q(b * bar);
    const length = map.q(next) - start;
    return Array.from({ length: bar * GRAIN - 1 }, (_, i) => (map.q(b * bar + (i + 1) / GRAIN) - start) / length);
  };
  const was$ = shares(before, was);
  const now$ = shares(after, now);
  if (was$.every((x, i) => Math.abs(x - now$[i]!) < 1e-9)) return null;
  const line = old.q(next);
  return Number.isFinite(line) && line > seconds ? { line, at: keepBeat(before, after, line) } : null;
}
