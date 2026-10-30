/** The `use` line's forms (decisions 054, 059): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile. */
/** A `use` line, read: the fragment's id, and the names it asks for. */
export interface UseForm {
    /** The fragment's id: a word as written (`gm_kit`), or what the double quotes hold (`"harmonic minor"`). */
    readonly id: string;
    /** The names it asks for (`&bd`), in the order written, each once; null for every name the fragment defines. */
    readonly names: readonly string[] | null;
    /**
     * How it is written: `named` (`use &bd, &sd from gm_kit`), `short` (`use &aeolian`, the fragment named as its
     * cell), `all` (`use * from gm_kit`), or `quoted` (`use "harmonic minor"`, the old way: `use * from "harmonic minor"`).
     */
    readonly form: 'named' | 'short' | 'all' | 'quoted';
}
/** An id that can be written bare: a word. */
export declare const isWordId: (id: string) => boolean;
/**
 * A `use` line (decisions 054, 059): the fragment it takes from and the names it asks for, or null where the line starts
 * with `use` and isn't one; undefined where it doesn't start with `use`.
 */
export declare function readUse(code: string): UseForm | null | undefined;
/** A `use` line in its one spelling (decision 059): `use &x` where it names &x from x, the id bare where it is a word. */
export declare function writeUse({ id, names }: Pick<UseForm, 'id' | 'names'>): string;
/** What a malformed `use` line is told. */
export declare const USE_FORM = "A use line says what it takes from which fragment: use &bd, &sd from gm_kit, use * from gm_kit, or use &aeolian (from aeolian); an id of more than a word in double quotes: use * from \"harmonic minor\"";
/** What the old spelling, `use "id"`, is told: it reads as `use * from "id"`. */
export declare const useQuoted: (id: string) => string;
/**
 * A `from` line (decision 065): `&key from harmonic_minor D`, `&bar from swung_4_4(swing=8n:.64) &tempo`, `&bd, &sd from
 * gm_kit`, `* from gm_kit`; or, with no id, a fragment's signature: `&bar from (&swing) &tempo`.
 */
export type FromForm = {
    readonly kind: 'use';
    /** The fragment's id, as `UseForm`'s. */
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
