/**
 * A fold's story (#390): how a piece folded comes about, told from its result, not from the search that found it (the
 * folder's moves, `Watch`, go back and forth and start over). From the lines written out to the fold taken, a cell at
 * a time, each before what is made of it: motifs, then the phrases made of them, then the sections. Each frame is the
 * piece as it would be with only the cells so far, so each plays the same notes as the last (β's own move, `inline`,
 * undone in turn). Replayed, the code edited a frame at a time, the graph forms as the piece folds. Pure.
 */
import type { Folded, Line } from './ir';
/** A frame of a story: the folded lines as they are by then, and what changed to get there (a symbol that came, its uses). */
export interface StoryFrame {
    readonly folded: Folded;
    /** The symbol that came in this frame (null: the first two, the lines written out and then on their clocks and figures). */
    readonly came: string | null;
    /** Where it is used: in the lines and other symbols, a run counted once. */
    readonly uses: number;
}
/**
 * The story of a fold: the lines written out (`lines`, as the folder started from them), then on their clocks and
 * figurations with no symbol yet, then a symbol a frame, the lowest first (each before what uses it; at one height,
 * in the order the piece first uses them), to the fold itself (`f`), the last frame.
 */
export declare function storyOf(lines: readonly Line[], f: Folded): StoryFrame[];
