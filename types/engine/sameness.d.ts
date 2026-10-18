/** Do these cells play the same notes (value, place, length) in both programs? */
export declare function sameNotes(a: string, b: string, names: readonly string[]): boolean;
/**
 * How many seconds two spellings are compared over: the tools' check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export declare const SAMENESS_SECONDS = 60;
/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export declare function samePiece(a: string, b: string, until?: number): boolean;
