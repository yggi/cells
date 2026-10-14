/**
 * β (docs/notes/fold.md, #234's α and β): a symbol written back where it is used when it doesn't pay — when writing it
 * once (`&m3 …`) and naming it at each use (`&m3^$5`) costs more characters than writing it out at each use. The
 * description length is the judge (MDL): what pairs folds, β unfolds where the fold is dearer than the notes.
 */
import type { Folded, Tool } from './ir';
/** A symbol written back where it is used (in the lines and in other symbols), and gone: what β does to one that
 * doesn't pay, and a fold's story (fold/story.ts) to each in turn. */
export declare function inline(f: Folded, key: string): Folded;
/** Inline every symbol that doesn't pay, the cheapest saving first, until all that is left pays. */
export declare const beta: Tool;
