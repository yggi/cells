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
export const SLOT_OPERATORS: readonly SlotOperator[] = ['rotate', 'reverse', 'swap', 'substitute'];

/** A variation of a line of slots: its operator, its amounts (for `by`), where each slot is taken from, and what it does, in words. */
export interface SlotMove {
  readonly operator: SlotOperator;
  readonly amounts: readonly number[];
  readonly from: readonly number[];
  readonly what: string;
}

/** A mask's slots as places on a line of `n`: a negative counts from the end (−1 the last); those off the line dropped. */
export function fixedOf(mask: readonly number[], n: number): number[] {
  return [...new Set(mask.map((k) => (k < 0 ? n + k : k)).filter((k) => Number.isInteger(k) && k >= 0 && k < n))].sort((a, b) => a - b);
}

/** Each span between two fixed slots, cyclically (the whole line where none is fixed). */
export function spansOf(n: number, fixed: readonly number[]): number[][] {
  if (!fixed.length) return [Array.from({ length: n }, (_, s) => s)];
  return fixed.map((start, k) => {
    const end = fixed[(k + 1) % fixed.length]! + (k + 1 === fixed.length ? n : 0);
    return Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % n);
  });
}

/**
 * Every move by the operators asked, in their order, over a line whose slots are `keys` (what each plays: equal keys
 * play alike), its `fixed` slots kept: for each operator, its rotation, its retrograde, its swaps by slot, its
 * substitutions by slot and then by the slot taken from. A move whose slots all play as before is left out.
 */
export function slotMoves(keys: readonly string[], fixed: readonly number[], operators: readonly string[]): SlotMove[] {
  const n = keys.length;
  const free = (s: number) => !fixed.includes(s);
  const identity = Array.from({ length: n }, (_, s) => s);
  const changes = (from: readonly number[]) => from.some((f, s) => keys[f] !== keys[s]);
  const respanned = (place: (span: readonly number[], j: number) => number) => {
    const from = [...identity];
    for (const span of spansOf(n, fixed)) for (const [j, s] of span.entries()) from[s] = span[place(span, j)]!;
    return from;
  };
  const firsts = identity.filter((s) => keys.indexOf(keys[s]!) === s);
  const out: SlotMove[] = [];
  const push = (move: SlotMove) => changes(move.from) && out.push(move);
  for (const operator of operators) {
    if (operator === 'rotate')
      push({ operator, amounts: [], from: respanned((span, j) => (j + span.length - 1) % span.length), what: 'each span a slot later, its last to its first' });
    else if (operator === 'reverse') push({ operator, amounts: [], from: respanned((span, j) => span.length - 1 - j), what: 'each span in reverse order, the fixed slots kept' });
    else if (operator === 'swap')
      for (let s = 0; s + 1 < n; s++) {
        if (!free(s) || !free(s + 1)) continue;
        const from = [...identity];
        [from[s], from[s + 1]] = [s + 1, s];
        push({ operator, amounts: [s], from, what: `slots ${s} and ${s + 1} exchanged` });
      }
    else if (operator === 'substitute')
      for (let s = 0; s < n; s++) {
        if (!free(s)) continue;
        for (const j of firsts) {
          if (keys[j] === keys[s]) continue;
          const from = [...identity];
          from[s] = j;
          push({ operator, amounts: [s, j], from, what: `slot ${s} plays slot ${j}'s` });
        }
      }
  }
  return out;
}
