/** The waveform's extent in each of `columns` stretches of `samples`: [min, max] pairs. */
export declare function peaks(samples: Float32Array, columns: number): Float32Array;
/** A waterfall: `rows[band][frame]` in dB, band `b` centred at `freqs[b]` (Hz), frame `f` at `times[f]` (s). */
export interface Waterfall {
    readonly freqs: readonly number[];
    readonly times: readonly number[];
    readonly rows: readonly Float32Array[];
}
/**
 * The short-time spectrum of `samples` (at `rate` a second): `frames` Hann-windowed FFTs of `size` samples spread
 * evenly over them, each folded into `perOctave` bands an octave over the audible (the power of the bins within a
 * band summed, in dB; a band narrower than a bin takes the bin it falls in).
 */
export declare function waterfall(samples: Float32Array, rate: number, { frames, size, perOctave }?: {
    frames?: number | undefined;
    size?: number | undefined;
    perOctave?: number | undefined;
}): Waterfall;
/** A note as the waterfall's owners need it: when, how long, at what pitch, by which voice, how loud. */
export interface Sounding {
    readonly at: number;
    readonly dur: number;
    readonly freq: number;
    readonly voice: string;
    readonly gains?: readonly [number, number];
}
/**
 * Whose each band of each frame of a waterfall is, as far as the notes say: `owner[band * frames + frame]`, the
 * index in `voices` + 1 of the voice whose note puts the most into that band then, 0 where no note does (a drum,
 * noise, an effect's tail). A note puts its harmonics k·f there, k = 1 to `harmonics` (a pulse wave's reach far up),
 * each weighed level/k, sounding a `tail` of seconds past its end (a release). Ties go to the earlier voice; at most
 * 254 voices are told apart.
 */
export declare function owners(w: Waterfall, notes: readonly Sounding[], voices: readonly string[], { harmonics, tail }?: {
    harmonics?: number | undefined;
    tail?: number | undefined;
}): Uint8Array;
