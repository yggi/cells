/**
 * What a cell sounds at a moment, for the views (an oscilloscope, a wheel, an
 * envelope): its braid flattened once per program, shifts and cell, and read
 * where its clock says it is.
 */
import type { CompileResult, Shifts } from './program';
import { clocking, type Clocking } from './clocking';
import { flatten, type StepEvent } from './flatten';

interface Flat {
  readonly statics: Shifts;
  readonly flat: StepEvent[];
  /** Its length in its own steps. */
  readonly lap: number;
}

// (flattened once per program, shifts and cell: an oscilloscope asks a hundred times a frame)
const flatCache = new WeakMap<CompileResult, Map<string, Flat>>();

function flatOf(result: CompileResult, statics: Shifts, name: string): Flat {
  let byCell = flatCache.get(result);
  if (!byCell) flatCache.set(result, (byCell = new Map()));
  let hit = byCell.get(name);
  if (!hit || hit.statics !== statics) {
    const f = flatten(result, name, statics);
    byCell.set(name, (hit = { statics, flat: f, lap: f.length ? Math.max(...f.map((e) => e.step + e.duration)) : 0 }));
  }
  return hit;
}

/** Where a cell is in its braid at real second t (in its own steps, within a lap), with its flattened braid; null if it isn't stepping. */
function readAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): { s: number; hit: Flat } | null {
  const c = result.cells.get(name);
  if (!c?.clock) return null;
  const steps = (clk ?? clocking(result, statics, t)).stepOf(c.clock) * (c.clock === name ? 1 : c.rate);
  if (!Number.isFinite(steps)) return null;
  const hit = flatOf(result, statics, name);
  if (!hit.flat.length || !(hit.lap > 0)) return null;
  return { s: ((steps % hit.lap) + hit.lap) % hit.lap, hit };
}

/**
 * A cell's value at real second t (for an oscilloscope): the entry of its braid it's at, its clock
 * says — null in a rest; a map=lin cell glides from one entry to the next.
 */
export function valueAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number | null {
  const r = readAt(result, statics, name, t, clk);
  if (!r) return null;
  const {
    s,
    hit: { flat },
  } = r;
  const i = flat.findIndex((e) => s >= e.step && s < e.step + e.duration);
  if (i < 0) return null;
  const e = flat[i];
  const v = e.value + e.alter;
  if (result.cells.get(name)?.map?.kind !== 'lin') return v;
  const next = flat[(i + 1) % flat.length];
  return v + ((next.value + next.alter - v) * (s - e.step)) / e.duration;
}

/** Every value a cell sounds at real second t (a chord: all of it) — [] in a rest. */
export function valuesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): number[] {
  const r = readAt(result, statics, name, t, clk);
  if (!r) return [];
  return r.hit.flat.filter((e) => r.s >= e.step && r.s < e.step + e.duration).map((e) => e.value + e.alter);
}

/** Every note a cell sounds at real second t, with how long ago it began (seconds) — for envelopes. */
export function notesAt(result: CompileResult, statics: Shifts, name: string, t: number, clk?: Clocking): { value: number; since: number }[] {
  const r = readAt(result, statics, name, t, clk);
  if (!r) return [];
  const c = result.cells.get(name)!;
  const perStep = 1 / Math.max(1e-9, (result.clocks.get(c.clock!)?.perSecond ?? 1) * (c.clock === name ? 1 : c.rate));
  return r.hit.flat.filter((e) => r.s >= e.step && r.s < e.step + e.duration).map((e) => ({ value: e.value + e.alter, since: (r.s - e.step) * perStep }));
}
