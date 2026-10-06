/**
 * The language's syntax as data: each construct the parser reads, with how it's written, what it
 * means and examples. The parser's modules declare their entries next to the code that reads
 * them (often in the very table it dispatches on); reference.ts renders them as
 * docs/language/reference.md, and its test parses every example.
 */

/** The reference's sections, in order. */
export const SECTIONS = {
  line: 'Lines',
  step: 'Steps',
  modifier: 'Modifiers',
  reference: 'References',
  generator: 'Generators',
  free: 'free(): left to the performer',
  rate: 'step= and loop=',
  map: 'map=',
  attribute: 'Attributes',
  parameter: 'Parameters',
  sort: 'Sorts: what a cell is in a mix',
  mix: 'Mixes',
} as const;
export type Section = keyof typeof SECTIONS;

export interface Syntax {
  readonly section: Section;
  /** How it is written; placeholders in lower case (`scan(i …)`, `x!n`). */
  readonly form: string;
  /** What it means, in a sentence or two. */
  readonly means: string;
  /** Lines that use it; each parses with no diagnostics (checked). */
  readonly examples: readonly string[];
  /** The page under docs/language/ that explains it. */
  readonly doc: string;
}

export const syntax = (section: Section, form: string, means: string, examples: readonly string[], doc: string): Syntax => ({ section, form, means, examples, doc });
