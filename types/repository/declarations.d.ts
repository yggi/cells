import type { StylePoint, WeightedPoint } from './fragments';
/** The styles a declaration names, by name: `&funk` is Funk's point. */
export type StyleNames = ReadonlyMap<string, StylePoint>;
/** The facet a seed folder's fragments are found as (§3): `fragments/modes/` is `mode`. */
export declare const FOLDER_FACETS: Readonly<Record<string, string>>;
/** The words a declaration's attributes reserve: no template has a parameter of either name (§4). */
export declare const RESERVED: readonly ["style", "facet"];
/** Whether a line of code is a declaration: a signature, or `* from` with no id (its attributes after `from`). */
export declare function isDeclaration(code: string): boolean;
/** What a declaration line says: its points, each weighted, of a facet, with a template's arguments. */
export interface Declared {
    readonly points: readonly WeightedPoint[];
    readonly problems: readonly string[];
}
/** One declaration line's points (§1–§6), or what is wrong with it. */
export declare function readDeclaration(code: string, options: {
    readonly facet?: string;
    readonly styles: StyleNames;
    readonly template: boolean;
}): Declared | null;
/**
 * A fragment's association from its text (decision 089): each declaration line's points, in order; null where it has no
 * declaration (its association is elsewhere: a file's frontmatter, for a release). A template's declarations are its
 * signature lines, a bare one no style; a collection's, its `* from` lines with no id.
 */
export declare function associationOf(text: string, options: {
    readonly facet?: string;
    readonly styles: StyleNames;
}): {
    association: WeightedPoint[];
    problems: string[];
    explicit: boolean;
} | null;
/**
 * A text without its association (decision 089): each signature once, its attributes dropped, and a collection's
 * `* from` lines gone. The lines a piece takes from it, as they were before the association moved into the text.
 */
export declare function withoutDeclarations(text: string): string;
