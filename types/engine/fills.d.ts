/** A fill of a plugin-fragment: a cell whose braid its code writes. */
export interface Fill {
    /** Its lap, in steps: filled once a lap (a stream). None: filled once (a braid). */
    readonly lap?: number;
    /** A section per lap, its text the label: not a cell. */
    readonly mark?: true;
}
/** A plugin-fragment as cells reads it: its fills, the cells around them, and the code that fills them. */
export interface PluginFragment {
    readonly id: string;
    /** Its fills, by the name of the cell each one is (a mark's, by its own name). */
    readonly fills: Readonly<Record<string, Fill>>;
    /** Its cells, each fill written `fill()`; a timed fill's cell steps once a step (`step=1`) until rung 5 times it by its clock. */
    readonly block: string;
    /**
     * What it plays, as the terms of a product a voice joins (`&notes * &level`). (Its head, `&cycle [&notes * &level]`,
     * would be a product with no voice, which the mix algebra refuses: rung 5 spells it.)
     */
    readonly plays: string;
    /**
     * What the voice it plays on reads of its cells (`pan=&space`: its notes' places). `pan=` is a voice's attribute, not a
     * line's, so a fragment's places reach its notes only through the voice: here the voice is realize's own; for a
     * piece's voice it is rung 5's question.
     */
    readonly voice?: string;
    /** Where lap 0 sits on the clock it reads, as an `anchor=` writes it (11.55: 11:55). */
    readonly origin: number;
    /** Steps until it comes round (a day). */
    readonly cycle: number;
    /** Seconds a step (until rung 5, where its head's `step=` is the rate). */
    readonly stepSeconds: number;
    /** A fill's text at a lap: braid text (a mark's, a label). Pure: the same fill, lap and arguments answer the same text. */
    fill(name: string, lap: number, args: Readonly<Record<string, string>>): string;
}
/** The plugin-fragments cells ships, by the word `law=` names them with. */
export declare const BUILT_IN: ReadonlyMap<string, PluginFragment>;
/** The built-in a cell's `law=` names, or null. */
export declare const lawOf: (params: Readonly<Record<string, number | string>> | undefined) => PluginFragment | null;
/** Its shortest lap: the unit its notes are rendered in, one lap of each timed fill at a time. */
export declare const unitOf: (f: PluginFragment) => number;
/** Its sections: each lap of a mark, where it starts (seconds from the start of its cycle) and its label. */
export declare function marksOf(f: PluginFragment): {
    at: number;
    label: string;
}[];
/**
 * The cells of one unit's lap, filled: each timed fill at the lap of its own that holds this unit's (a key's mode for
 * each of its bars), a braid fill at lap 0; marks are left out (they aren't cells).
 */
export declare function filledAt(f: PluginFragment, unitLap: number, args?: Readonly<Record<string, string>>): string;
