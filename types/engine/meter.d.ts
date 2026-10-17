import type { Tap } from './ast';
/** A group of steps [from, to) at a level: 0 the bar, then finer (1 a beat, 2 a half, 3 a subdivision, 4 finer). */
export interface MeterGroup {
    readonly level: number;
    readonly from: number;
    readonly to: number;
    readonly groups: readonly MeterGroup[];
}
export interface Meter {
    /** The bar: level 0 over all the steps, its groups nested by the levels. A scan's is flat, every step one group at level 1. */
    readonly tree: MeterGroup;
    /** Each step's level (a scan's: 1 each). */
    readonly levels: readonly number[];
    /** Each step's position in the bar, 0 ≤ p < lap (the time map's ticks). */
    readonly positions: readonly number[];
    /** The bar's length in those positions. */
    readonly lap: number;
    /** The form it was written as: `meter(…)` (levels, its steps even) or `scan(…)` (positions, every step level 1). */
    readonly written: 'meter' | 'scan';
    /** The pulse: the numerator, equal steps of the denominator's length; a scan's are its entries. */
    readonly pulses: number;
    /** The note value of a pulse, as the denominator: 4 a quarter (a scan's), 8 an eighth. */
    readonly unit: number;
    /** The beats, each its length in pulses: what is counted, what bpm counts (6/8: 3 3; 7/8: 3 2 2; 4/4: 1 1 1 1). */
    readonly beats: readonly number[];
    /** A scan with pulse= (its beats quarters, the last maybe cut): how many beats its bpm counts, a fraction where it ends mid-beat. */
    readonly counted?: number;
    /** swing= (#18): the levels that lean, coarse to fine, each a division of a beat (`swingAt`). */
    readonly swing?: readonly SwingLevel[];
}
/**
 * A level of a meter that leans (#18, decision 040's `swing=8n:.67`): its divisions as a note value (`8n`), and the share
 * of each of their nodes at which the second starts (.5 straight, .67 the triplet swing).
 */
export interface SwingLevel {
    /** The note value as written: `8n`, `16n`, `8t`. */
    readonly level: string;
    /** Its length in whole notes (`8n`: 1/8). */
    readonly whole: number;
    readonly share: number;
}
/** How a time signature writes a meter: its pulses, its note value and its beats (in pulses), each pulse in `sub` steps. */
export interface Signature {
    readonly pulses: number;
    readonly unit: number;
    readonly beats: readonly number[];
    readonly sub: number;
}
/** The meter's steps a pulse (meter("4/4", 2): 2; a scan: 1). */
export declare const stepsPerPulse: (m: Meter) => number;
/** A note value as written (`16n`, `8t`, `4n.`): its length in whole notes, or null. */
export declare function noteValue(v: string): number | null;
/**
 * pulse= on a scan (decision 040): the note value of each of its entries (`pulse=16n`: sixteenths; a scan's are quarters
 * unless it says). Its beats are then what musicians count, the quarter: so many pulses a beat, the last one cut where
 * the scan ends (BWV 847's tempo map: 1,105 sixteenths, 276¼ beats).
 */
export declare function withPulse(m: Meter, whole: number): Meter;
/** How many beats a meter's bpm counts in a bar: one each (7/8: three, unequal), or a scan's beats of `pulse=` (276¼). */
export declare const beatCount: (m: Meter) => number;
/** beat=n on a meter: n equal beats over its pulses, in place of the beats it was written with (alla breve: `meter("4/4") beat=2`). */
export declare function withBeats(m: Meter, n: number): Meter;
/** swing= on a meter: the levels that lean, those at .5 (straight) left out. */
export declare function withSwing(m: Meter, levels: readonly SwingLevel[]): Meter;
/** A note value from its length in whole notes (1/8: `8n`, 1/12: `8t`, 3/16: `8n.`), or null. */
export declare function noteName(whole: number): string | null;
/** A bare swing= on a meter (`swing=.67`): the level of its own steps (`meter("4/4", 2)`: `8n`), or null. */
export declare const bareSwingLevel: (m: Meter) => string | null;
/**
 * A level a meter can lean: one some beat divides into, two or more of them (swing never moves a beat: decision 040).
 * What is wrong with it, or null.
 */
export declare function swingLevelProblem(m: Meter, whole: number): string | null;
/**
 * Where a position, in pulses from the first downbeat, is played under the meter's swing (#18): within its beat, through
 * the beat's tree (`swungIn`). Every beat and every bar line stays where it is.
 */
export declare function swingAt(m: Meter, p: number): number;
/** The meter's own steps under its swing, in steps of one bar; null where none moves. */
export declare function swungSteps(m: Meter): number[] | null;
/**
 * meter(…): steps by level, a bar whose steps are even. Its signature, when it was written as one (`meter("7/8")`), says
 * its pulses and beats; written as levels (`meter("*.+.+..")`), its steps are its pulses and its beats run from each
 * beat (+, *) to the next, a pulse an eighth (a quarter when every step is a beat, a sixteenth when every beat is four).
 */
export declare function meterOfLevels(levels: readonly number[], signature?: Signature): Meter;
/** scan(…): positions in the bar, no levels: a flat tree. */
export declare function meterOfScan(steps: readonly number[]): Meter;
/**
 * Where a tap's steps fall in `bars` bars of a meter, in pulses from the downbeat (decision 040): `pulse` each pulse,
 * `beat` each beat (unequal where the beats are), a note value every so many pulses, cut at the end of the last bar
 * (`1n` in 3/4: one a bar; `4n.` in 4/4: 3+3+2 eighths), `1m` each bar. The tap comes round after them.
 */
export declare function tapPositions(m: Meter, tap: Tap, bars?: number): number[];
