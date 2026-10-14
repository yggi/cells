/**
 * Helix arithmetic: pure functions of a compiled program and the shifts — a cell's entries as
 * turned, a number resolved through its tables down to a grid, positions as pitches and colours.
 */
import type { Pick } from './ast';
import type { CompileResult, Shifts, Unit } from './program';
export interface Entry {
    readonly value: number;
    readonly alter: number;
}
/** One lap of `name`'s helix, measured in the grid it sits on. */
export declare function period(result: CompileResult, name: string, ctx?: string): number;
/**
 * The braid shifted by `shift`: list braids rotate (entries that wrap climb a
 * lap of the grid below); generated braids are read from index `shift` on.
 * Either way, entry i of the result is entry i + shift of the original helix.
 */
export declare function shiftedUnits(result: CompileResult, name: string, shift: number, ctx?: string): Unit[];
/** The cell as a lookup table: its numbers in order (chords contribute each member, subsequences theirs in order). Shared: don't change it. */
export declare function entries(result: CompileResult, name: string, shift: number): readonly Entry[];
/** Entry x of a table (its own shift plus `extra`), climbing the helix outside [0, k). */
export declare function lookup(result: CompileResult, name: string, x: number, shifts: Shifts, extra?: number): Entry;
export interface Resolved {
    readonly root: string;
    readonly position: number;
    /** Each table touched, with the entry used (for display). */
    readonly path: {
        cell: string;
        index: number;
    }[];
}
/**
 * Resolve a number that indexes `table` (used with `tableShift`), down to a
 * root. An accidental moves one step on the grid below the table indexed
 * (so `6#` over a scale is the 7th degree raised a semitone).
 */
export declare function resolveIn(result: CompileResult, table: string, tableShift: number, value: number, alter: number, shifts: Shifts): Resolved;
/** Resolve a number written in `cell`, shown on its own (through its over= or display context). */
export declare function resolvePitch(result: CompileResult, cell: string, value: number, alter: number, shifts: Shifts): Resolved;
/** Semitones above the root's zero for a resolved position (12 per root cycle). */
export declare function semitones(result: CompileResult, root: string, position: number): number;
/** The colour of a position on a grid: a rainbow per period, by position (on 12 to the octave: C red, D yellow, G light blue …). */
export declare function positionHue(result: CompileResult, root: string, position: number): number;
/**
 * A position's octave on its grid, for colour: 0 the natural range — 0 … 12 inclusive, C4 to C5 on the
 * usual grid — then −1, 1 … below and above (muted, darker or lighter).
 */
export declare function positionOctave(result: CompileResult, root: string, position: number): number;
/** Where a pitch (semitones from position 0) falls on a grid — the inverse of semitones(). */
export declare function positionOf(result: CompileResult, root: string, semis: number): number;
/** The grid a voice's notes are read through (its melodies' root), or the default grid. */
export declare function voiceGrid(result: CompileResult, voice: string): string;
/** The colour of a frequency a voice sounds, on the voice's own grid (position 0 at its pitch 0). */
export declare function freqHue(result: CompileResult, voice: string, freq: number): number | null;
/**
 * A voice's note named on its own grid — for grids other than 12 to the octave:
 * the grid, the position, and the nearest 12-tone note with its distance in cents
 * (null on the 12-tone grid, where the note's name says it all).
 */
export declare function gridName(result: CompileResult, voice: string, freq: number): {
    grid: string;
    position: number;
    nearest: string;
    cents: number;
} | null;
/** A table and every table below it, down to its root. */
export declare function tableChain(result: CompileResult, table: string): string[];
/**
 * A relative pick of plain numbers (a table, a motif) is a fixed tap: what it plays is entry i of the cell as it
 * stands when the note sounds, so it follows the cell while it turns (a stepped or free key).
 */
export declare const isTap: (result: CompileResult, name: string, pick: Pick | null) => boolean;
/** A pick of plain numbers, relative or absolute ($): read from the cell, not played; the cell is a table. */
export declare const isPicked: (result: CompileResult, name: string, pick: Pick | null) => boolean;
/** The grid at the root of a table's chain (over=, else the context it is read in): where a pitch by name is placed. */
export declare function rootOf(result: CompileResult, table: string): string;
