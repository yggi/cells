/**
 * What a declaration reads (#618, #737): every cell a line names, wherever the language lets it, found by shape. A reference
 * in the AST is a `Ref` (a name, a pick, a span) or, as a step of a braid, a `ref` atom (the same, its place on the step it
 * is), so one walk finds them all, and a form that adds one to a declaration is read here with no line written for it. The
 * path to it, the keys from the declaration down (`bend.table`, `style.from`, `paramCells.lpf`, `braid.tokens.0.atom`), says
 * what reads it, and the reference itself says how it is written there: its pick, its shift, its transposition, its
 * values' operations, its slot (#857).
 *
 * The graph, the unknown-cell checks and a frontend's "every name written is a wire" each find these reads again by hand
 * for the forms they know. This is the list they can be measured against: `reads.test.ts` holds, form by form, the reads
 * the written graph doesn't draw yet, and that count only falls. Pure.
 */
import type { Atom, CellDecl, Ref, Span } from './ast';
/** A cell spliced as a step of a braid (`&m`, `&m[1:]`, `&m^$7`, `degree(&m, 3)`): the reference without a span, which its step has. */
export type RefAtom = Extract<Atom, {
    readonly kind: 'ref';
}>;
/** One cell a declaration names, and where in it. */
export interface Read {
    /** The cell named (without its `&`). */
    readonly name: string;
    /** The keys from the declaration down to the reference: `bend.table`, `paramCells.lpf.factors.0`, `braid.tokens.3.atom`. */
    readonly path: string;
    /** The form that reads it: the path's first two keys, without indices (`bend.table`, `paramCells.lpf`, `braid.tokens`). */
    readonly form: string;
    /** The reference as the parser read it: what is written on the name, its pick, shift, transposition, degree or values' operations, and its slot. */
    readonly ref: Ref | RefAtom;
    /** Where it is written: the reference's own, or the step's of a braid (the cell's, where it has none). */
    readonly span: Span;
}
/** The form a path belongs to: its first two keys that aren't indices. */
export declare const formOf: (path: string) => string;
/**
 * Every cell a declaration names, in the order the walk meets them: its `over`, `step`, `env`, `pitch`, `base`, `tonic`,
 * `about`, `style`, `bend` and `swing` cells, its parameters' cells and clocks, the cells its braid splices, mixes and
 * generates from. It reads names, not cells: a note name written where a rate goes (`loop=C4`) is a `Ref` too, and a cell
 * the declaration is itself (a recursion's name) is not left out, so a reader checks each name against the cells it has.
 */
export declare function readsOf(decl: CellDecl): Read[];
