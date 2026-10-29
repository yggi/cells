/** Where in the noise a note starts (seconds): from its cell's seed, its voice and its start in the code's seconds. */
export declare function grainOffset(seed: number, voice: string, at: number, duration: number): number;
/** How long a colour's noise is before it loops (s). */
export declare const NOISE_SECONDS = 4;
/** `NOISE_SECONDS` of noise of a colour at a sample rate, made once. */
export declare function noise(colour: 'white' | 'pink' | 'brown', sampleRate: number): Float32Array;
