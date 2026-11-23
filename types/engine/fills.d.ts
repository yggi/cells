import type { CompileResult, ResolvedCell } from './program';
/** A fill of a plugin-fragment: a cell whose braid its code writes. */
export interface Fill {
    /** Its lap, in steps: filled once a lap (a stream). None: filled once (a braid). */
    readonly lap?: number;
    /** A section per lap, its text the label: not a cell. */
    readonly mark?: true;
    /**
     * The work one call may do, a count its code keeps (states expanded, steps), passed to it: past it, it refuses (decision
     * 085 §8). The fragment file's frontmatter declares it (`fuel:`), a built-in's manifest here. A braid fill must; there
     * is no default. It decides only whether the fill refuses, never which answer it gives.
     */
    readonly fuel?: number;
}
/**
 * A fill refused (decision 085 §8): no text, and why. Said as a warning on the piece's `from` line, `<id> refused: <why>`,
 * and the fill plays nothing, as a lap not filled in time does; the rest of the piece plays. At the WASM boundary, a
 * negative length with the reason at the pointer. A thrown error is no refusal: it is a bug in the code.
 */
export interface Refusal {
    readonly refused: string;
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
    /** The wire grammar its code reads its arguments in (the fragment's `wire:`; `docs/language/plugin-wire.md`): one newer than cells speaks is refused. Absent: 1. */
    readonly wire?: number;
    /** Seconds a step: its fills' `step=1` is one of these (`step=84bpm` as the old spelling wrote it). */
    readonly stepSeconds: number;
    /**
     * A fill's text at a lap (a braid's, lap 0): braid text (a mark's, a label), or a refusal. Pure: the same fill, lap,
     * arguments and fuel answer the same. A call site's fills are called one after another in the order of `fills`, so a
     * solver whose one search answers several may keep its last answer (085 §8.1).
     */
    fill(name: string, lap: number, args: Readonly<Record<string, string>>, fuel?: number): string | Refusal;
}
/** The plugin-fragments cells ships, by the word `law=` names them with. */
export declare const BUILT_IN: ReadonlyMap<string, PluginFragment>;
/**
 * The built-ins by their fragment file's id (`five_to_twelve`, `metric_accent`): what a `from` line's copy names its
 * fills by. The laws, `BUILT_IN`, and the braid fills (#799), which no `law=` ever named.
 */
export declare const BY_FRAGMENT: ReadonlyMap<string, PluginFragment>;
/**
 * The built-in a cell's `law=` names, or null. Since #792 no compiled cell has `law=` (the old spelling is read as its
 * `from` line): kept for a frontend that called it (`engine/holes.ts`), it finds nothing; `lawAt` reads a program.
 */
export declare const lawOf: (params: Readonly<Record<string, number | string>> | undefined) => PluginFragment | null;
/** The plugin-fragment a program's fills of `fragment` are answered by: the host's it was compiled with, else a built-in (#792 6e). */
export declare const pluginIn: (result: CompileResult, fragment: string) => PluginFragment | undefined;
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
/** A fill's answer as text: a refusal's is none (it plays nothing, 085 §8). */
export declare const textOf: (answer: string | Refusal) => string;
/**
 * Whether a cell is a stream's (#792): a fill itself, or the head that names its fills (`&cycle [&cycle_notes *
 * &cycle_level]`); and if so, the clock its call site gave (null: none). Undefined for any other cell. What the old
 * `law=` cell was: an `anchor=` on it belongs on that clock (`roles.ts`), and it is no clock of the piece's (`duration.ts`).
 */
export declare function streamClockOf(cells: ReadonlyMap<string, ResolvedCell>, c: ResolvedCell): string | null | undefined;
