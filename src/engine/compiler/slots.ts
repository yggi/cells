/**
 * A pick by name (decision 063): `&env[sustain]`, `&funk[artic]`. The parser reads the name (`Ref.slot`); before
 * anything else compiles, it becomes the slot's position as written (`&env[$2]`), read off the slots the cell's map
 * names (`SLOTS`, style.ts), so no phase after this one sees a name. A cell whose map names no slots, or a name its map
 * lacks, is an error that lists the slots there are; the pick is then dropped (the whole cell is read).
 */
import type { CellDecl, Diagnostic, ParseResult } from '../ast';
import { SLOTS, STYLE } from '../style';

/** The piece with every pick by name read as its slot's position, and an error for each that can't be. */
export function readSlots(parsed: ParseResult): ParseResult {
  // (a cell with style= has a style's slots, its axes: &style[artic], decision 063; and so has &style where no line writes
  // it, the composer's to write: a reader of it plays the centre, styles.ts)
  const maps = new Map<string, string | null>(parsed.cells.map((c) => [c.name, c.map?.kind ?? (c.style ? 'style' : null)]));
  if (!maps.has(STYLE)) maps.set(STYLE, 'style');
  const diagnostics: Diagnostic[] = [];
  const read = (o: Record<string, unknown>, cell: CellDecl): Record<string, unknown> => {
    const { slot, ...rest } = o as { slot: string; name: string; pick: unknown; span?: CellDecl['span'] };
    const name = rest.name as string;
    const span = (rest.span as CellDecl['span'] | undefined) ?? cell.span;
    // (a cell declared nowhere: compile says it is unknown where it reads it)
    if (!maps.has(name)) return { ...rest, pick: null };
    const kind = maps.get(name);
    const slots = kind ? SLOTS[kind] : undefined;
    const at = slots?.indexOf(slot) ?? -1;
    if (at >= 0) return { ...rest, pick: { kind: 'at', i: at, abs: true } };
    diagnostics.push({
      severity: 'error',
      message: slots
        ? `&${name}[${slot}]: &${name} (map=${kind}) has no slot ${slot}; its slots are ${slots.join(', ')}`
        : `&${name}[${slot}]: &${name}'s map names no slots (${kind ? `map=${kind}` : 'it has no map='}); pick by position (&${name}[$0]), name the slots with map=${Object.keys(SLOTS).join(' or map=')}, or give it a style= (its axes)`,
      span,
    });
    return { ...rest, pick: null };
  };
  // (every reference, wherever it is: a braid's step, an attribute's cell, a mix's term; untouched where it has no name)
  const visit = (x: unknown, cell: CellDecl): unknown => {
    if (Array.isArray(x)) {
      let changed = false;
      const out = x.map((v) => {
        const w = visit(v, cell);
        if (w !== v) changed = true;
        return w;
      });
      return changed ? out : x;
    }
    if (x === null || typeof x !== 'object') return x;
    const o = x as Record<string, unknown>;
    let out: Record<string, unknown> | null = null;
    for (const [k, v] of Object.entries(o)) {
      const w = visit(v, cell);
      if (w !== v) (out ??= { ...o })[k] = w;
    }
    const r = out ?? o;
    return typeof r.slot === 'string' && typeof r.name === 'string' ? read(r, cell) : r;
  };
  let changed = false;
  const cells = parsed.cells.map((c) => {
    const v = visit(c, c) as CellDecl;
    if (v !== c) changed = true;
    return v;
  });
  return changed ? { ...parsed, cells, diagnostics: [...parsed.diagnostics, ...diagnostics] } : parsed;
}
