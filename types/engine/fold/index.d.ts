/**
 * The folder (#307 step 4, docs/notes/fold.md): notes written out flat, folded into cells by a set of small tools, each
 * one move that works the same at every scale, run over and over while the piece gets shorter. After #234's reading of
 * a piece as a MERA:
 *
 *  - transpose.ts  a disentangler: each chord written against its own lowest pitch, so neighbours across a block's edge
 *                  compare as shapes (a shift with carry)
 *  - dilate.ts     an isometry: a line whose lengths share a factor on a clock that much slower (a phrase at two
 *                  speeds is then one cell)
 *  - stretch.ts    the same inside a line: a passage whose lengths share a factor, a cell at its own speed spliced
 *                  slower (`&m@2`); the same passage at two speeds one cell (augmentation)
 *  - degrees.ts    a disentangler: the pitches as degrees of the piece's key, so a sequence is a phrase moved (`&m^1`)
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
 * (`engine/midiimport.ts`), the notes: a fold that doesn't play the same is not taken. It can be watched as it runs
 * (`Watch`): each move as it is made, the piece as it is by then. Pure.
 */
import type { Folded, Line } from './ir';
export type { Chord, Line } from './ir';
export { printFolded } from './print';
/** Where a fold is: the tool at work (or `start`, `done`), the round. */
export interface Stage {
    readonly tool: string;
    readonly round: number;
}
/** Watches a fold: each move as it's made, the lines as they are by then (a thunk), and where it is. */
type Watch = (now: () => Folded, stage: Stage) => void;
/**
 * Lines folded: their tokens and the symbols they share, as short as the tools make them — with variants where they
 * cost little (`STRUCTURE`), else without. Watched (`watch`): the fold with variants, each move as it's made, then the
 * one taken (`done`). `degrees`: the lines' values are degrees of a scale (`6#`: a degree and its accidental, #344), a
 * symbol moves by degrees (`&m^2`), and figurations aren't looked for (their tables are chords in semitones).
 */
export declare function fold(lines: readonly Line[], watch?: Watch, { degrees }?: {
    degrees?: boolean;
}): Folded;
