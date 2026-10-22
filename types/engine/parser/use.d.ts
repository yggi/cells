/** The `use` line's form (decision 054): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile. */
/**
 * A `use` line (decision 054): a fragment taken into the piece by its id, in double quotes, on a line of its own. The id
 * as written, or null where the line starts with `use` and isn't one; undefined where it doesn't start with `use`.
 */
export declare function readUse(code: string): string | null | undefined;
/** What a malformed `use` line is told. */
export declare const USE_FORM = "A use line names a fragment by its id, in double quotes, on a line of its own: use \"core kit\"";
