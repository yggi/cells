// The kinds a section may be (#851): the ids of the fragments of the facet `section` (`fragments/sections/`), in file
// order, so the list is the library's and not a second one in code. A host's plan or score names one (the session
// contract's `section`); a frontend checks a name against it before it hands the feel a frame.
import { seedFragments } from './seed';

/** Every section kind the seed library has, in file order. */
export const SECTION_KINDS: readonly string[] = seedFragments('sections').map((f) => f.id);

/** Whether a value names a section kind of the library. */
export const isSectionKind = (v: unknown): v is string => typeof v === 'string' && SECTION_KINDS.includes(v);
