/**
 * The expressions: what a voice does to its notes, a vibrato on its pitch, the repository's facet `expression` (#196).
 * An expression fragment defines a cell a voice reads (`pitch=&vibrato`) and uses nothing, so it fits any workbench;
 * a piece takes it by name (`use &vibrato`), and Normalise writes an inline cell that is its line as that `use`.
 * Each is a file of the seed library, `fragments/expression/*.md` (`seed.ts`), whose prose says what it is.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The expressions built so far: the vibrato, associated as the facet `expression`. */
export const EXPRESSION_FRAGMENTS: readonly Fragment[] = seedFragments('expression');
