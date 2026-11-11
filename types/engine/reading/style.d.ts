/**
 * Reading a style from notes (#541, decision 043 point 2): the axes a bar's sounding notes say, one at a time, by rule.
 * Nothing here is learned, so it is the baseline and the oracle of whatever reads after it. It is the reader the
 * repository's first guess at a fragment's place, a corpus's styles (#542) and a frontend's style of an open piece
 * share, beside the form it reads.
 *
 * It reads a bar's notes as they sound: their steps, and their lengths as played (the gate, where the bite lives; a
 * written length fills its gap and says none of it). Swing is the meter's, not the style's (#360), so nothing here reads
 * it. A reading is raw, not fitted: `sync` and `bite` lie in 0 to 1 as their axes do, and `density` is onsets per step,
 * which is intensity (#571), not a place. An axis with nothing to read in the bar is absent, not zero.
 *
 * Pure: it counts steps and knows no file, key or clock; `readTiming` is given the clock.
 *
 * Lifted from yggi/jambot packages/engine/src/style-reading.ts @ a34d13c6: `artic` is `bite` (decision 076), and a bar
 * is cells' (`Bar`, `barOf`), a meter's sixteenths and its pulses, where Jambot's was its own meter's.
 */
import { type Meter } from '../meter';
/** The band's parts, as its performers are named (`fragments/performers/`): what a note was played by. */
export type Part = 'drums' | 'bass' | 'pad' | 'stab' | 'lead';
/** What a reading needs of a note: its part, the step it starts on in its bar, and how many steps it sounds. */
export interface Sounding {
    readonly part: Part;
    readonly step: number;
    readonly length: number;
    /** Its MIDI note, where a reading needs a pitch (the chords, the mood). */
    readonly note?: number;
}
/** A bar as a reading counts it: its steps (sixteenths) and the steps its pulses start on. */
export interface Bar {
    readonly steps: number;
    readonly pulses: readonly number[];
}
/** Steps to an eighth: a step is a sixteenth. */
export declare const STEPS_PER_EIGHTH = 2;
/** 4/4's bar: sixteen steps, a pulse on each quarter. A reading's bar where none is given. */
export declare const BAR_4_4: Bar;
/**
 * A meter's bar in sixteenths: its pulses, each a `unit` long (a quarter in 4/4, an eighth in 7/8), and its beats'
 * starts as the pulses (7/8's 3 2 2 starts on steps 0, 6 and 10). A meter a reading can't lay on sixteenths (a scan's
 * uneven steps, a unit finer than a sixteenth) has no bar: null.
 */
export declare function barOf(meter: Meter): Bar | null;
/** What one bar's notes say of its style, axis by axis. */
export interface StyleReading {
    /** Onsets per step of the bar; a chord struck at one step is one onset. Intensity (#571), not an axis. */
    readonly density: number;
    /** Syncopation proper (`syncopation`): 0 where every onset is followed by its line's next stronger place, higher the more weak onsets leave it silent. */
    readonly sync?: number;
    /** Paddy (0) to stabby (1): one less the median share of its gap a note of the bass or lead sounds. */
    readonly bite?: number;
}
/** The share of its gap to the next onset (or the bar's end) that each note of one line sounds. */
export declare function soundingShares(line: readonly Sounding[], steps: number): number[];
/** The onsets of a bar: one per part and step, so a chord's notes are one and the same step of two parts two. */
export declare const onsetsOf: (notes: readonly Sounding[]) => number[];
/** The notes of the bass and the lead, each line's shares of its gaps. */
export declare const lineShares: (notes: readonly Sounding[], steps: number) => number[];
/** A place's metric level in a bar, 0 strongest: the downbeat 0, a pulse 1, an eighth 2, any other step (a sixteenth) 3. */
export declare const levelOf: (step: number, bar: Bar) => number;
/**
 * Syncopation proper (#681; Longuet-Higgins and Lee's measure, read per line): an onset on a weak place whose line
 * leaves the next stronger place silent, struck neither there nor between, is syncopated by how much weaker its place
 * is (their levels' difference, `levelOf`). A bar is read as a cycle, so the next stronger place after its last weak
 * onsets is its own downbeat. A line's syncopation is the sum over its onsets, over its onsets times the deepest
 * difference (a sixteenth before a silent downbeat, 3); the bar's is the mean over its lines, each line once, so a
 * steady line (hats on every eighth, which leave no stronger place silent) dilutes it no more than one line does.
 *
 * It reads what the onsets on the grid alone didn't (#681): a clave's eighths (x..x..x.), the tresillo, a note on the
 * and of four tied over the bar line. A line of eighths reads 0, an off-beat line (every eighth's and) 5/12.
 */
export declare function syncopation(notes: readonly Sounding[], bar?: Bar): number;
/** The style a bar's sounding notes read as, on the axes that can be read from onsets and lengths alone. */
export declare function readStyle(notes: readonly Sounding[], bar?: Bar): StyleReading;
/** What a reading needs of a laid step: how long it lasts on the clock, in seconds. */
export interface Laid {
    readonly length: number;
}
/** The timing a bar's steps read as: the tempo. */
export interface TimingReading {
    /** Beats (quarters) per minute, from how long the steps last. */
    readonly bpm?: number;
}
/**
 * The tempo of a bar from the clock: 60 over the mean length of a quarter, four steps. Swing does not enter it: it moves
 * notes inside a beat and leaves the beat whole, and it is the meter's (#360).
 */
export declare function readTiming(laid: readonly Laid[]): TimingReading;
