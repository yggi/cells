import type { Atom, Binding, CellDecl } from '../ast';
import { type Sort } from '../algebra';
import { type Syntax } from '../parser/syntax';
import type { Ctx } from './context';
/** typed(atom): a mix chord's bindings, typed and distributed once (errors reported once). */
export type Typed = (atom: Extract<Atom, {
    kind: 'mix';
}>) => Binding[];
/** What a rule may look at: the other cells' lines, and rates. */
interface Seen {
    readonly decls: ReadonlyMap<string, CellDecl>;
    readonly rateOf: Ctx['rateOf'];
}
export interface SortRule {
    readonly sort: Sort;
    /** What makes a cell this sort, in words. */
    readonly is: string;
    /** A cell of this sort: the last line; the lines before it are what it needs (checked). */
    readonly example: readonly string[];
    readonly holds: (d: CellDecl, seen: Seen) => boolean;
}
/** What a cell is in a mix, from its own line — never from where it's written. The first rule that holds decides. */
export declare const SORT_RULES: readonly SortRule[];
/** The rules as reference entries (docs/language/reference.md). */
export declare const SORT_SYNTAX: readonly Syntax[];
/** sortOf(name): what the cell is in a mix (SORT_RULES). */
export declare function sortOfCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): (name: string) => Sort;
export declare function sorts(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): Typed;
export {};
