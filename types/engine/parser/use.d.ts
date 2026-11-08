/**
 * The `from` line's forms (decision 065): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile.
 * A `use` line (decisions 054, 059) is retired: Migrate stopped reading it (#588), and the parser says so.
 */
/** An id that can be written bare: a word. */
export declare const isWordId: (id: string) => boolean;
/** Does the line start with `use`, the retired form? */
export declare const isUse: (code: string) => boolean;
/**
 * A `from` line (decision 065): `&key from harmonic_minor D`, `&bar from swung_4_4(swing=8n:.64) &tempo`, `&bd, &sd from
 * gm_kit`, `* from gm_kit`; or, with no id, a fragment's signature: `&bar from (&swing) &tempo`.
 */
export type FromForm = {
    readonly kind: 'use';
    /** The fragment's id: a word as written (`gm_kit`), or what the double quotes hold (`"my riff"`). */
    readonly id: string;
    /** The names the line takes (`&key`), each once; null for `*`. */
    readonly names: readonly string[] | null;
    /** The head's attributes, written before `from` (`label="my key"`), each a `key=value` as written. */
    readonly head: readonly string[];
    /** The named arguments, in parentheses (`swing=8n:.64`), as written; null where there are none. */
    readonly args: readonly {
        readonly name: string;
        readonly value: string;
    }[] | null;
    /** The rest of the line, the main argument as written (a cell's body), or null where there is none. */
    readonly main: string | null;
} | {
    readonly kind: 'signature';
    /** The heads (`&bar`). */
    readonly names: readonly string[];
    /** The optional parameters (`&swing`), in the order written. */
    readonly optional: readonly string[];
    /** The main parameter (`&tempo`), or null where there is none. */
    readonly main: string | null;
};
/** A line's top-level tokens: split at spaces outside quotes and brackets, each with where it starts. */
export declare function topTokens(text: string): {
    readonly text: string;
    readonly at: number;
}[];
/** A token that is an attribute, `key=value`. */
export declare const isAttribute: (token: string) => boolean;
/**
 * A `from` line (decision 065), read: a use of a fragment or a signature; null where the line has a top-level `from`
 * after its names and isn't one; undefined where it isn't a `from` line at all (a cell, a `use` line).
 */
export declare function readFrom(code: string): FromForm | null | undefined;
/** What a malformed `from` line is told. */
export declare const FROM_FORM = "A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, * from gm_kit; the head\u2019s attributes go before from (&key label=\"\u2026\" from \u2026), the named arguments in parentheses; with no id, a fragment\u2019s signature: &bar from (&swing) &tempo";
/**
 * What a `use` line is told (decision 065, #588): it is retired, and the line says where its cells come from. It names no
 * `from` line of its own, since only the fragment says whether that is a collection's (`&bd, &sd from gm_kit`) or a
 * template's, with its arguments (`&key from diatonic D`): #406.
 */
export declare const USE_RETIRED = "use is retired (decision 065): a line says where its cells come from, &bd, &sd from gm_kit (a collection, by name) or &key from diatonic(mode=dorian) D (a template, with its arguments)";
