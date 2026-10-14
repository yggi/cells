/**
 * The spectrum of FM, exactly: a sine carrier at f, its phase swung by a modulator
 * (a sine at f·ratio, depth index), has lines at f + k·f·ratio for every whole k,
 * each J_k(index) strong — Bessel functions of the first kind. A modulator that is
 * modulated itself expands the same way, inside: e^{ikθ} = Σₙ Jₙ(k·I) e^{inθₘ} …
 * Negative frequencies fold back, their sign turned.
 */
import type { CompileResult } from './program';
/** J_n(x), Bessel's function of the first kind (the power series; accurate for the |x| FM uses, < ~25). */
export declare function besselJ(n: number, x: number): number;
type Line = {
    f: number;
    a: number;
};
/**
 * An FM voice's lines at its brightest (the index at the top of its range, if it moves):
 * frequency and strength (0…1, the strongest 1). Carriers and modulators as sines.
 */
export declare function fmLines(result: CompileResult, voice: string, f0: number): Line[];
/** An FM voice's wave over one cycle of its carrier, at its brightest: sin(θ), θ swung by its modulators. */
export declare function fmWave(result: CompileResult, voice: string, n: number): Float32Array;
export {};
