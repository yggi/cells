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
 * (`engine/midiimport.ts`), the notes: a fold that doesn't play the same is not taken. It can be watched as it runs
 * (`Watch`): each move as it is made, the piece as it is by then. Pure.
 */
import type { Folded, Line, See, Tool } from './ir';
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
/** Each tool's name, as a step is told. */
const NAMES = new Map<Tool, string>([
  [dilate, 'clocks'],
  [figure, 'figures'],
  [variants, 'phrases and their variants'],
  [pairs, 'pairs'],
  [beta, 'taking back what doesn’t pay'],
]);

/** Where a fold is: the tool at work (or `start`, `done`), the round. */
export interface Stage {
  readonly tool: string;
  readonly round: number;
}
/** Watches a fold: each move as it's made, the lines as they are by then (a thunk), and where it is. */
type Watch = (now: () => Folded, stage: Stage) => void;

/** The characters the folded lines print as (`caret`: how a symbol moves, `^$` semitones or `^` degrees). */
const sizeOf = (f: Folded, caret: string) => {
  const { defs, lines } = printFolded(f, 'm', '&tempo', caret);
  return [...defs, ...lines.values()].reduce((n, s) => n + s.length + 1, 0);
};

/** A phrase said as a phrase (a variant, `base=`) is worth a little length: a fold with variants is taken when it is
 * at most this much longer than the fold without. */
const STRUCTURE = 1.15;

/** Lines folded by a set of tools, round after round while the printed piece gets shorter. */
function run(lines: readonly Line[], tools: readonly Tool[], caret: string, watch?: Watch): { f: Folded; size: number } {
  let f: Folded = { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() };
  const start = f;
  watch?.(() => start, { tool: 'start', round: 0 });
  let size = sizeOf(f, caret);
  for (let round = 0; round < 8; round++) {
    let next = f;
    for (const tool of tools) {
      const stage = { tool: NAMES.get(tool) ?? 'a tool', round: round + 1 };
      const see: See | undefined = watch && ((now) => watch(now, stage));
      const made = tool(next, see);
      if (made && made !== next) {
        next = made;
        see?.(() => made);
      }
    }
    const s = sizeOf(next, caret);
    if (s >= size) break;
    [f, size] = [next, s];
  }
  return { f, size };
}

/**
 * Lines folded: their tokens and the symbols they share, as short as the tools make them — with variants where they
 * cost little (`STRUCTURE`), else without. Watched (`watch`): the fold with variants, each move as it's made, then the
 * one taken (`done`). `degrees`: the lines' values are degrees of a scale (`6#`: a degree and its accidental, #344), a
 * symbol moves by degrees (`&m^2`), and figurations aren't looked for (their tables are chords in semitones).
 */
export function fold(lines: readonly Line[], watch?: Watch, { degrees = false }: { degrees?: boolean } = {}): Folded {
  const caret = degrees ? '^' : '^$';
  const tools = degrees ? TOOLS.filter((t) => t !== figure) : TOOLS;
  const said = run(lines, tools, caret, watch);
  const plain = run(
    lines,
    tools.filter((t) => t !== variants),
    caret,
  );
  const f = said.size <= plain.size * STRUCTURE ? said.f : plain.f;
  watch?.(() => f, { tool: 'done', round: 0 });
  return f;
}
