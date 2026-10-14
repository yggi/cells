/**
 * Numbers for a piece (#390): its cells by kind and in all, its wires and nets, the braid steps each cell writes, and
 * the size of its text. The sidebar's Stats page reads them; a conversion's story counts up through them. Pure: the
 * compiled piece, its graph and its text in, numbers out.
 */
import type { CompileResult } from './program';
import type { GraphModel } from './graph';
/** What a cell is, for counting: the first that fits, in this order. */
export type CellKind = 'card' | 'mix' | 'gate' | 'voice' | 'meter' | 'table' | 'envelope' | 'note' | 'line';
/** The kinds in the order they're shown. */
export declare const CELL_KINDS: readonly CellKind[];
/** min, max, mean and median of some numbers (all 0 when there are none). */
export interface Spread {
    readonly min: number;
    readonly max: number;
    readonly mean: number;
    readonly median: number;
}
export interface PieceStats {
    /** The cells written (not the implicit grid nor the built-in card), and how many of them are unnamed (`&( … )`). */
    readonly cells: number;
    readonly unnamed: number;
    readonly kinds: Readonly<Record<CellKind, number>>;
    /** Wires drawn (edges) and nets (a cell read through one port by several). */
    readonly wires: number;
    readonly nets: number;
    /** Places a cell is spliced into another's braid (`&m` in a braid), and the cells spliced so. */
    readonly splices: number;
    readonly spliced: number;
    /** Braid steps written (`x!4` one step, `[0,2]` one), in all, and per cell that writes a braid of steps. */
    readonly steps: number;
    readonly perCell: Spread;
    /** The text: characters, and lines that say something (not blank, not only a comment). */
    readonly chars: number;
    readonly lines: number;
}
/** min, max, mean, median. */
export declare function spread(xs: readonly number[]): Spread;
/** The piece's numbers: from its compiled cells, its graph (the wires and nets as drawn) and its text. */
export declare function pieceStats(result: CompileResult, graph: GraphModel, text: string): PieceStats;
