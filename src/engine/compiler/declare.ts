/** Phase 1: the declarations — one per name, the default grid and scale() tables added, over= chains known and acyclic. */
import type { CellDecl } from '../ast';
import { ROOT } from '../program';
import { even as evenPositions, intervals } from '../../theory/modes';
import { IMPLICIT, isRootDecl, tableOf } from './tables';
import type { Ctx } from './context';

/** The declarations, as declare() hands them on. */
export interface Declared {
  /** Every cell's declaration by name, the implicit ones (the default grid, scale() tables) included. */
  readonly decls: ReadonlyMap<string, CellDecl>;
  /** Cells added for a scale(tonic, phase) shorthand: not drawn. */
  readonly implicit: ReadonlySet<string>;
  /** The default grid wasn't declared, so it was added. */
  readonly implicitRoot: boolean;
  /** Which cells' over= chains are sound (known, acyclic). */
  readonly overOk: ReadonlyMap<string, boolean>;
}

export function declare(ctx: Ctx): Declared {
  const { parsed, error, unknownCell } = ctx;
  const decls = new Map<string, CellDecl>();
  const implicit = new Set<string>();
  for (const c of parsed.cells) {
    if (decls.has(c.name)) error(`&${c.name} is already defined on line ${decls.get(c.name)!.span.line}`, c.span);
    else decls.set(c.name, c);
  }
  const implicitRoot = !decls.has(ROOT);
  // scale(tonic, phase) shorthands: the two tables they stand for, not drawn
  for (const d of [...decls.values()]) {
    const m = d.over && /^scale:(-?\d+):(\d+)$/.exec(d.over.name);
    if (!m || decls.has(d.over!.name)) continue;
    const [, tonic, phase] = m;
    const key = `key:${tonic}`;
    const span = d.over!.span;
    const blank = { over: null, off: false, step: null, map: null, stride: null, cycle: null, params: {}, paramSpans: {} };
    if (!decls.has(key)) decls.set(key, { ...blank, name: key, span, shift: parseInt(tonic, 10), braid: { kind: 'blank' } });
    decls.set(d.over!.name, {
      ...blank,
      name: d.over!.name,
      span,
      shift: null,
      over: { name: key, pick: null, shift: 0, span },
      braid: { kind: 'scan', steps: intervals(evenPositions(7, 12, parseInt(phase, 10)), 12), span },
    });
    implicit.add(key).add(d.over!.name);
  }
  if (implicitRoot)
    decls.set(ROOT, {
      name: ROOT,
      span: IMPLICIT,
      over: null,
      shift: null,
      off: false,
      step: null,
      map: { kind: 'edo', period: 2, span: IMPLICIT },
      stride: null,
      cycle: 12,
      params: {},
      paramSpans: {},
      braid: { kind: 'blank' },
    });
  const rootDecl = decls.get(ROOT)!;
  if (!isRootDecl(rootDecl)) error(`&${ROOT} is the default grid: give it only cycle= and shift=`, rootDecl.span);

  // ---- over= chains: known, acyclic
  const overOk = new Map<string, boolean>();
  const checkOver = (name: string, seen: string[]): boolean => {
    if (overOk.has(name)) return overOk.get(name)!;
    const d = decls.get(name)!;
    const o = tableOf(d);
    let ok = true;
    if (o !== null) {
      if (!decls.has(o)) {
        unknownCell(o, d.over!.span);
        ok = false;
      } else if (seen.includes(o)) {
        error(`over= loops: ${[...seen.slice(seen.indexOf(o)), name, o].map((n) => '&' + n).join(' → ')}`, d.over?.span ?? d.span);
        ok = false;
      } else ok = checkOver(o, [...seen, name]);
    }
    overOk.set(name, ok);
    return ok;
  };
  for (const name of decls.keys()) checkOver(name, []);
  return { decls, implicit, implicitRoot, overOk };
}
