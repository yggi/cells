/**
 * Small readers of a compiled cell, shared by the engine, the layout and the components (#317): its channels (the
 * &refs in its braid), its own rate against its clock, how many steps a second that makes, its lap, and how far it
 * has stepped at a time. Each was written out at several places; what it means is in docs/language/time.md.
 */
import type { Clocking } from './clocking';
import type { CompileResult, ResolvedCell } from './program';
import { leaves } from './subseq';

/**
 * The cells a braid splices in (its `&ref`s), in order and as often as written: a kit's members, a scope's channels,
 * a table's entries; those inside a subsequence too. A missing cell has none.
 */
export function refsOf(cell: ResolvedCell | undefined): string[] {
  return (cell?.units ?? []).flatMap((u) => leaves(u.atom).flatMap((a) => (a.kind === 'ref' ? [a.name] : [])));
}

/** Its own steps per step of its clock: 1 when it is its own clock (a meter), else its rate (step=). */
export function ownRate(cell: ResolvedCell): number {
  return cell.clock === cell.name ? 1 : cell.rate;
}

/** How many of its own steps a clocked cell takes a second (its clock's, times its own rate); null: no clock. */
export function stepsPerSecond(result: CompileResult, name: string): number | null {
  const c = result.cells.get(name);
  const clock = c?.clock ? result.clocks.get(c.clock) : undefined;
  return c && clock ? clock.perSecond * ownRate(c) : null;
}

/** Its lap in steps, at least 1 (a missing cell: 1): a playhead `local` steps in is `local / lapOf(…)` round its wheel. */
export function lapOf(result: CompileResult, name: string): number {
  return Math.max(1, result.cells.get(name)?.steps ?? 1);
}

/** How many of its own steps it has taken at the clocking's time (no clock of its own: the clock of its name). */
export function stepsAt(clk: Clocking, cell: ResolvedCell): number {
  return clk.stepOf(cell.clock ?? cell.name) * ownRate(cell);
}
