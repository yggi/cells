/**
 * The seed ids that became words (#387, decision 065 followed through): each id that wasn't a word, and the word it is
 * now; and the seven diatonic modes, each the one `diatonic` fragment taken with its mode (`aeolian` is
 * `diatonic(mode=aeolian)`, how a `from` line takes it and a query answers). The rule: lower case; spaces, `-` and `/` as `_`; parentheses dropped; an id that would start with a digit (each
 * is a meter) after `meter_`. So a `from` line names every seed bare (`&bar from meter_4_4_swung_on_8n &tempo`).
 *
 * An old id no longer reads: a `from` line that names one finds no fragment. The map stays for the order a query breaks its
 * ties in (`byId`, `repository/fragments.ts`): a renamed fragment is ordered by its oldest id, so a query answers as it did
 * before the rename, and what a band learned keeps its pairs in the order they had. Pure data.
 */
export declare const RENAMED_IDS: ReadonlyMap<string, string>;
/** An id as a word, by the rule above: `Techno drums` is `techno_drums`, `4/4 swung on 8n` is `meter_4_4_swung_on_8n`; a word stays as it is. */
export declare function wordOf(id: string): string;
