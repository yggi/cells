/**
 * Sections of an arrangement (decisions 016 and 044, declare.ts: `sections`): a stepped table of names declares them, and
 * a selector reading the table switches them. What a section steps (its cell, or a cell stepped from a cell it steps)
 * plays while a selector picks the section, starting again from its top each time it is picked: an output's `select`
 * (realize.ts).
 */
import type { Cells } from './context';
import type { Output } from '../program';

/** The outputs, each one stepped through a section picked by the selectors that read its table. */
export function sectioned(outputs: readonly Output[], cells: Cells, sections: ReadonlyMap<string, string>): Output[] {
  if (!sections.size) return [...outputs];
  const selectors = (table: string) => [...cells.values()].filter((c) => c.over === table && c.clock);
  return outputs.map((o) => {
    // up its chain of step= drivers to a section
    let c = cells.get(o.cell);
    for (let guard = 0; c?.step && guard < 32; guard++) {
      const section = c.step.driver;
      const table = sections.get(section);
      if (table) {
        const entry = cells.get(table)!.units.findIndex((u) => u.atom.kind === 'ref' && u.atom.name === section);
        const select = selectors(table).map((s) => ({ cell: s.name, entry, part: section }));
        // (the selectors, the table and the section are on its way: live while it plays)
        const via = [...new Set([...o.via, ...select.map((x) => x.cell), table, section])];
        return select.length ? { ...o, via, select: [...o.select, ...select] } : o;
      }
      c = cells.get(section);
    }
    return o;
  });
}
