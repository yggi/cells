import type { CompileOptions } from '../program';
import type { Result, ShortenRewrite } from './harness';
/** The tap that says what &name's step= says (slowed `by` times, for the fractions), or null (not stepped by a meter's own steps). */
export declare function tapOfRaw(result: Result, name: string, by?: number): string | null;
/** Each line stepped by a meter's own steps: its tap, if it plays the same notes. */
export declare function taps(source: string, result: Result, options?: CompileOptions): ShortenRewrite[];
