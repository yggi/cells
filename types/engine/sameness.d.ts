/**
 * Sameness: do two texts sound the same, at some rung of decision 050's ladder? The sound rungs (S); the text rungs (E)
 * are `identity.ts`'s. Every tool that rewrites a piece promises S1 (decision 049): Migrate, Normalise and Shorten check a
 * rewrite against it before they offer or apply it. Lifted out of `shorten/harness.ts` (#155). Pure.
 *
 *  - S1 `soundsIdentical`: every event alike to the ear (decision 070, `HEARD`), voice (by its sound, and on a MIDI card
 *    what it sends: decision 057), onset, length, pitch, gains, bends, levels, moving parameters, envelope, a noise by its
 *    colour and level; the snapshot's hashes stay exact, stricter than S1; over
 *    the whole piece (`wholeWindow`): what the tools check a rewrite by. `samePiece` is S1 over the first minute, kept for the tests of equal spellings and its public subpath.
 *  - S2 `playsSameNotes`: every event's voice (as S1 reads it), onset, length and pitch alike to the ear, gains and the rest free.
 *  - S3 `sameNotes`: the named cells' flattened steps alike.
 */
import { compileSource } from './compile';
import { type CompileOptions } from './program';
type Result = ReturnType<typeof compileSource>;
/** S3: do these cells play the same notes (value, place, length) in both programs? Their `from` lines read through `options`. */
export declare function sameNotes(a: string, b: string, names: readonly string[], options?: CompileOptions): boolean;
/**
 * How many seconds two spellings are compared over: the tools' check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export declare const SAMENESS_SECONDS = 60;
/**
 * What a listener can't tell apart (decision 070, #483): each threshold a fraction of the smallest difference people hear
 * in the best conditions, so two texts S1 calls identical sound alike to every listener, not to most. The sources and the
 * fractions are the decision's.
 *  - `cents`: pitch, a note's, a bend's and a voice's own, 0.5 cent (the frequency JND is about 2 to 5 cents for tones
 *    in the middle of hearing, 0.2 to 0.3 %: Wier, Jesteadt & Green 1977; Moore 2012).
 *  - `db`: level, per channel, 0.1 dB (the intensity JND is about 0.5 to 1 dB: Jesteadt, Wier & Green 1977; an
 *    interaural level difference about 0.5 to 1 dB: Mills 1960).
 *  - `seconds`: where a note starts and ends, 0.25 ms (two onsets about 1 to 2 ms apart are heard as two: Zera & Green
 *    1993; a gap in noise about 2 to 3 ms: Fitzgibbons & Wightman 1982).
 *  - `silent`: an amplitude below −100 dB is none.
 */
export declare const HEARD: {
    readonly cents: 0.5;
    readonly db: 0.1;
    readonly seconds: 0.00025;
    readonly silent: 0.00001;
};
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
 * or to `until` seconds. A text's `from` lines (decision 054) read through `options`.
 */
export declare function soundsIdentical(a: string, b: string, until?: number, options?: CompileOptions): boolean;
/** S2, **plays the same notes** (#180): every event's voice, onset, length and pitch alike, its gains and the rest free, over the whole piece or to `until`. */
export declare function playsSameNotes(a: string, b: string, until?: number, options?: CompileOptions): boolean;
export {};
