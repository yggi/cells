/** Generators: a braid written as a rule — scan(…), euclid(…), sin(…) saw(…) tri(…) square(…), scale(…), fifths(…), meter(…), spell(…). */
import type { Braid, Ref, Span, WaveShape } from '../ast';
import { type Syntax } from './syntax';
import type { LineScanner } from './scanner';
/**
 * Bjorklund's algorithm: k hits and n − k rests, the leftovers paired again and again until
 * one group is left — the Euclidean rhythms in their usual form (Toussaint): 3 in 8 x..x..x.
 */
export declare function bjorklund(k: number, n: number): boolean[];
export declare function meterLevels(sig: string, sub: number): string;
type Generator = (s: LineScanner, start: number) => Braid;
/**
 * A waveform's n values, −1 … 1: Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step's start, i/n of
 * the cycle — a sine from 0 up, a saw from −1 up to just short of 1, a triangle from −1 up to 1 at the half and back,
 * a square −1 for the first half and 1 for the second.
 */
export declare function waveValues(shape: WaveShape, n: number): number[];
/**
 * `scale(name, tonic)`: a scale by name over the 12 turned to its tonic. What it stands for is two cells: the key (the
 * 12, `shift=` the tonic: a note name, a number or free(…)) and the scale's steps over it, `scan(…)`. The key is declared
 * here, unnamed and not drawn (`key:…`); the scan and the key are the caller's to place — a cell's own braid reading
 * through it, or a table of its own after over=. The old `scale(tonic, phase)` (a mode by number) still reads, with a
 * warning that says it by name.
 */
export declare function parseScale(s: LineScanner, start: number): {
    steps: number[];
    key: Ref;
    span: Span;
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
