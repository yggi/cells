/** Generators: a braid written as a rule — scan(…), even(…), euclid(…), sin(…) saw(…) tri(…) square(…), scale(…), fifths(…), meter(…), spell(…). */
import type { Braid, Ref, Span, WaveShape } from '../ast';
import { type Signature } from '../meter';
import { type Syntax } from './syntax';
import type { LineScanner } from './scanner';
/**
 * Bjorklund's algorithm: k hits and n − k rests, the leftovers paired again and again until
 * one group is left — the Euclidean rhythms in their usual form (Toussaint): 3 in 8 x..x..x.
 */
export declare function bjorklund(k: number, n: number): boolean[];
/**
 * A meter's grouping (yggi/music-commons `contracts/meter` v2, decision 072): its pulses, their note value as a
 * denominator, and its groups in pulses, each a beat (what bpm counts).
 */
export interface Grouping {
    readonly pulses: number;
    readonly unit: number;
    readonly groups: readonly number[];
}
/**
 * A signature's or sizes' grouping by rule, the table of names gone (contracts/meter v2, decision 072: a meter is two
 * applications of even); null where the text is neither.
 *  - x/8, x/16, x/32: the gaps of the canonical even set of ⌈x/3⌉ places in x (contracts/euclid), the fewest groups of 2
 *    and 3 as evenly as they go: 3/8 one group, 7/8 3+2+2, 8/8 3+3+2, 10/8 3+2+3+2, 11/8 3+3+3+2.
 *  - x/4, x/2: x beats of the denominator, but x/3 groups of three where x is a multiple of 3 from 6 (6/4: two dotted
 *    halves, against 3/2's three halves).
 *  - sizes, `2+2+3`, of eighths, or of the denominator after a slash, `2+2+3/4`, `3+3+2/16`: each 2, 3, 4 or 6.
 */
export declare function groupingOf(sig: string): Grouping | null;
/** A time signature's pulses, their note value and its beats in pulses (decision 040). */
export declare function signatureOf(sig: string): Signature;
/** A meter's grades, one a step (contracts/meter v2): as written, or from its signature or sizes; '' where it is neither. */
export declare function meterLevels(sig: string, sub: number): string;
type Generator = (s: LineScanner, start: number) => Braid;
/**
 * A waveform's n values, −1 … 1: Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step's start, i/n of
 * the cycle — a sine from 0 up, a saw from −1 up to just short of 1, a triangle from −1 up to 1 at the half and back,
 * a square −1 for the first half and 1 for the second.
 */
export declare function waveValues(shape: WaveShape, n: number): number[];
/** The start of the name of the key a `scale(…)` declares (`key:λ3_8`): a cell whose `over=` names one reads its own scale(…). */
export declare const SCALE_KEY = "key:\u03BB";
/**
 * `scale(name, tonic)`: a scale by name over the 12 turned to its tonic. What it stands for is two cells: the key (the
 * 12, `shift=` the tonic: a note name, a number, a cell holding one (`&tonic`, #290) or free(…)) and the scale's steps over it, `scan(…)`. The key is declared
 * here, unnamed and not drawn (`key:…`); the scan and the key are the caller's to place — a cell's own braid reading
 * through it, or a table of its own after over=. The old `scale(tonic, phase)` (a mode by number) still reads, with a
 * warning that says it by name.
 */
export declare function parseScale(s: LineScanner, start: number): {
    steps: number[];
    key: Ref;
    span: Span;
    mode?: Ref;
};
/**
 * `fifths()`, `fifths(n)`, `fifths(G)`: the circle of fifths, the twelve pitch classes a fifth apart (C G D A E B F#
 * C# Ab Eb Bb F), as written from C; turned n steps round, or to start on a note (the cell's shift: `[0]` is where
 * it starts, `[$0]` C).
 */
export declare function parseFifths(s: LineScanner, start: number): {
    braid: Braid;
    shift: number;
};
/** The generators: a braid written as a rule. The parser reads a cell's braid through this table. */
export declare const GENERATORS: Readonly<Record<string, {
    readonly parse: Generator;
    readonly syntax: Syntax;
}>>;
export declare const isGenerator: (word: string) => boolean;
export declare function parseGenerator(s: LineScanner, name: string, start: number): Braid;
export {};
