import type { Resolve } from './program';
/** What a text's structure is made of, and their sum (decision 049's measure). */
export interface Structure {
    readonly cells: number;
    readonly leaves: number;
    readonly attributes: number;
    readonly total: number;
}
/** A cell's share of the measure. */
export interface CellStructure extends Structure {
    readonly name: string;
}
/** How a text is measured: as written, or normalised (the default), its `use` lines read through `resolve`. */
export interface MeasureOptions {
    readonly asWritten?: boolean;
    readonly resolve?: Resolve;
}
/** A text's cells, each with its share of the measure, in the order declared (an unnamed cell's share is its line's). */
export declare function structureByCell(text: string, { asWritten, resolve }?: MeasureOptions): CellStructure[];
/** A text's structure: its cells', summed, and a leaf for each `use` line. */
export declare function structureOf(text: string, options?: MeasureOptions): Structure;
