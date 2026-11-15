import type { CompileResult, ResolvedCell } from './program';
/** A fill of a plugin-fragment: a cell whose braid its code writes. */
export interface Fill {
    /** Its lap, in steps: filled once a lap (a stream). None: filled once (a braid). */
    readonly lap?: number;
    /** A section per lap, its text the label: not a cell. */
    readonly mark?: true;
}
/** A plugin-fragment as cells reads it: its fills, the cells around them, and the code that fills them. */
export interface PluginFragment {
    /** Its word: `law=fiveto12` and its code's key. */
    readonly id: string;
    /** The id of its fragment file, what a piece takes it from (`from five_to_twelve`): pieces and fragments share one namespace, and an example is `fiveto12`. */
    readonly fragment: string;
    /** Its fills, by the name of the cell each one is (a mark's, by its own name). */
    readonly fills: Readonly<Record<string, Fill>>;
    /** Where lap 0 sits on the clock it reads, as an `anchor=` writes it (11.55: 11:55). */
    readonly origin: number;
    /** Steps until it comes round (a day). */
    readonly cycle: number;
    /** Seconds a step: its fills' `step=1` is one of these (`step=84bpm` as the old spelling wrote it). */
    readonly stepSeconds: number;
    /** A fill's text at a lap: braid text (a mark's, a label). Pure: the same fill, lap and arguments answer the same text. */
    fill(name: string, lap: number, args: Readonly<Record<string, string>>): string;
}
/** The plugin-fragments cells ships, by the word `law=` names them with. */
export declare const BUILT_IN: ReadonlyMap<string, PluginFragment>;
/** The built-ins by their fragment file's id (`five_to_twelve`): what a `from` line's copy names its fills by. */
export declare const BY_FRAGMENT: ReadonlyMap<string, PluginFragment>;
/**
 * The built-in a cell's `law=` names, or null. Since #792 no compiled cell has `law=` (the old spelling is read as its
 * `from` line): kept for a frontend that called it (`engine/holes.ts`), it finds nothing; `lawAt` reads a program.
 */
export declare const lawOf: (params: Readonly<Record<string, number | string>> | undefined) => PluginFragment | null;
/** The built-in law a program plays, or null: the first stream fill's (a piece's length and sections, `duration.ts`). */
export declare const lawIn: (result: CompileResult) => PluginFragment | null;
/** The built-in law that reads a clock (`from five_to_twelve &day`: `lawAt(result, 'day')`), or null: what a frontend draws on that clock (the sun). */
export declare const lawAt: (result: CompileResult, clock: string) => PluginFragment | null;
/** Its shortest lap: the unit its notes are rendered in, one lap of each timed fill at a time. */
export declare const unitOf: (f: PluginFragment) => number;
/** Its sections: each lap of a mark, where it starts (seconds from the start of its cycle) and its label. */
export declare function marksOf(f: PluginFragment): {
    at: number;
    label: string;
}[];
/**
 * Whether a cell is a stream's (#792): a fill itself, or the head that names its fills (`&cycle [&cycle_notes *
 * &cycle_level]`); and if so, the clock its call site gave (null: none). Undefined for any other cell. What the old
 * `law=` cell was: an `anchor=` on it belongs on that clock (`roles.ts`), and it is no clock of the piece's (`duration.ts`).
 */
export declare function streamClockOf(cells: ReadonlyMap<string, ResolvedCell>, c: ResolvedCell): string | null | undefined;
