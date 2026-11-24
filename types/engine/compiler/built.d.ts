/**
 * A number read from a cell as the piece is built (decision 105, after 093 and 101): the one reader of a cell's value
 * where a text reads one before it plays, and the one phase that fills the attributes that read it. A place that fills
 * cells (`NUMBER_PLACES`, `fills`) records `seed=&s` as a hole the scanner left a placeholder in; this reads the cell,
 * a cell that is one number or a sum of numbers alone (`constantOf`), checks the place's own limits, and sets the
 * attribute, so a place reads a cell exactly as it reads the number written. A generator's argument (decision 101,
 * `meters`) and `even`'s (093, `evens`) read the same way, through `builtNumber`.
 */
import type { CellDecl, Ref } from '../ast';
import { type NumberPlace } from '../parser/numbers';
import type { Ctx } from './context';
/**
 * What a place that reads a cell as the piece is built reads, or why not: said once, wherever a place asks. `read` is
 * how the message names the place (`seed=`, `even(…)'s phase`).
 */
export declare function builtProblem(read: string, c: CellDecl): string;
/**
 * The number a cell holds, read as the piece is built: null, said as it is where the cell is unknown (a hole the text
 * that uses a fragment fills), a stepped cell or no constant. A fill not answered yet, a fragment read alone, is null
 * and silent (its plugin answers it in a piece, #792).
 */
export declare function builtNumber(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): {
    readonly value: number;
    readonly cell: CellDecl;
} | null;
/** What a place's own limits say of a value, or null where it holds: a count is whole, a share within its range. */
export declare function placeProblem(place: NumberPlace, value: number): string | null;
/**
 * Every attribute that read a cell (`seed=&s`, `cycle=&n`) set to the cell's value: the first phase to fill, before the
 * generators' and `even`'s, so a cell they read is read once as the same number. A hole whose cell is not one number is
 * an error that says what is read; the attribute keeps its placeholder, and the piece does not compile.
 */
export declare function builtHoles(ctx: Ctx, decls: Map<string, CellDecl>): void;
