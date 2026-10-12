/**
 * The folder (#307 step 4, docs/notes/fold.md): notes written out flat, folded into cells by a set of small tools, each
 * one move that works the same at every scale, run over and over while the piece gets shorter. After #234's reading of
 * a piece as a MERA:
 *
 *  - transpose.ts  a disentangler: each chord written against its own lowest pitch, so neighbours across a block's edge
 *                  compare as shapes (a shift with carry)
 *  - dilate.ts     an isometry: a line whose lengths share a factor on a clock that much slower (a phrase at two
 *                  speeds is then one cell)
 *  - figure.ts     an isometry by look-up: a run of blocks alike through their own chords, one figure read over a table
 *                  of chords (BWV 847's prelude)
 *  - variants.ts   a disentangler (lifting: predict and residual): a long phrase that returns nearly the same, one
 *                  cell at its own length, its returns spliced or copies of it with what differs (`base=`, decision 026)
 *  - pairs.ts      an isometry: the commonest pair of neighbours becomes one symbol, again and again: motifs, phrases,
 *                  sections, the form, each level built by the same move
 *  - beta.ts       β: a symbol that costs more written once than written out where it's used goes back in place
 *  - print.ts      the symbols as cells (`&m3^$5`), runs as `x!n`; and the cost model β judges by
 *
 * The judge is the description length (characters, as Shorten's `size`) and, where the folder is used
 * (`engine/midiimport.ts`), the notes: a fold that doesn't play the same is not taken. Pure.
 */
import type { Folded, Line, Tool } from './ir';
import { tokensOf } from './transpose';
import { pairs } from './pairs';
import { figure } from './figure';
import { dilate } from './dilate';
import { variants } from './variants';
import { beta } from './beta';
import { printFolded } from './print';

export type { Chord, Line } from './ir';
export { printFolded } from './print';

/** The tools in the order they're tried, each round: dilate (a line's clock), look up (figurations), phrases and their
 * variants, pairs, then take back what doesn't pay (β). */
const TOOLS: readonly Tool[] = [dilate, figure, variants, pairs, beta];

/** The characters the folded lines print as. */
const sizeOf = (f: Folded) => {
  const { defs, lines } = printFolded(f);
  return [...defs, ...lines.values()].reduce((n, s) => n + s.length + 1, 0);
};

/** A phrase said as a phrase (a variant, `base=`) is worth a little length: a fold with variants is taken when it is
 * at most this much longer than the fold without. */
const STRUCTURE = 1.15;

/** Lines folded by a set of tools, round after round while the printed piece gets shorter. */
function run(lines: readonly Line[], tools: readonly Tool[]): { f: Folded; size: number } {
  let f: Folded = { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() };
  let size = sizeOf(f);
  for (let round = 0; round < 8; round++) {
    let next = f;
    for (const tool of tools) next = tool(next) ?? next;
    const s = sizeOf(next);
    if (s >= size) break;
    [f, size] = [next, s];
  }
  return { f, size };
}

/**
 * Lines folded: their tokens and the symbols they share, as short as the tools make them — with variants where they
 * cost little (`STRUCTURE`), else without.
 */
export function fold(lines: readonly Line[]): Folded {
  const plain = run(
    lines,
    TOOLS.filter((t) => t !== variants),
  );
  const said = run(lines, TOOLS);
  return said.size <= plain.size * STRUCTURE ? said.f : plain.f;
}
