/**
 * The compiled Meter: one tree of groups and one time map for a bar, whether it was written as
 * `meter("4/4")` (levels, its steps even) or `scan(1 1 1 1)` (positions, no levels). A reader of
 * a bar (the swing clock, the MIDI clock) reads this and not how it was written.
 */
import { scan as scanOf } from '../theory/modes';

/** A group of steps [from, to) at a level: 0 the bar, then finer (1 a beat, 2 a half, 3 a subdivision, 4 finer). */
export interface MeterGroup {
  readonly level: number;
  readonly from: number;
  readonly to: number;
  readonly groups: readonly MeterGroup[];
}

export interface Meter {
  /** The bar: level 0 over all the steps, its groups nested by the levels. A scan's is flat, every step one group at level 1. */
  readonly tree: MeterGroup;
  /** Each step's level (a scan's: 1 each). */
  readonly levels: readonly number[];
  /** Each step's position in the bar, 0 ≤ p < lap (the time map's ticks). */
  readonly positions: readonly number[];
  /** The bar's length in those positions. */
  readonly lap: number;
}

/** meter(…): steps by level, a bar whose steps are even. */
export function meterOfLevels(levels: readonly number[]): Meter {
  const n = levels.length;
  const root: { level: number; from: number; to: number; groups: MeterGroup[] } = { level: 0, from: 0, to: n, groups: [] };
  const open = [root];
  for (let i = 1; i < n; i++) {
    const level = Math.max(1, levels[i]);
    while (open.length > 1 && open[open.length - 1].level >= level) open.pop();
    const group = { level, from: i, to: n, groups: [] as MeterGroup[] };
    // (a group ends where the next step of its level or coarser begins)
    for (let j = i + 1; j < n; j++) if (Math.max(1, levels[j]) <= level) ((group.to = j), (j = n));
    open[open.length - 1].groups.push(group);
    open.push(group);
  }
  return { tree: root, levels, positions: levels.map((_, i) => i), lap: n };
}

/** scan(…): positions in the bar, no levels: a flat tree. */
export function meterOfScan(steps: readonly number[]): Meter {
  const { positions, lap } = scanOf(steps);
  const groups = positions.map((_, i) => ({ level: 1, from: i, to: i + 1, groups: [] }));
  return { tree: { level: 0, from: 0, to: positions.length, groups }, levels: positions.map(() => 1), positions, lap };
}
