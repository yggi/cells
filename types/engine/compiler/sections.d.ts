/**
 * Sections of an arrangement (decisions 016 and 044, declare.ts: `sections`): a stepped table of names declares them, and
 * a selector reading the table switches them. What a section steps (its cell, or a cell stepped from a cell it steps)
 * plays while a selector picks the section, starting again from its top each time it is picked: an output's `select`
 * (realize.ts).
 */
import type { Cells } from './context';
import type { Output } from '../program';
/** The outputs, each one stepped through a section picked by the selectors that read its table. */
export declare function sectioned(outputs: readonly Output[], cells: Cells, sections: ReadonlyMap<string, string>): Output[];
