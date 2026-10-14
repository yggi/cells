import type { CompileResult, Shifts } from './program';
export declare function waveform(result: CompileResult, voice: string, shifts: Shifts, samples?: number): Float32Array;
/** Fourier series of one cycle, for a PeriodicWave: x ≈ Σ real[k]·cos(kθ) + imag[k]·sin(kθ). */
export declare function harmonics(x: Float32Array, count?: number): {
    real: Float32Array;
    imag: Float32Array;
};
