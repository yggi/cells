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
/** A text's cells, each with its share of the measure, in the order declared (an unnamed cell's share is its line's). */
export declare function structureByCell(text: string, { asWritten }?: {
    asWritten?: boolean | undefined;
}): CellStructure[];
/** A text's structure: its cells', summed. */
export declare function structureOf(text: string, options?: {
    asWritten?: boolean;
}): Structure;
