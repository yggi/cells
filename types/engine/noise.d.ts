/**
 * Noise for noise voices (`s=white`, `s=pink`, `s=brown`): a few seconds of each colour, seeded, never `Math.random`, so a
 * piece sounds the same every time; a note loops it from a place its cell's seed, its voice and its start choose, as chance
 * is thrown (decision 031).
 * Lifted from yggi/cell-studio src/audio/voice/noise.ts @ f18aa7a.
 */
import type { CompileResult } from './program';
/**
 * The noise voices of a program (`s=white`, `pink` or `brown`) that write no seed, by name, each the place its grains are thrown
 * from, `noise#<identity>` (#945, decision 098): the identity of the cell (`drawKeyOf`: what it plays and is heard as, no name, no
 * spelling, no label, role or part), so a text renamed, respelled or edited elsewhere starts every noise where it did. Voices of
 * one identity would stack: the k-th of them (k from 1, in the compile's order of the cells, the voices being alike whichever it
 * is) takes the identity hashed with k, so they never throw alike, whatever order the lines are in.
 */
export declare function noisePlaces(result: CompileResult): ReadonlyMap<string, string>;
/**
 * What a voice's grains are thrown from (#932, #945, decision 098): the seed it writes alone, as its place (`noise#<n>`), or,
 * where it writes none, its place (`noisePlaces`) and its seed, 0.
 */
export declare function grainKeyOf(result: CompileResult): (voice: string) => {
    readonly seed: number;
    readonly place: string;
};
/** Where in the noise a note starts (seconds): from its cell's seed, its voice and its start in the code's seconds. */
export declare function grainOffset(seed: number, voice: string, at: number, duration: number): number;
/** How long a colour's noise is before it loops (s). */
export declare const NOISE_SECONDS = 4;
/** `NOISE_SECONDS` of noise of a colour at a sample rate, made once. */
export declare function noise(colour: 'white' | 'pink' | 'brown', sampleRate: number): Float32Array;
