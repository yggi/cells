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
 * A declaration as a sum of values, or null: one chord, a sum (or one weighted term) of cells and numbers, no cell in it
 * a sound (a voice, a gate, a mix of sounds), and not a bare cell alone (`[&a]`, which names what it mixes).
 */
export declare function valueSumOf(name: string, decls: ReadonlyMap<string, CellDecl>, seen?: ReadonlySet<string>): ValueSum | null;
/** Is the cell a sound: a voice, a gate, or a mix that sums sounds (a sum of values is not one)? */
export declare function isSound(name: string, decls: ReadonlyMap<string, CellDecl>, seen?: ReadonlySet<string>): boolean;
