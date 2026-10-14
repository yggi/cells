/** free(…): a number left to the performer — a slider, a tempo marking, named choices, a text; and a braid (parsed with the cell, cell.ts). */
import type { FreeSpec } from '../ast';
import type { LineScanner } from './scanner';
import { type Syntax } from './syntax';
/** free(…)'s forms. */
export declare const FREE_SYNTAX: readonly Syntax[];
/** Why a braid left free stands only as a cell's whole braid (decision 018). */
export declare const FREE_BRAID_WHOLE = "free(0 2 4 ~ \u2026), a braid left to the performer, is a cell's whole braid: &riff over=&key free(0 2 4 ~), with nothing else as its braid";
/**
 * free(default, lo..hi) or free(marking) at the scanner (it's at 'free'):
 * the value, its range, and where it's written. `units`: what the value may
 * carry (a rate: bpm, hz, k).
 */
export declare function parseFree(s: LineScanner, key: FreeSpec['key'], units: boolean): FreeSpec;
