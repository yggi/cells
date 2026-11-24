/**
 * Noise for noise voices (`s=white`, `s=pink`, `s=brown`): a few seconds of each colour, seeded, never `Math.random`, so a
 * piece sounds the same every time; a note loops it from a place its cell's seed, its voice and its start choose, as chance
 * is thrown (decision 031).
 * Lifted from yggi/cell-studio src/audio/voice/noise.ts @ f18aa7a.
 */
import type { CompileResult } from './program';
/**
 * The noise voices of a program (`s=white`, `pink` or `brown`) by name, each its place among them in the order the compile lists
 * the cells, `noise#<i>`: what a voice's grains are thrown from where it writes no seed (#481: its place, not its name, so a text
 * renamed or respelled starts every noise where it did).
 */
export declare function noisePlaces(result: Pick<CompileResult, 'cells'>): ReadonlyMap<string, string>;
/**
 * What a voice's grains are thrown from (#932, decision 098): the seed it writes alone, as its place (`noise#<n>`), so no edit to
 * the text moves them; or, where it writes none, its place among the noise voices and its seed, 0. Normalise writes `seed=<i>`,
 * the place it has, so the grains are the very ones thrown before.
 */
export declare function grainKeyOf(result: Pick<CompileResult, 'cells'>): (voice: string) => {
    readonly seed: number;
    readonly place: string;
};
/** Where in the noise a note starts (seconds): from its cell's seed, its voice and its start in the code's seconds. */
export declare function grainOffset(seed: number, voice: string, at: number, duration: number): number;
/** How long a colour's noise is before it loops (s). */
export declare const NOISE_SECONDS = 4;
/** `NOISE_SECONDS` of noise of a colour at a sample rate, made once. */
export declare function noise(colour: 'white' | 'pink' | 'brown', sampleRate: number): Float32Array;
