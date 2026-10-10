// Lifted in idea from yggi/jambot apps/web/src/audio/band-output.ts @ 8cdb6b8 (a clock tick per laid step, six to a 16th), laid here through a meter's time map.

/**
 * MIDI clock, the pure part (#206): when the 24-a-beat ticks fall in a window of the piece. A beat is the main meter's:
 * the meter the piece's first played cell steps with, followed up its step= chain to the one with a rate of its own
 * (`scan(4 4 4 4)` is four beats a bar; `beat=` and `meter(…)` say how many steps make one). Tick k falls at that
 * meter's step k·beat/24, laid through its time map (`clocking.ts`), so the ticks swing with it, bend with a scan, and
 * speed up and slow down with a motor. Each tick's time is worked out from its index, never by adding up intervals, so
 * windows meet exactly. Sending them is the browser's business (`src/midi/clock-out.ts`).
 *
 * The MIDI clock is a lossy grid: 96 ticks to a 4/4 bar carry a 16th (6 ticks) and a triplet 8th (8), but a quintuplet
 * 16th falls at 19.2. It counts time; what falls between ticks still plays where it is written (docs/ui/midi.md).
 */
import { clocking, EPS } from './clocking';
import type { CompileResult } from './program';
import type { Plan } from './realize';

/** Ticks a beat (MIDI's 24 ppqn). */
export const PPQN = 24;

/** The meter the ticks follow: its cell (its clock) and how many of its steps make a beat. */
export interface MainMeter {
  readonly cell: string;
  readonly beat: number;
}

/** A window's ticks: the index of the first (from the piece's start), their times, and the time of the tick before it. */
export interface ClockTicks {
  readonly first: number;
  readonly at: readonly number[];
  /** When tick `first − 1` falls on the same grid (−Infinity before the first): how far apart the ticks are where the window starts. */
  readonly before: number;
}

const meters = new WeakMap<CompileResult, MainMeter | null>();

/**
 * The piece's main meter: the clock of its first played cell, followed up the step= chain to its root, the clock with a
 * rate of its own. It is a meter if it places steps in a bar (a scan, `meter(…)`), says what a beat is (`beat=`,
 * `swing=`), or other cells step with it; a lone cell stepping at a rate (`&tune step=4 0 2 4`) is not, and a piece
 * without one sends no clock.
 */
export function mainMeter(result: CompileResult): MainMeter | null {
  if (meters.has(result)) return meters.get(result)!;
  let found: MainMeter | null = null;
  const first = result.ok ? result.outputs.map((o) => result.cells.get(o.cell)?.clock).find((c) => !!c) : undefined;
  let name = first;
  for (let guard = 0; name && guard < 16; guard++) {
    const driver = result.cells.get(name)?.step?.driver;
    if (!driver || !result.clocks.has(driver)) break;
    name = driver;
  }
  const root = name ? result.clocks.get(name) : undefined;
  const cell = name ? result.cells.get(name) : undefined;
  if (root && cell && !root.belt) {
    const leads = [...result.cells.values()].some((c) => c.name !== cell.name && c.step?.driver === cell.name);
    if (root.positional || cell.leveled || root.swing !== undefined || cell.beat !== 1 || leads) found = { cell: cell.name, beat: cell.beat > 0 ? cell.beat : 1 };
  }
  meters.set(result, found);
  return found;
}

/**
 * The ticks that fall in [from, to) (code seconds), on the plan's main meter: none without one, none past the plan's end
 * (`laps=`, a clock run down), none where the meter has stopped.
 */
export function ticksBetween(p: Plan, from: number, to: number): ClockTicks | null {
  const meter = mainMeter(p.result);
  if (!meter || !(to > from)) return null;
  const map = clocking(p.result, p.statics).map(meter.cell);
  const per = meter.beat / PPQN; // (the meter's steps a tick)
  const end = Math.min(to, p.end);
  const tick = (k: number) => (k < 0 ? -Infinity : map.q(k * per));
  // (from the step the map puts at `from`, a tick back for rounding; then on by index, each time from its own k)
  const s = map.stepAt(Math.max(0, from));
  let k = Number.isFinite(s) ? Math.max(0, Math.floor(s / per - EPS) - 1) : 0;
  while (tick(k) < from && Number.isFinite(tick(k))) k++;
  // (a map that runs backwards at a hand, or rounding: step back while the tick before still falls in the window)
  while (k > 0 && tick(k - 1) >= from) k--;
  const at: number[] = [];
  for (let j = k; at.length < 100_000; j++) {
    const t = tick(j);
    if (!(t < end)) break;
    at.push(t);
  }
  return at.length ? { first: k, at, before: tick(k - 1) } : null;
}
