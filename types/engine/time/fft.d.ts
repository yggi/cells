/**
 * The fast Fourier transform, for the time machinery (`engine/time/`: the scalogram, the waterfall). In place, radix 2:
 * `re` and `im` the same length, a power of two.
 */
export declare function fft(re: Float64Array, im: Float64Array, inverse?: boolean): void;
/** The smallest power of two at least `n`. */
export declare const pow2: (n: number) => number;
