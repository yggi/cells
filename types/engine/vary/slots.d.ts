/**
 * The slot operators (decision 052, point 10): one set of functions over a line of slots, whatever a slot is at its
 * scale, a chord of a progression (`progression.ts`), a letter of a form or a section of a song plan (`form.ts`). Each
 * gives where each slot of a variation is taken from in its source (`from[i]`: slot i plays what slot `from[i]` played),
 * never moving a fixed slot:
 *
 *  - **rotate**: each span between two fixed slots one slot later, its last to its first (the whole line where none is fixed);
 *  - **reverse**: each span between two fixed slots in reverse order;
 *  - **swap**: two adjacent free slots exchanged, `swap &x i` the slots i and i + 1;
 *  - **substitute**: one free slot replaced by another slot the line holds, each different one once, by its first place:
 *    `substitute &x i j`, slot i plays what slot j played.
 *
 * Which slots are fixed is the level's (a progression's cadence, a form's first and last slot), or the frontend's mask
 * (`VaryOptions.fixed`), the same at every scale. A move that changes nothing is left out. Pure.
 */
/** The slot operators, in their order. */
export type SlotOperator = 'rotate' | 'reverse' | 'swap' | 'substitute';
export declare const SLOT_OPERATORS: readonly SlotOperator[];
/** A variation of a line of slots: its operator, its amounts (for `by`), where each slot is taken from, and what it does, in words. */
export interface SlotMove {
    readonly operator: SlotOperator;
    readonly amounts: readonly number[];
    readonly from: readonly number[];
    readonly what: string;
}
/** A mask's slots as places on a line of `n`: a negative counts from the end (−1 the last); those off the line dropped. */
export declare function fixedOf(mask: readonly number[], n: number): number[];
/** Each span between two fixed slots, cyclically (the whole line where none is fixed). */
export declare function spansOf(n: number, fixed: readonly number[]): number[][];
/**
 * Every move by the operators asked, in their order, over a line whose slots are `keys` (what each plays: equal keys
 * play alike), its `fixed` slots kept: for each operator, its rotation, its retrograde, its swaps by slot, its
 * substitutions by slot and then by the slot taken from. A move whose slots all play as before is left out.
 */
export declare function slotMoves(keys: readonly string[], fixed: readonly number[], operators: readonly string[]): SlotMove[];
