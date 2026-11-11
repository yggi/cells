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
