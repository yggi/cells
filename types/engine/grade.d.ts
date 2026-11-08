import { type CompileResult, type Shifts } from './program';
/** The grades as written, coarse to fine: the root, the fifth, the third, the scale, the chromatic. */
export declare const GRADES = "*+-.,";
/**
 * A key's basic space from its degree `degree` (0 the tonic's triad; 4 the dominant's in a major key): each pitch class's
 * grade, 0 to 4, twelve of them. Null where the key isn't one: no cell of that name, or no degrees to read.
 */
export declare function gradesOf(result: CompileResult, key: string, degree?: number, shifts?: Shifts): number[] | null;
/** A pitch's grade in a key (`gradesOf`): semitones from C4, any octave; null where the key isn't one. */
export declare function gradeOf(result: CompileResult, key: string, pitch: number, degree?: number, shifts?: Shifts): number | null;
/** A key's basic space written as grades, C first (`*,.,-.,+,.,.`: C major's tonic). */
export declare const gradeText: (grades: readonly number[]) => string;
