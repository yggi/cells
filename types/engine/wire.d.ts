/** The wire grammar's version (`wire: 1`): a change to what it may hold bumps it. */
export declare const WIRE = 1;
/** An argument as the wire hands it: its text, and the key it is read over (semitones from C, tonic first), if any. */
export interface WireArg {
    readonly text: string;
    readonly key?: string;
}
/**
 * An argument's core in the wire grammar, or why it can't be one. `context` is the text its `from` line stands in, its
 * `from` lines left out (what they give is not yet there to read: a fill as an argument is #749's next step).
 */
export declare function wireArg(value: string, context: string): WireArg | {
    refused: string;
};
