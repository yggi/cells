/**
 * What a declaration reads (#618, #737): every cell a line names, wherever the language lets it, found by shape. Every
 * reference in the AST is a `Ref` (a name, a pick, a span), so one walk finds them all, and a form that adds a `Ref` to
 * a declaration is read here with no line written for it. The path to it, the keys from the declaration down
 * (`bend.table`, `style.from`, `paramCells.lpf`, `braid.tokens.0.atom`), says what reads it.
 *
 * The graph, the unknown-cell checks and a frontend's "every name written is a wire" each find these reads again by hand
 * for the forms they know. This is the list they can be measured against: `reads.test.ts` holds, form by form, the reads
 * the written graph doesn't draw yet, and that count only falls. Pure.
 */
import type { CellDecl, Ref } from './ast';

/** One cell a declaration names, and where in it. */
export interface Read {
  /** The cell named (without its `&`). */
  readonly name: string;
  /** The keys from the declaration down to the reference: `bend.table`, `paramCells.lpf.factors.0`, `braid.tokens.3.atom`. */
  readonly path: string;
  /** The form that reads it: the path's first two keys, without indices (`bend.table`, `paramCells.lpf`, `braid.tokens`). */
  readonly form: string;
}

/** A reference, by its shape: a name and a place, and not a declaration (which has a braid and units). */
const isRef = (x: unknown): x is Ref => {
  const v = x as { name?: unknown; span?: { line?: unknown }; braid?: unknown; units?: unknown } | null;
  return !!v && typeof v === 'object' && typeof v.name === 'string' && typeof v.span?.line === 'number' && !('braid' in v) && !('units' in v);
};

/** The form a path belongs to: its first two keys that aren't indices. */
export const formOf = (path: string): string =>
  path
    .split('.')
    .filter((k) => !/^\d+$/.test(k))
    .slice(0, 2)
    .join('.');

/**
 * Every cell a declaration names, in the order the walk meets them: its `over`, `step`, `env`, `pitch`, `base`, `tonic`,
 * `about`, `style`, `bend` and `swing` cells, its parameters' cells and clocks, the cells its braid splices, mixes and
 * generates from. It reads names, not cells: a note name written where a rate goes (`loop=C4`) is a `Ref` too, and a cell
 * the declaration is itself (a recursion's name) is not left out, so a reader checks each name against the cells it has.
 */
export function readsOf(decl: CellDecl): Read[] {
  const out: Read[] = [];
  const seen = new Set<object>();
  const walk = (x: unknown, path: string[]): void => {
    if (!x || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    if (isRef(x)) {
      out.push({ name: x.name, path: path.join('.'), form: formOf(path.join('.')) });
      return;
    }
    for (const [k, v] of Object.entries(x)) if (k !== 'span' && k !== 'paramSpans') walk(v, [...path, k]);
  };
  walk(decl, []);
  return out;
}
