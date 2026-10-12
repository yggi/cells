/** Phase 7: how cells are shown — a cell without over= through its first player's table; a resonator's exciters. */
import { leaves } from '../subseq';
import { ROOT, type Exciter } from '../program';
import type { Cells } from './context';

/** Each cell's display table, and a resonator's exciters, set on a copy of the cells it is given. */
export function displayCells(given: Cells): Cells {
  const cells = new Map(given);
  // ---- display context: a cell without over= is shown through the table of its first player
  const ctx = new Map<string, string>();
  for (const c of cells.values()) if (c.root || c.over) ctx.set(c.name, c.root ? c.name : c.over!);
  for (let changed = true, guard = 0; changed && guard < 64; guard++) {
    changed = false;
    for (const c of cells.values()) {
      const mine = ctx.get(c.name);
      if (!mine) continue;
      for (const child of c.children.keys()) {
        if (!ctx.has(child)) {
          ctx.set(child, mine);
          changed = true;
        }
      }
    }
  }
  for (const c of cells.values()) cells.set(c.name, { ...c, context: ctx.get(c.name) ?? ROOT });
  // resonators: their exciters — values are shifts; a cell referred to brings its own settings
  for (const c of cells.values()) {
    if (typeof c.params.body !== 'string') continue;
    const exciters: Exciter[] = [];
    for (const a of c.units.flatMap((u) => leaves(u.atom))) {
      if (a.kind === 'note') exciters.push({ shift: a.value + a.alter, params: {} });
      else if (a.kind === 'ref') {
        const r = cells.get(a.name);
        if (r) for (const v of r.units) if (v.atom.kind === 'note') exciters.push({ shift: v.atom.value + v.atom.alter, params: r.params });
      } else if (a.kind === 'chord') for (const [j, v] of a.notes.entries()) exciters.push({ shift: v + a.alters[j], params: {} });
    }
    cells.set(c.name, { ...c, exciters: exciters.length ? exciters : Array.from({ length: 12 }, (_, i) => ({ shift: i, params: {} })) });
  }
  return cells;
}
