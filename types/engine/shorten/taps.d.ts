import { type Result, type Suggestion } from './harness';
/** The tap that says what &name's step= says, or null (not stepped by a meter's own steps). */
export declare function tapOfRaw(result: Result, name: string): string | null;
/** Each line stepped by a meter's own steps: its tap, if it plays the same notes. */
export declare function taps(source: string, result: Result): Suggestion[];
