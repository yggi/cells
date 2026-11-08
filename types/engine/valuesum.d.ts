/**
 * A mix of cells with no voice is the sum of their values (decision 079): `&drift [&section * .5 + &song * .3 + &set * .2]`,
 * each term a cell and its gain, its weight, and any number a constant added. It is a line like any other, read where a
 * moving parameter, a style's axis or a pick reads a cell (`series.ts`, `styles.ts`). A mix with a voice is a sound,
 * as it was (decision 006): the two are told apart by whether a sound is in it.
 */
import type { CellDecl } from './ast';
/** One term of a sum: a cell and its weight. */
export interface SumTerm {
    readonly cell: string;
    readonly weight: number;
}
/** A sum of values: its terms, and a constant added to them. */
export interface ValueSum {
    readonly terms: readonly SumTerm[];
    readonly constant: number;
}
/**
 * Is the cell a line of values: a line of numbers alone, read through no table, a level (map=lin, amp, db), or a sum of
 * values? Anything that splices a cell, sounds, names a sound or reads through a table is not (a pattern of drum hits is
 * a sound, read through its kit).
 */
export declare function isValueLine(name: string, decls: ReadonlyMap<string, CellDecl>, seen?: ReadonlySet<string>): boolean;
/**
 * A declaration as a sum of values, or null: one chord, a sum (or one weighted term) of cells and numbers, each cell a
 * line of values (`isValueLine`), and not a bare cell alone (`[&a]`, which names what it mixes). Anything else is a mix
 * of sounds, as it was (decision 006).
 */
export declare function valueSumOf(name: string, decls: ReadonlyMap<string, CellDecl>, seen?: ReadonlySet<string>): ValueSum | null;
