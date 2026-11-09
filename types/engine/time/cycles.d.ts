/**
 * A meter found from onsets (#648, part of #15 and #35): the cycles a performance repeats, read as the meter cells writes,
 * a pulse grouped in twos and threes under a bar, a pair's swing a share of it (decision 071), the tempo a rate. It reads
 * only when notes start, how strongly, how long they last and how low they lie; it writes
 * `&bar from meter(grouping=…, swing=…) &tempo` (`meterText`), with a confidence for each choice. The steps:
 *
 *  1. `events`: notes struck together (within `TOGETHER`) are one event; its accent their weights, a long note more;
 *     its `low` the accent of its notes in the piece's lowest `LOW` (the bass, the kick: where a bar's line falls).
 *  2. `gridOf`: the tatum (Bilmes 1993), the coarsest grid nearly every event is on, straight or with its pairs leaning:
 *     the candidates are the gaps between events, their halves, thirds and quarters, and pairs of them, long and short.
 *     Read as written first (on the grid to 12 ms), as played where nothing holds so (to 45 ms; the autocorrelation's
 *     beat, `beatOf`, is then a candidate too, a played gap too loose to give the pulse to the ms).
 *  3. `barOf`: the bar over the grid: its length, the one whose lines take the most low accent and whose accents
 *     recur, under a prior on a bar's length (`BAR_PRIOR`); its beats, the groups whose starts take the most accent,
 *     equal or twos and threes, under a prior on a beat's length (`PREFERRED`) and on their count (`BEATS_PRIOR`).
 *  4. A bar of twos and threes that leans (`leaningGroups`): its pairs lean and its threes don't (decision 071), so no
 *     grid of pairs runs through it; it is read on a straight grid of eighths, the bar first, then each pair's lean.
 *
 * What it can't know is chosen by convention, and says so in its confidence: a strictly repeating bar is one bar or
 * two (the prior takes the bar nearest 2.4 s, so 4/4 over 2/4), and a tempo is one or its double (66 or 132 bpm).
 * Constant tempo: a performance whose tempo moves is read as one rate (its curve is #648's next rung). Measured on four
 * benches by `tools/cycles.ts`; `tools/cycles.test.ts` holds what each finds. Pure.
 */
/** A note struck: when (seconds), how strongly (0–1; 1 where unknown), how long, and how low (a MIDI key, if a pitch). */
export interface Onset {
    readonly at: number;
    readonly weight?: number;
    readonly dur?: number;
    readonly pitch?: number;
}
/** The share of a piece's notes, the lowest, whose accent marks a bar's line: the bass, the kick. */
export declare const LOW = 0.35;
/** Notes this close are struck together (a chord, a kick and a hat): one event. */
export declare const TOGETHER = 0.02;
/** The longest lag the autocorrelation reads: a slow bar's length. */
export declare const LONGEST = 8;
/** The beat's bounds (seconds): 240 to 40 bpm. */
export declare const BEAT: {
    readonly shortest: 0.25;
    readonly longest: 1.5;
};
/** The tempo a beat is likeliest at, and how widely (octaves) the prior spreads around it (Parncutt 1994; van Noorden & Moelants 1999). */
export declare const PREFERRED: {
    readonly seconds: 0.55;
    readonly octaves: 0.9;
};
/** A struck moment: when, how strong (its notes' weights summed, longer and lower notes more), its lowest pitch. */
export interface Event {
    readonly at: number;
    readonly accent: number;
    /** The accent of its notes below the piece's middle pitch: where the bass and the kick fall, the bar's lines. */
    readonly low: number;
    readonly bass: number;
    readonly pitches: readonly number[];
    /** The longest of its notes (seconds): a long note begins on a strong beat more often than a short one. */
    readonly long: number;
}
/** Notes struck together as one event: its accent their weights, a long note and a low one weighing more. */
export declare function events(onsets: readonly Onset[]): Event[];
/** The accent-weighted autocorrelation of the events, binned and smoothed: how much of the piece recurs after each lag. */
export declare function periodicity(es: readonly Event[], longest?: number): Float64Array;
/** A grid of beats: its period and where one falls (seconds), and how sure. */
export interface Beat {
    readonly period: number;
    readonly phase: number;
    readonly confidence: number;
}
/** The beat: the period whose multiples recur most, weighed by the prior; its phase, where the accents fall most. */
export declare function beatOf(es: readonly Event[], h?: Float64Array<ArrayBufferLike>): Beat | null;
/** A bar: its pulse (seconds), its length in pulses and their groups (each a beat) from its start, its start (seconds), how sure. */
export interface Bar {
    readonly pulse: number;
    readonly groups: readonly number[];
    readonly start: number;
    readonly confidence: number;
    /** The same bar at the level above and below (two bars, half a bar), its lines on this one's, and its score as a share of this one's. */
    readonly variants?: readonly {
        readonly groups: readonly number[];
        readonly start: number;
        readonly likeness: number;
    }[];
}
/** How much likelier a bar line is on the piece's first event: a piece starts on one more often than not, a pickup the exception. */
export declare const FIRST: {
    readonly bonus: 1.15;
};
/** How much each of the bar line's cues weighs, against the mean accent of a pulse (`lineCues`); chosen over the four benches. */
export declare const CUES: {
    readonly harmony: 0.5;
    readonly long: 0.5;
};
/**
 * The bar's length a bar is likeliest at (seconds), and how widely (octaves): two to three seconds, a band's bar. Wide,
 * since a bar found double or half is a metrical variant (`Found.variants`): a narrow prior would choose 4/4 over 3/4
 * at a minuet's tempo, where the notes tell the bar's first beat by little more than a tenth.
 */
export declare const BAR_PRIOR: {
    readonly seconds: 2.4;
    readonly octaves: 1.5;
};
/**
 * The bar, over the pulses (`pulse` seconds apart from `phase`, pulse k at `places(k)`, a swung pulse late): its length,
 * the one whose bar lines take the most accent and recur, under a prior on a bar's length; then its beats, the groups
 * whose starts take the most accent, equal (2, 3 or 4 pulses each) or, on eighths, twos and threes (aksak).
 * The bar and its beats are chosen together: a bar whose beats are many and short is two bars.
 */
export declare function barOf(es: readonly Event[], pulse: number, phase: number, places: (k: number) => number, first?: number): Bar | null;
/** A meter found: its tempo (beats a minute, the beat as cells counts it), signature, grouping, swing and start. */
export interface Found {
    readonly bpm: number;
    /** The signature cells names it by (`4/4`, `6/8`, `7/8`), or its groups of eighths (`2+2+3`) where no signature is. */
    readonly signature: string;
    /** Its beats, each in eighths. */
    readonly groups: readonly number[];
    readonly swing: readonly {
        readonly level: '8n' | '16n';
        readonly share: number;
    }[];
    /** Where a bar starts (seconds). */
    readonly start: number;
    /** The bar's length (seconds). */
    readonly bar: number;
    readonly confidence: {
        readonly beat: number;
        readonly division: number;
        readonly bar: number;
    };
    /**
     * The metrical variants: the same grid read as half the bar or two of it, its lines on this bar's (2/4 for 4/4, 6/8
     * for 3/8), each with its likeness, its score as a share of this one's. They sound the same; what differs is which
     * strokes are bar lines (a level's grade, a `1m` tap, a section's count of bars), which the notes tell only weakly.
     */
    readonly variants?: readonly Variant[];
}
/** A metrical variant of a found meter: the same grid, another level for its bar. */
export interface Variant {
    readonly bpm: number;
    readonly signature: string;
    readonly groups: readonly number[];
    readonly start: number;
    readonly bar: number;
    readonly likeness: number;
}
/** The finest grid a performance plays on: a pulse (seconds) from a phase, and the share its pairs lean (.5 straight). */
export interface Grid {
    readonly pulse: number;
    readonly phase: number;
    /** The share of a pair of pulses at which its second falls: .5 an even grid, more a swung one (decision 071). */
    readonly share: number;
    /** The share of the accent on it. */
    readonly covered: number;
}
/**
 * The tatum (Bilmes 1993): the coarsest grid nearly every event falls on, straight or with its pairs leaning. Its pulse
 * from 60 ms to 1 s; its phase one of the strongest events'; a lean tried where no straight grid holds the events.
 */
export declare function gridOf(es: readonly Event[], enough?: number): Grid | null;
/** A meter found from onsets: the finest grid, the bar over it, its beats; null where too little is heard to say. */
export declare function findMeter(onsets: readonly Onset[]): Found | null;
/** A found meter as cells writes it: the meter fragment taken with its grouping and swing, and the tempo a rate. */
export declare function meterText(f: Found): string;
