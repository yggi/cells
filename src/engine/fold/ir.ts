/**
 * What the folder works on (#307 step 4, docs/notes/fold.md): lines of chords on a grid, read from notes, and the same
 * as sequences of tokens and the symbols they fold into. Pure data.
 */

/** A chord of a line: where it starts and how long (grid steps), what sounds: semitones from C4, or drum voices (`&bd`). */
export interface Chord {
  readonly at: number;
  readonly dur: number;
  readonly values: readonly string[];
}

/** A line: a braid's notes, `length` steps long (a rest to its end). */
export interface Line {
  readonly name: string;
  readonly chords: readonly Chord[];
  readonly length: number;
}

/**
 * A token: an element (a chord, a rest, written relative to its lowest pitch) or a symbol, at a base pitch; null for
 * one with no pitch to move (a rest, drums). `key` says which: an element's own description, or a symbol's name.
 */
export interface Tok {
  readonly key: string;
  readonly base: number | null;
}

/**
 * A symbol: what it stands for, each child at an offset from its base (null: a child with no pitch). A variant
 * (`variants.ts`) is another symbol's steps with a few changed: `of` that symbol, `patched` which children differ; it
 * prints as a copy of it (`base=`, decision 026), its children all there for the tools that expand it.
 */
export interface Rule {
  readonly key: string;
  readonly kids: readonly { readonly key: string; readonly off: number | null }[];
  readonly of?: string;
  readonly patched?: readonly boolean[];
}

/**
 * A figuration (`figure.ts`): a figure (its tokens, a note's base its place in the chord) read over a table of chords
 * (each in the order the figure first plays it), a chord a block of `dur` steps; the run starts at step `start` of its
 * line.
 */
export interface Look {
  readonly pattern: readonly Tok[];
  readonly chords: readonly (readonly number[])[];
  readonly dur: number;
  readonly start: number;
  /** Its line's clock, in grid steps a step (`dilate.ts`): its table steps `dur` of those. */
  readonly scale?: number;
}

/** Lines as token sequences, and the symbols and figurations they use (a figuration's token: its key, `f…`). */
export interface Folded {
  /** Each line's tokens, and its clock in grid steps a step (1 unless `dilate.ts` slowed it). */
  readonly lines: readonly { readonly name: string; readonly toks: readonly Tok[]; readonly scale?: number }[];
  readonly rules: ReadonlyMap<string, Rule>;
  readonly looks?: ReadonlyMap<string, Look>;
}

/** A tool: one move at any scale. It returns the folded lines changed, or null when it finds nothing to do. */
export type Tool = (f: Folded) => Folded | null;
