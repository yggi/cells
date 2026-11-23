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
 *    `substitute &x i j`, slot i plays what slot j played;
 *  - **drop** and **add** (#911), on a line that has empty slots (a line's rests): a free slot left empty, `drop &x i`;
 *    an empty free slot given what the line's fill slot plays (a line's loudest step), `add &x i`. Each a substitution:
 *    of an empty slot, and of the fill.
 *
 * Which slots are fixed is the level's (a progression's cadence, a form's first and last slot), or the frontend's mask
 * (`VaryOptions.fixed`), the same at every scale. A move that changes nothing is left out. Pure.
 */
/** The slot operators, in their order. */
export type SlotOperator = 'rotate' | 'reverse' | 'swap' | 'substitute';
export declare const SLOT_OPERATORS: readonly SlotOperator[];
/** A variation of a line of slots: its operator, its amounts (for `by`), where each slot is taken from, and what it does, in words. */
export interface SlotMove {
    readonly operator: SlotOperator | 'drop' | 'add';
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
export declare function slotMoves(keys: readonly string[], fixed: readonly number[], operators: readonly string[], empty?: Empty): SlotMove[];
/** Where a slot is taken from nothing: a move that leaves it empty (`drop`). */
export declare const EMPTY = -1;
/**
 * What an empty slot is on a line that has them (#911): its key (a line's step that strikes nothing), and the slot an
 * `add` fills an empty one with (a line's loudest step), or null for none. A line of slots with no empty slot (a
 * progression, a form) takes no drop and no add.
 */
export interface Empty {
    readonly key: string;
    readonly fill: number | null;
}
/**
 * A line of slots varied, as a form on the line it varies (decision 052, point 7, at every scale): a copy of it, `base=`,
 * changed on the slots the variation changes, `=` keeping one slot and `=!k` k, slots past the last change kept
 * (`base=&harm =!2 [1,3,5]`, `base=&chorus = &b`); a cell that plays it reads the line's own clock and table. Null where
 * no slot changes. `before` and `after` are the slots as written.
 */
export declare function slotReference(name: string, before: readonly string[], after: readonly string[]): {
    form: string;
    line: (cell: string) => string;
} | null;
/**
 * One slot moved n degrees (#910), the move every level shares: each free slot `movable` allows, by each of `amounts`,
 * in that order; the level moves it (a note's pitch, a chord's every tone, a letter `&a` to `&a^n`). A progression's
 * `third` is its shift by a third (±2).
 */
export declare function shiftMoves(n: number, fixed: readonly number[], amounts: readonly number[], movable: (slot: number) => boolean): {
    slot: number;
    by: number;
}[];
