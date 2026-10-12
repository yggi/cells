/**
 * Where a braid's splices begin, in time (docs/notes/scalogram.md): the boundaries the code writes inside a braid
 * rather than as a clock. `&tune &a &b &end &c &d &end` is heard as six phrases; each step carries the cell its number
 * was written in (`StepEvent.cell`), and a boundary is where that changes from one step to the next. Korobeiniki's
 * boundary "nobody wrote", in the middle of each A, is `&end`'s. Set against the boundaries heard (`boundaries.ts`), the
 * splice tree (the tree Shorten folds) is checked from the sound.
 */
import { clocking } from '../clocking';
import { eventsBetween, type Plan } from '../realize';

/** A splice boundary: when, the cell that begins there and the one before it, and the output it is in. */
export interface Splice {
  readonly at: number;
  readonly cell: string;
  readonly after: string;
  readonly output: string;
}

/**
 * Every splice boundary from 0 to `until` seconds where its output then plays a note within the boundary's step (a
 * part a selector keeps silent there has none you could hear), one a moment (to the millisecond) and output.
 */
export function splices(p: Plan, until: number): Splice[] {
  const clk = clocking(p.result, p.statics);
  const notes = eventsBetween(p, 0, until, true, { until });
  const heard = new Map<string, number[]>();
  for (const e of notes) {
    if (!e.output) continue;
    const ts = heard.get(e.output);
    if (ts) ts.push(e.at);
    else heard.set(e.output, [e.at]);
  }
  for (const ts of heard.values()) ts.sort((a, b) => a - b);
  const out: Splice[] = [];
  const seen = new Set<string>();
  for (const t of p.tracks) {
    const events = [...t.events].sort((a, b) => a.step - b.step);
    if (new Set(events.map((e) => e.cell)).size < 2) continue;
    const tm = clk.map(t.clock);
    const last = Math.min(until, t.end);
    const steps = tm.stepAt(Math.max(0, last)) * t.rate;
    if (!Number.isFinite(steps)) continue;
    const times = heard.get(t.output.id) ?? [];
    for (let lap = 0; lap * t.period < steps; lap++)
      events.forEach((e, k) => {
        const before = k > 0 ? events[k - 1] : events[events.length - 1];
        if (e.cell === before.cell || (k === 0 && lap === 0)) return;
        const s = lap * t.period + e.step;
        const at = tm.q(s / t.rate);
        const next = tm.q((s + Math.max(1, e.duration)) / t.rate);
        if (!Number.isFinite(at) || at >= last) return;
        // (a note of this output within the boundary's step: it is heard to begin; the times are sorted)
        const i = firstFrom(times, at - 1e-3);
        if (!(i < times.length && times[i] < next - 1e-3)) return;
        const key = `${t.output.id}|${at.toFixed(3)}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ at, cell: e.cell, after: before.cell, output: t.output.id });
      });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The first index of the sorted `xs` at or after `x` (xs.length if none). */
function firstFrom(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
