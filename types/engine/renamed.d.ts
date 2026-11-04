/**
 * The seed ids that became words (#387, decision 065 followed through): each id that wasn't a word, and the word it is
 * now; and the seven diatonic modes, each the one `diatonic` fragment taken with its mode (`aeolian` is
 * `diatonic(mode=aeolian)`, how a `from` line takes it and a query answers). The rule: lower case; spaces, `-` and `/` as `_`; parentheses dropped; an id that would start with a digit (each
 * is a meter) after `meter_`. So a `from` line names every seed bare (`&bar from meter_4_4_swung_on_8n &tempo`).
 *
 * An old id still reads for one minor version: the seed library resolves it to the same text as its word, so a piece's
 * notes and its lockfile's hashes don't move. A `use` or `from` line that names one warns, and Migrate rewrites it
 * (`migrate/renamed.ts`), each only where the host's resolver gives the old id and the new the same text, so a host's
 * own library that happens to hold such an id is left alone. Pure data.
 */
export declare const RENAMED_IDS: ReadonlyMap<string, string>;
/** An id as a word, by the rule above: `Techno drums` is `techno_drums`, `4/4 swung on 8n` is `meter_4_4_swung_on_8n`; a word stays as it is. */
export declare function wordOf(id: string): string;
