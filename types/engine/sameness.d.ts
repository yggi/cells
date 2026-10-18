/**
 * Sameness: do two texts sound the same, at some rung of decision 050's ladder? The sound rungs (S); the text rungs (E)
 * are `identity.ts`'s. Every tool that rewrites a piece promises S1 (decision 049): Migrate, Normalise and Shorten check a
 * rewrite against it before they offer or apply it. Lifted out of `shorten/harness.ts` (#155). Pure.
 *
 *  - S1 `soundsIdentical`: every event alike, voice, onset, length, pitch, gains, bends, levels, moving parameters,
 *    envelope (the snapshot's `notes` and `events` hashes), over the whole piece (`wholeWindow`): what the tools check a
 *    rewrite by. `samePiece` is S1 over the first minute, kept for the tests of equal spellings and its public subpath.
 *  - S2 `playsSameNotes`: every event's voice, onset, length and pitch alike, gains and the rest free.
 *  - S3 `sameNotes`: the named cells' flattened steps alike.
 */
import { compileSource } from './compile';
type Result = ReturnType<typeof compileSource>;
/** S3: do these cells play the same notes (value, place, length) in both programs? */
export declare function sameNotes(a: string, b: string, names: readonly string[]): boolean;
/**
 * How many seconds two spellings are compared over: the tools' check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export declare const SAMENESS_SECONDS = 60;
/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export declare function samePiece(a: string, b: string, until?: number): boolean;
/**
 * The longest a piece is compared over to its end, in seconds: twenty minutes, past every example that ends (BWV 847 is
 * 189 s), short of a day-long piece (law=fiveto12), which is compared over its first twenty minutes.
 */
export declare const WHOLE_PIECE_LIMIT = 1200;
/**
 * Where two pieces are compared to (#180): the later of their ends, each piece's end where it ends (laps=) and its first
 * minute where it goes on (`SAMENESS_SECONDS`), at most `WHOLE_PIECE_LIMIT`.
 */
export declare function wholeWindow(a: Result, b: Result): number;
/**
 * S1, **sounds identical** (#180; the owner: the snapshot's `notes` and `events` hashes agree): every event alike, its
 * voice, onset, length, pitch, gains, bends, levels, moving parameters and envelope, over the whole piece (`wholeWindow`),
 * or to `until` seconds.
 */
export declare function soundsIdentical(a: string, b: string, until?: number): boolean;
/** S2, **plays the same notes** (#180): every event's voice, onset, length and pitch alike, its gains and the rest free, over the whole piece or to `until`. */
export declare function playsSameNotes(a: string, b: string, until?: number): boolean;
export {};
