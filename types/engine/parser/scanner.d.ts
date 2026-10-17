/** The scanner: one line of a piece (continued lines joined), read left to right. */
import type { CellDecl, Diagnostic, FreeSpec, Ref, Span } from '../ast';
import { type Syntax } from './syntax';
/** References to a cell, and how they pick from it, turn it and transpose it. */
export declare const REFERENCE_SYNTAX: readonly Syntax[];
export declare const IDENT: RegExp;
export declare const NUM: RegExp;
export declare const MAX_REPS = 4096;
/**
 * How deep unnamed cells &( … ) may nest, one inside another, and parentheses in a mix: deeper is an error (reading
 * 1,500 deep, or 5,000 parentheses, overflowed the stack). The examples nest one deep (an envelope in a voice's line,
 * a sum in a product); 32 leaves room for any written by hand.
 */
export declare const MAX_NESTING = 32;
export declare class LineError extends Error {
    readonly col: number;
    readonly len: number;
    constructor(message: string, col: number, len?: number);
}
export declare class LineScanner {
    readonly text: string;
    readonly line: number;
    readonly offset: number;
    readonly lambdas: CellDecl[];
    /** Where each original line starts in a joined (continued) line: to place a span in the source. */
    readonly parts: readonly {
        line: number;
        start: number;
    }[];
    /** Warnings found so far (shared with the unnamed cells inside). */
    readonly warnings: Diagnostic[];
    /** How many unnamed cells &( … ) this text is inside. */
    readonly depth: number;
    /** Reads a cell's body (parser/cell.ts `parseBody`): what an unnamed cell &( … ) is. Given here, not imported, so the scanner and the cell parser don't import each other. */
    readonly body?: ((s: LineScanner, head: Ref) => CellDecl) | undefined;
    i: number;
    /**
     * `offset`: where this text starts in its line (unnamed cells are parsed from
     * inside one). `lambdas`: unnamed cells found so far, declared alongside.
     */
    /** free(…) found in this text. */
    frees: FreeSpec[];
    constructor(text: string, line: number, offset?: number, lambdas?: CellDecl[], 
    /** Where each original line starts in a joined (continued) line: to place a span in the source. */
    parts?: readonly {
        line: number;
        start: number;
    }[], 
    /** Warnings found so far (shared with the unnamed cells inside). */
    warnings?: Diagnostic[], 
    /** How many unnamed cells &( … ) this text is inside. */
    depth?: number, 
    /** Reads a cell's body (parser/cell.ts `parseBody`): what an unnamed cell &( … ) is. Given here, not imported, so the scanner and the cell parser don't import each other. */
    body?: ((s: LineScanner, head: Ref) => CellDecl) | undefined);
    /** A scanner over part of this text (from `start`, its `depth` unnamed cells in), sharing what is found so far. */
    within(text: string, start: number, depth?: number): LineScanner;
    warn(message: string, start: number, len: number): void;
    /** The source position of text from `start` to here (across continued lines). */
    place(start: number): Span;
    skipSpace(): void;
    done(): boolean;
    peek(): string;
    span(start: number): Span;
    fail(message: string, start?: number, len?: number): never;
    match(re: RegExp): string | null;
    ident(what: string): string;
    int(what: string): number;
    num(what: string): {
        value: number;
        alter: number;
    };
    /** A note by name here (`C`, `F#`, `Bb3`), as semitones from C4; null (nothing read) if there isn't one. */
    noteName(): number | null;
    expect(ch: string, what: string): void;
    /**
     * `&( … )`: an unnamed cell, written where it's used — the same body as a
     * declaration (`&(even(7,12,5) over=&key)`). Declared alongside under a
     * name of its own; returns that name.
     */
    lambda(): string;
    /** `&name`, optionally picked: `&name[0]`, `&name[1:]` (as turned), `&name[$0]` (as written). */
    ref(what: string): Ref;
    /** At a ':' after the reference starting at `from`: a meter's tap (&bar:16n) is read by step= only, so it fails and says so. */
    rejectTap(from: number): void;
    /**
     * A reference where `^n` and `^$n` mean nothing: an attribute's cell (over=&k, step=&bar, env=&adsr …) or a line's
     * name. They move a cell a braid plays (and base='s copy); anywhere else they would be dropped, so this warns.
     */
    cellRef(what: string, where: string, tapRead?: boolean): Ref;
    /**
     * After a reference: `^n` moves it n steps of the table it is read through (a degree, relative: degree(&x, n)); `^$n`
     * n steps of the grid after its tables (absolute: semitones on the 12).
     */
    transposition(name: string): {
        transpose?: number;
        degree?: number;
    };
    atBoundary(): boolean;
}
/** Strip comments: `//` anywhere; `#` at line start or after whitespace. */
export declare function stripComment(raw: string): string;
