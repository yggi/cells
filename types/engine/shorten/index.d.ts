/**
 * Shorten: read the code like a linter, find what's written out longhand, and
 * offer it shorter — the measure is the code's length, the promise that it
 * sounds the same. One rule a file:
 *
 *  - runs.ts:      0 0 0 0 → 0!4
 *  - phrases.ts:   a phrase written twice or more becomes a cell of its own, used where it was
 *  - fractions.ts: every step's length shares a factor — divide it out, slow the clock
 *  - same.ts:      two cells written exactly alike — one, used by both names' users
 *  - defaults.ts:  an attribute that says what would be so anyway (loop=SAMPLE_RATE, cycle= its length, pan=.5)
 *  - progressions.ts: a transposing loop=&x/N with the bars multiplied out — step=&x/(N/k)
 *  - stereo.ts:    a sound card's two chords that differ only in gains — one chord, and pan= on each voice
 *  - wrappers.ts:  a cell that only reads motifs through a shifted table — &motif^k where it's used
 *  - aliases.ts:   Strudel's or dough's name for a parameter where ours is shorter: cutoff= → lpf= (decision 027)
 *  - gates.ts:     a migration: a gate written the old way (trigger=, velocity=, gate=, gain=) as play= and level= (decision 023)
 *  - taps.ts:      a migration: a line stepped by a meter cell's own steps (step=&bar*2) as a tap of the meter (step=8n, decision 040)
 *
 * Each suggestion carries its rewrite; its saving is measured on the result
 * (harness.ts: the cells a rule may touch, the measure, the note-for-note check).
 */
import { type Suggestion } from './harness';
export type { Suggestion } from './harness';
/** Everything that could be written shorter, the largest saving first. */
export declare function shorten(source: string): Suggestion[];
/** Shorten again and again — the best each time — until nothing more pays. */
export declare function shortenAll(source: string, rounds?: number): {
    source: string;
    steps: string[];
};
