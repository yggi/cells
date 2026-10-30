/** Split a line into code and its trailing comment (`//`, or `#` at start / after a space; neither inside quotes). */
export declare function splitComment(line: string): [string, string];
/** 0-based index of the line declaring &name, or -1. */
export declare function declLine(source: string, name: string): number;
/** Set (or with null, remove) a `key=value` attribute on &name. New attributes go right after the name. */
export declare function setAttr(source: string, name: string, key: string, value: string | null): string;
/** Respell a `key=` on &name as `to=`, its value and place kept (an alias as ours: cutoff=800 → lpf=800). */
export declare function renameAttr(source: string, name: string, from: string, to: string): string;
/**
 * shift=n on &name (0 removes it). A circle of fifths turned by its own argument (`fifths(1)`, `fifths(G)`, no `shift=`)
 * is turned there: by name if it was written by name, `fifths()` at 0.
 */
export declare function setShift(source: string, name: string, shift: number): string;
/** `off` on &name. */
export declare const setOff: (source: string, name: string, off: boolean) => string;
/** Split code into words at whitespace outside brackets, parentheses, alternations and quotes (`[0, 4, 7]`, `<0 2>`, `label="a b"` stay one word). */
export declare function splitWords(code: string): string[];
/** Does &name's declaration continue onto further lines (a mix written over several)? */
export declare function spansLines(source: string, name: string): boolean;
/** The words of &name's declaration: head (`&name`), attributes (`key=value`, `off`), braid. */
export declare function declWords(source: string, name: string): {
    head: string[];
    attrs: string[];
    braid: string[];
} | null;
/** The attributes of &name as written: key → value text (`off` → ''). */
export declare function attrsOf(source: string, name: string): Map<string, string>;
/**
 * Replace &name's braid with these tokens (attributes and comment stay). An empty list leaves it blank. A braid left
 * free stays free: `free(0 2 4)` becomes `free(<tokens>)`, its default rewritten.
 */
export declare function setBraid(source: string, name: string, braid: readonly string[]): string;
/** step= and loop= are one setting written two ways: setting one clears the other. */
export declare function setTiming(source: string, name: string, key: 'step' | 'loop', value: string | null): string;
/** Remove &name's declaration (with any continuation lines). */
export declare function deleteCell(source: string, name: string): string;
/** Cells that mention &name somewhere in their declaration (they'd break if it went). */
export declare function usersOf(source: string, name: string): string[];
/** A fresh name: cell1, cell2, … (the first not taken). */
export declare function freshName(source: string, stem?: string): string;
/** Append a new, blank cell — the chromatic default — and return its name. */
export declare function addCell(source: string): {
    source: string;
    name: string;
};
/** A valid, free name for a cell? Returns why not, or null if fine. */
export declare function nameProblem(source: string, name: string, current?: string): string | null;
/** Rename &from to &to: its declaration and every reference to it (comments are left as written). */
export declare function renameCell(source: string, from: string, to: string): string;
/**
 * Split a token in two: `x@n` shares its length between two (`x@2` → `x x`),
 * anything else is doubled (`x` → `x x`, one step longer).
 */
export declare function splitToken(token: string): [string, string];
/** A free(…) with a new value, written back where it stands (a marking becomes explicit). */
export declare function setFree(source: string, spec: {
    value: number;
    unit: string;
    lo: number;
    hi: number;
    span: {
        line: number;
        col: number;
        len: number;
    };
    labels?: readonly string[];
    text?: string;
    byName?: true;
    braid?: string;
}, value: number | string): string;
