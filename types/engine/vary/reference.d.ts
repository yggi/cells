/**
 * A variation's reference (#293): the varied line written as a form on the line it varies, so a text that plays the
 * variation keeps what was varied. Every operator has one in the forms the language already has:
 *
 *  - **rotate**: `&x[<<]`, the line one step later, a pick, which a mix reads as an entry (`[&kick, &hat[<<]]`), where
 *    its last token is one step (a last run, `~!7`, would wrap whole);
 *  - **transpose**: `&x^n`; with anchored notes, `base=&x^n` and the anchored ones written as they are (`base=&bassline^-1 0`);
 *  - **invert**: `inverse(&x)`, about a first note off 0 `degree(inverse(&x), 2f)`; with anchored notes the mirror moves,
 *    the line's picks around them mirrored (`&x[0] inverse(&x[1:])`);
 *  - **reverse**: `&x[::-1]`; with anchored notes, each span between two of them read backwards (`&x[0] &x[:0:-1]`);
 *  - **drop**, **add**, **trim**, **bend**: a copy of the line changed on the one step it changes (decision 026's
 *    `base=`): `base=&hat =!6 ~`, `base=&hat =!3 &hh:0:.4`, `base=&bassline =!3 1`.
 *
 * None where the line can't be read so (a Euclid, a subsequence on one step, a line with a cell of levels, a cut inside a
 * held note), and none where the form would be longer than the line written out (the folder's `bare` on one line: its
 * characters, a run's spaces one). A cell that splices a line of hits has no voice (`&r step=16n &hat[:4] ~ &hat[5:]`
 * is an error), so a line of hits is referred to by a pick in a mix or by `base=`, never by a braid of its slices. Pure.
 */
import type { Operator } from '.';
import { type Line, type LineNote } from './lines';
/** A variation's reference: its form on the line it varies, and a cell that plays it. */
export interface Reference {
    /** The form: `&hat[<<]`, `&bassline^-1`, `inverse(&bassline)`, `&bassline[0] &bassline[:0:-1]`, `base=&hat =!6 ~`. */
    readonly form: string;
    /**
     * A cell named `name` that plays it, to read where the line was read: `&hat2 [&hat[<<]]`, `&bass2 step=4n over=&harm
     * &bassline^-1`, `&hat2 base=&hat =!6 ~`. A pick (rotate's) may stand in a mix's entry as it is.
     */
    readonly line: (name: string) => string;
}
/**
 * The reference of a variation of `line` (its braid as written, `braid`, and its attributes, `attrs`) by `operator`,
 * which gives it `notes`: `pinned` its anchored steps that the operator leaves where they are, `amount` its degrees
 * (transpose) or its mirror's (invert: twice the first note's degree). Null where there is none.
 */
export declare function referenceOf(line: Line, braid: readonly string[], attrs: readonly string[], operator: Operator, notes: readonly LineNote[], pinned: ReadonlySet<number>, amount: number | null): Reference | null;
