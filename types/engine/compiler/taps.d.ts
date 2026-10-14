/**
 * Taps of a meter's bus (decision 016, declare.ts: `taps`): a section is a tap, and a selector reading the table of taps
 * switches it. What a tap steps (its cell, or a cell stepped from a cell it steps) plays while a selector picks the tap,
 * starting again from its top each time it is picked: an output's `select` (realize.ts).
 */
import type { Cells } from './context';
import type { Output } from '../program';
/** The outputs, each one stepped through a tap picked by the selectors that read its table. */
export declare function tapped(outputs: readonly Output[], cells: Cells, taps: ReadonlyMap<string, string>): Output[];
