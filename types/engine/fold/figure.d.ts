/**
 * The look-up isometry (docs/notes/fold.md): a figuration. A run of blocks of a line, each the same rhythm and the
 * same pattern through its own chord (BWV 847's prelude: top, middle, low, middle, bottom, middle, low, middle, over a
 * new chord each half bar), is one figure read over a table of chords: `&f1 0 1 2 1 3 1 2 1` read `over=` a table
 * stepped once a block (`&t1 step=pulse/8 [12,3,2,0] …`), each chord in the order the figure first plays it. The figure is the slow part's shape, the table its harmony:
 * the notes factored into what repeats and what changes. Any block length, any line: the same move at every scale.
 */
import type { Tool } from './ir';
/** Each line's figurations, the longest first, written as look-ups. */
export declare const figure: Tool;
