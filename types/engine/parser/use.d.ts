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
