/**
 * The compiled Meter: one tree of groups and one time map for a bar, whether it was written as
 * `meter("4/4")` (levels, its steps even) or `scan(1 1 1 1)` (positions, no levels). A reader of
 * a bar (the swing clock, the MIDI clock, a tap) reads this and not how it was written.
 *
 * It knows its pulse, its beats and the note value of a pulse (decision 040): a line taps the meter by
 * pulse, beat or note value (`tapPositions`), never by the meter cell's own steps.
 */
import type { Tap } from './ast';
export interface Meter {
    /** Each step's level (a scan's: 1 each). */
    readonly levels: readonly number[];
    /** The form it was written as: `meter(…)` (levels, its steps even) or `scan(…)` (positions, every step level 1). Read by the core's `meters` rewrite (`core/desugar.ts`). */
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
    /** legato= by level (#94): the share of a note's written length a line tapping it sounds when it states none (a share, not a lean). */
    readonly legato?: readonly SwingLevel[];
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
/** How a time signature writes a meter: its pulses, its note value and its beats (in pulses). */
export interface Signature {
    readonly pulses: number;
    readonly unit: number;
    readonly beats: readonly number[];
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
/** beat=n on a meter, retired (#502) and still read for Migrate: n equal beats over its pulses, in place of the beats it was written with (`meter("4/4") beat=2`, now `meter("2/2", 2)`). */
export declare function withBeats(m: Meter, n: number): Meter;
/** swing= on a meter: the levels that lean, those at .5 (straight) left out. */
export declare function withSwing(m: Meter, levels: readonly SwingLevel[]): Meter;
/** A note value from its length in whole notes (1/8: `8n`, 1/12: `8t`, 3/16: `8n.`), or null. */
export declare function noteName(whole: number): string | null;
/** A bare swing= on a meter (`swing=.67`): the level of its own steps (`meter("4/4", 2)`: `8n`), or null. */
export declare const bareSwingLevel: (m: Meter) => string | null;
/**
 * A level a meter can lean: one some beat divides into, two or more of them (swing never moves a beat: decision 040),
 * with a pair among its nodes (a group of three stays even: decision 071). What is wrong with it, or null.
 */
export declare function swingLevelProblem(m: Meter, whole: number): string | null;
/**
 * Where a position, in pulses from the first downbeat, is played under the meter's swing (#18): within its beat, through
 * the beat's tree (`swungIn`), as a division of `grid` pulses when it is one (a tap's step, a part of a step). Every beat
 * and every bar line stays where it is.
 */
export declare function swingAt(m: Meter, p: number, grid?: number): number;
/**
 * A bar's knots under its swing (#121): each beat's points on the finest level the swing leans, as written and where the
 * swing puts them, in pulses (the bar's end the last), so a place between two is even between where they are played.
 * Null where the meter doesn't swing. Its reader is the time map (`clocking.ts`): a note's end, and a part of a step.
 */
export declare function swungKnots(m: Meter): {
    readonly written: readonly number[];
    readonly swung: readonly number[];
} | null;
/**
 * A place under the meter's swing at every point, continuous (#15, rung 2): where a written place, in pulses from the first
 * downbeat, is played, even between the knots of the finest level the swing leans (`swungKnots`); and its inverse, where a
 * played place is written. The time map's placement of a note's end and of a meter's steps (`clocking.ts`), and the
 * performer's reading of an event back onto its bar (`perform.ts`); the meter's own rule, so a place is swung one way
 * everywhere. A meter that doesn't swing is its places as written.
 */
export declare function swungPlace(m: Meter, w: number): number;
export declare function writtenPlace(m: Meter, s: number): number;
/**
 * A host's bar as a meter (#15, rung 2): its groups in eighths, each a beat, under one or more levels of swing, as a
 * performer reads a bar's frame (`FeelFrame`, yggi/music-commons `contracts/feel` and `contracts/swing`). Its levels: the
 * bar 0, a group's start 1, an eighth within it 3.
 */
export declare function meterOfFrame(groups: readonly number[], swing: readonly {
    readonly level: string;
    readonly share: number;
}[]): Meter;
/** The meter's own steps under its swing, in steps of one bar; null where none moves. */
export declare function swungSteps(m: Meter): number[] | null;
/**
 * meter(…): steps by level, a bar whose steps are even. Its signature, when it was written as one (`meter("7/8")`), says
 * its pulses and beats; written as levels (`meter("*.+.+..")`), its steps are its pulses and its beats run from each
 * beat (+, *) to the next, a pulse an eighth (a quarter when every step is a beat, a sixteenth when every beat is four).
 */
export declare function meterOfLevels(levels: readonly number[], signature?: Signature): Meter;
/** scan(…): its entries, each a pulse at level 1 under the bar (its positions are the time map's, `scan` in `theory/modes`). */
export declare function meterOfScan(steps: readonly number[]): Meter;
/**
 * Where a tap's steps fall in `bars` bars of a meter, in pulses from the downbeat (decision 040): `pulse` each pulse,
 * `beat` each beat (unequal where the beats are), a note value every so many pulses, cut at the end of the last bar
 * (`1n` in 3/4: one a bar; `4n.` in 4/4: 3+3+2 eighths), `1m` each bar. The tap comes round after them.
 */
export declare function tapPositions(m: Meter, tap: Tap, bars?: number): number[];
/**
 * The share a meter gives a line that taps it and states no legato= (#94): its level for the tap's step, the finest at or
 * above it (an unequal beat by its longest); 1 when it has none. `tap` as written (`16n`, `pulse`, `beat`, `1m`), `ratio`
 * the tap's chain (`16n*2`: 2).
 */
export declare function tapShare(m: Meter, tap: string, ratio: number): number;
