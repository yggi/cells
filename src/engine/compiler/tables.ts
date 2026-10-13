/** Reading declarations as tables: which table a cell reads, how many entries it has, its braid as units. */
import type { Atom, CellDecl, Span } from '../ast';
import { ROOT, type Unit } from '../program';
import { scan as scanOf } from '../../theory/modes';
import { leaves } from '../subseq';
import { waveValues } from '../parser/generators';

/** Where compile's own messages point when nothing was written (the default grid). */
export const IMPLICIT: Span = { line: 1, col: 1, len: 1 };

// a grid says so: map=edo (the default grid is one). cycle= is only ever its lap / a table's wrap.
export const isRootDecl = (d: CellDecl) => d.over === null && ((d.braid.kind === 'blank' && (d.name === ROOT || d.map?.kind === 'edo')) || d.map?.kind === 'ratios');

/** Static table for lengths and defaults (no over= → the default grid). */
export const tableOf = (d: CellDecl): string | null => (isRootDecl(d) ? null : (d.over?.name ?? ROOT));

/** A grid's steps per period: cycle=, or — a ratios grid — its tones before the period. */
export const gridSteps = (d: CellDecl) => (d.map?.kind === 'ratios' && d.braid.kind === 'list' ? Math.max(1, d.braid.tokens.length - 1) : (d.cycle ?? 12));
export const lengthOf = (decls: ReadonlyMap<string, CellDecl>, name: string, guard = 0): number => {
  const d = decls.get(name);
  if (!d || guard > 64) return 12;
  if (tableOf(d) === null) return gridSteps(d);
  const b = d.braid;
  if (b.kind === 'scan') return b.steps.length;
  if (b.kind === 'wave') return b.n;
  // (its numbers, as entries() reads them: a chord's each, a subsequence's in order)
  if (b.kind === 'list') return b.tokens.reduce((s, t) => s + leaves(t.atom).reduce((n, a) => n + (a.kind === 'note' ? 1 : a.kind === 'chord' ? a.notes.length : 0), 0), 0);
  // blank: as long as the table below (cycle= here is only where its turning wraps)
  return lengthOf(decls, tableOf(d)!, guard + 1);
};

/** A braid as units: what each step is, with its modifiers. */
export const unitsOf = (decls: ReadonlyMap<string, CellDecl>, d: CellDecl): Unit[] => {
  const plain = (atom: Atom): Unit => ({ atom, repeat: 1, subdivide: 1, elongate: 1 });
  const note = (value: number): Unit => plain({ kind: 'note', value, alter: 0 });
  const b = d.braid;
  const o = tableOf(d);
  if (o === null) return Array.from({ length: gridSteps(d) }, (_, i) => note(i));
  if (b.kind === 'list')
    return b.tokens.map(({ atom, repeat, subdivide, elongate, chance, level }) => ({
      atom,
      repeat,
      subdivide,
      elongate,
      ...(chance !== undefined ? { chance } : {}),
      ...(level !== undefined ? { level } : {}),
    }));
  if (b.kind === 'scan') return scanOf(b.steps).positions.map(note);
  if (b.kind === 'wave') return waveValues(b.shape, b.n).map(note);
  // blank: the identity of the table below — entry i is index i
  return Array.from({ length: lengthOf(decls, o) }, (_, i) => note(i));
};
