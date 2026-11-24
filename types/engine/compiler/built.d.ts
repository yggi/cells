/**
 * A number read from a cell as the piece is built (decisions 105 and 106, after 093 and 101): the one reader of a cell's
 * value where a text reads one before it plays, and the one phase that fills every place that reads one. A place that
 * fills cells (`NUMBER_PLACES`, `fills`) reads `&k` with a placeholder and the scanner records where the cell's name
 * stands in its line (`BuiltHole`); `fillBuilt` reads each cell, a cell that is one number or a sum of numbers alone
 * (`constantOf`), checks the place's own limits, writes the value into the line and reads the line again, so a place
 * reads a cell exactly as it reads the number written. It runs before anything reads the cells' lines (slots, styles),
 * so the line it hands on is the line a text of the number would have been. A generator's argument (decision 101,
 * `meters`) and `even`'s (093, `evens`) read the same way, through `builtNumber`.
 */
import type { CellDecl, ParseResult, Ref, Span } from '../ast';
import { type NumberPlace } from '../parser/numbers';
/** What a read says of a cell: its number, or why not, and where it is said (a name read that no cell declares, a fill not answered yet). */
export type Read = {
    readonly value: number;
    readonly cell: CellDecl;
} | {
    readonly unknown: Ref;
} | {
    readonly blank: true;
} | {
    readonly problem: string;
    readonly at: Span;
};
/**
 * What a place that reads a cell as the piece is built reads, or why not: said once, wherever a place asks. `read` is
 * how the message names the place (`seed=`, `even(…)'s phase`).
 */
export declare function builtProblem(read: string, c: CellDecl): string;
/** The number a cell holds, read as the piece is built: its value, or why not (a cell no line declares, a fill not answered yet, a stepped cell, no constant). */
export declare function readBuilt(decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): Read;
/** What a phase that says things reads a cell as: `builtNumber`'s ctx, a context's `error` and `unknownCell`. */
export interface Said {
    readonly error: (message: string, span: Span) => void;
    readonly unknownCell: (name: string, span: Span) => void;
}
/** `readBuilt`, said: null where the cell is no number, the reason given to `said`, as it is where a generator or `even` reads one. */
export declare function builtNumber(said: Said, decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): {
    readonly value: number;
    readonly cell: CellDecl;
} | null;
/** What a place's own limits say of a value, or null where it holds: a count is whole, a share within its range. */
export declare function placeProblem(place: NumberPlace, value: number): string | null;
/**
 * Every line that read a cell as the piece is built, read again with the cell's value in its place: the first phase of a
 * compile, before the slots and the styles are read, so the line the rest reads is the line a number would have made. A
 * hole whose cell is not one number is an error that says what is read, its line kept as it was; a cell no line declares,
 * or a fill not answered yet, leaves the line for `unreadHoles`, which says what stays (a template's hole).
 */
export declare function fillBuilt(parsed: ParseResult): ParseResult;
/**
 * What stays after `fillBuilt`: a hole whose cell no line declares is the text's, a template's (`seed=&seed` in a
 * fragment read alone), said as any unknown cell is; the rest it said already.
 */
export declare function unreadHoles(said: Said, decls: ReadonlyMap<string, CellDecl>): void;
