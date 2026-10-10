/**
 * Taps of a meter's bus (decision 016, declare.ts: `taps`): a section is a tap, and a selector reading the table of taps
 * switches it. What a tap steps (its cell, or a cell stepped from a cell it steps) plays while a selector picks the tap,
 * starting again from its top each time it is picked: an output's `select`, as for a selector of mixes (realize.ts).
 */
import type { Cells } from './context';
import type { Output } from '../program';

/** The outputs, each one stepped through a tap picked by the selectors that read its table. */
export function tapped(outputs: readonly Output[], cells: Cells, taps: ReadonlyMap<string, string>): Output[] {
  if (!taps.size) return [...outputs];
  const readers = (table: string) => [...cells.values()].filter((c) => c.over === table && c.clock);
  return outputs.map((o) => {
    // up its chain of step= drivers to a tap
    let c = cells.get(o.cell);
    for (let guard = 0; c?.step && guard < 32; guard++) {
      const tap = c.step.driver;
      const table = taps.get(tap);
      if (table) {
        const entry = cells.get(table)!.units.findIndex((u) => u.atom.kind === 'ref' && u.atom.name === tap);
        const select = readers(table).map((s) => ({ cell: s.name, entry, part: tap }));
        // (the selectors, the table and the tap are on its way: live while it plays)
        const via = [...new Set([...o.via, ...select.map((x) => x.cell), table, tap])];
        return select.length ? { ...o, via, select: [...o.select, ...select] } : o;
      }
      c = cells.get(tap);
    }
    return o;
  });
}
