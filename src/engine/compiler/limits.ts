/**
 * After phase 6 (the outputs), the caps: a cell that would expand to more notes than the engine plays, or play more notes a second
 * than it can schedule. Each is an error that names its cap; the player keeps the last good compile meanwhile.
 * (The third cap, how deep unnamed cells &( … ) nest, is the parser's: MAX_NESTING in parser/scanner.ts.)
 */
import { countOf } from '../subseq';
import type { CellDecl, FreeSpec, Span } from '../ast';
import { MAX_EVENTS, MAX_NOTES_PER_SECOND, pickIndices, type Clock, type Output } from '../program';
import type { Cells, Ctx } from './context';

const many = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en') : 'unboundedly many');
// (an unnamed cell &( … ) by what the user wrote, not its generated name)
const named = (c: { name: string; lambda: string | null }) => (c.lambda ? 'An unnamed cell &( … )' : `&${c.name}`);

export function checkLimits(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, clocks: ReadonlyMap<string, Clock>, outputs: readonly Output[]): void {
  const { error, warn } = ctx;
  // ---- expansion: the notes a cell's braid stands for, every &ref spliced in (what flatten() makes)
  const unitCounts = new Map<string, number[]>();
  const visiting = new Set<string>();
  const countsOf = (name: string): number[] => {
    const known = unitCounts.get(name);
    if (known) return known;
    if (visiting.has(name)) return []; // (a loop is resolve's error)
    visiting.add(name);
    // (a subsequence: what its steps stand for, nested ones opened)
    const out = (cells.get(name)?.units ?? []).map((u) =>
      countOf(u, (a) => (a.kind === 'note' || a.kind === 'choice' ? 1 : a.kind === 'chord' ? a.notes.length : a.kind === 'ref' ? expansion(a.name, a.pick) : 0)),
    );
    visiting.delete(name);
    unitCounts.set(name, out);
    return out;
  };
  const expansion = (name: string, pick: Parameters<typeof pickIndices>[1] = null): number => {
    const all = countsOf(name);
    return (pickIndices(all.length, pick) ?? []).reduce((s, i) => s + all[i], 0);
  };
  // reported where it first goes over: on a cell over the cap whose own references are each within it
  const over = new Set<string>();
  for (const c of cells.values()) {
    if (c.implicit) continue;
    const counts = countsOf(c.name);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total <= MAX_EVENTS) continue;
    over.add(c.name);
    if (c.units.some((u) => u.atom.kind === 'ref' && expansion(u.atom.name, u.atom.pick) > MAX_EVENTS)) continue;
    const d = decls.get(c.name);
    const toks = d?.braid.kind === 'list' ? d.braid.tokens : [];
    let sum = 0;
    const at = counts.findIndex((n) => (sum += n) > MAX_EVENTS);
    const span: Span = toks[at]?.span ?? c.span;
    error(`${named(c)} expands to ${many(total)} notes: more than ${many(MAX_EVENTS)}, the most a cell can hold — repeat less (!n), or let a clock repeat it`, span);
  }
  // ---- rate: the notes a second a played cell starts (its clock's steps a second, its notes a lap)
  const reported = new Set<string>();
  // the fastest a played cell starts notes, by clock: what a rate left free(…) may be moved up to
  const fastest = new Map<string, number>();
  for (const o of outputs) {
    const c = cells.get(o.cell);
    if (!c?.clock || over.has(c.name) || reported.has(c.name) || c.params.law !== undefined) continue;
    const clock = clocks.get(c.clock);
    if (!clock) continue;
    const lap = Math.max(1, c.steps);
    const perSecond = (clock.perSecond * c.rate * expansion(c.name)) / lap;
    if (perSecond > (fastest.get(c.clock) ?? 0)) fastest.set(c.clock, perSecond);
    if (!(perSecond > MAX_NOTES_PER_SECOND)) continue;
    reported.add(c.name);
    const d = decls.get(c.name);
    const span = d?.step?.span ?? decls.get(c.clock)?.step?.span ?? c.span;
    error(`${named(c)} would start ${many(perSecond)} notes a second: more than ${many(MAX_NOTES_PER_SECOND)}, the most a cell can play — slow its step= or loop=`, span);
  }
  // a rate left free(…): its slider stops where the cap does (a value past it would be an error, and the player would keep the last piece that compiled, silently)
  for (const [name, perSecond] of fastest) {
    const c = cells.get(name);
    if (!c || !(perSecond > 0) || !Number.isFinite(perSecond)) continue;
    const top = (spec: FreeSpec) => Math.floor((spec.value * MAX_NOTES_PER_SECOND) / perSecond);
    const over = c.frees.filter((f) => (f.key === 'step' || f.key === 'loop') && f.value > 0 && f.hi > top(f) && top(f) >= f.value);
    if (!over.length) continue;
    (c as { frees: readonly FreeSpec[] }).frees = c.frees.map((f) => (over.includes(f) ? { ...f, hi: top(f) } : f));
    for (const f of over)
      warn(
        `${f.key}=free(…): moved up to ${many(f.hi)}, a cell &${name} clocks would start more than ${many(MAX_NOTES_PER_SECOND)} notes a second, the most a cell can play: the slider stops at ${many(top(f))}`,
        f.span,
      );
  }
}
