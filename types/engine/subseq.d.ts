/**
 * Subsequences (`[0 2 4]`, decision 027): a step that holds steps, squeezed into its own length, stacked with commas
 * (`[0 2, 4]`), and Strudel's other forms of one (#337): `<a b c>` one per lap, `x/n` slowed, `x(k,n,r)` struck by a
 * euclid, `[a b|c]` a choice of sequences. What every reading of a braid's timing shares: where each step inside plays
 * (`slots`), what a step holds at the bottom (`leaves`), and a step's numbers moved (`mapLeaves`).
 */
import type { Atom } from './ast';
/** An atom that isn't a subsequence: a note, a rest, a chord, a choice, a splice or a mix. */
export type Leaf = Exclude<Atom, {
    kind: 'seq';
}>;
/** A step as the readings of a braid see it: a token or a unit. */
interface Step {
    readonly atom: Atom;
    readonly repeat: number;
    readonly subdivide: number;
    readonly elongate: number;
    readonly chance?: number | null;
    /** &x:0:g: a hit's own gain. */
    readonly level?: number;
}
/** What a step holds at the bottom, in order (a subsequence's steps, layer by layer, nested ones opened). */
export declare function leaves(a: Atom): Leaf[];
/** Every step inside a subsequence, nested ones too, in order (none for any other atom). */
export declare function innerSteps<T extends Step>(a: Atom): T[];
/** A step with each leaf moved by `f` (a subsequence keeps its shape). */
export declare function mapLeaves(a: Atom, f: (l: Leaf) => Atom): Atom;
/** How many notes a step stands for, its repeats and ratchets counted, nested ones opened (`each`: a leaf's; a euclid's hits each as many). */
export declare function countOf(u: Step, each: (l: Leaf) => number): number;
/** The laps a step sounds on: those where lap mod `of` is `is` (`<0 2>`: 0 on even laps, 2 on odd). */
export interface Laps {
    readonly of: number;
    readonly is: number;
}
/**
 * A choice of sequences a slot is in (`[0 2|4]`): it sounds when option `is` of `of` is drawn. The draw is thrown once
 * per lap of the choice's own frame, keyed on `id` and on where that lap of the frame begins: `lap` laps from the
 * slot's own lap, at step `at` (in the braid's steps).
 */
export interface Chosen {
    readonly id: string;
    readonly of: number;
    readonly is: number;
    readonly lap: number;
    readonly at: number;
}
/** One place a leaf plays in a braid: from `at` for `dur`, in the braid's steps. */
export interface Slot<A = Leaf> {
    readonly atom: A;
    readonly at: number;
    readonly dur: number;
    /** The x?p of the steps it is in, outermost first (null: the cell's chance=). */
    readonly chances: readonly (number | null)[];
    /** The step of the braid it is in (its index in `units`). */
    readonly top: number;
    /** Its gain (&x:0:g), times the gains of the steps it is in; none written: absent. */
    readonly level?: number;
    /** `<a b>`, `x/n`: the laps it sounds on (absent: every lap). */
    readonly laps?: Laps;
    /** `[a b|c]`: the choices it is in. */
    readonly chosen?: readonly Chosen[];
}
/**
 * A leaf's play, as Strudel queries a pattern (decision 027, #337): a lap of a step's frame is a lap of the cell (a
 * subsequence's steps see the lap their step sees, as Strudel's sequence passes its cycle on). Placed in the braid's
 * steps, from `at` for `dur` (a slowed step's can run past its lap, as Strudel's whole does), on the laps where
 * lap mod `of` is `is`, in the choices `picks`.
 */
export interface Hit<A> {
    readonly atom: A;
    readonly at: number;
    readonly dur: number;
    readonly of: number;
    readonly is: number;
    readonly chances: readonly (number | null)[];
    readonly level?: number;
    readonly picks: readonly Chosen[];
}
/** What a leaf holds in a frame from `at`, `dur` long: itself, once (flatten: a splice's notes). */
type LeafHits<A> = (a: Leaf, at: number, dur: number) => readonly Hit<A>[];
/**
 * How many laps a step takes to come round, at most (`<0 2>` 2, `[0 2]/3` 3, `<0 <2 4>>` 4): its alternations' lengths
 * and slowings multiplied out. A ratchet only shortens it.
 */
export declare function lapsOf(a: Atom): number;
/** A leaf as itself: one hit, all of its frame, every lap. */
export declare const whole: <A>(atom: A, at: number, dur: number) => Hit<A>[];
/** How long a step lasts, in a braid's steps, before its hold: a leaf `unit`, a subsequence one (one written bare, `&x/2`, as its step would). */
export declare function footOf(a: Atom, unit: (a: Leaf) => number): number;
/**
 * Where each leaf of a braid plays, in its own steps: a step lasts `unit` (a splice: its steps; anything else one)
 * times its hold (@n), n times over (!n), ratcheted (*n) inside that. A subsequence takes one step and shares it out
 * among its steps, each by its hold and repeats (`[0 2@2]`: a third and two thirds; a splice inside one slot, its own
 * steps squeezed into it); its layers (`[0 2, 4]`) each span all of it. `<a b>`, `x/n`, `x(k,n,r)` and `[a b|c]` play
 * as Strudel's mini-notation does, a lap of the braid its cycle: each slot with the laps it sounds on and the choices
 * it is in. `leaf` is what a leaf holds in its frame (flatten: a splice's own notes); `id` names the choices.
 */
export declare function placed<A>(units: readonly Step[], unit: (a: Leaf) => number, leaf: LeafHits<A>, id?: string): Slot<A>[];
/** Where each leaf of a braid plays, in its own steps (`placed`, each leaf as itself). */
export declare const slots: (units: readonly Step[], unit: (a: Leaf) => number) => Slot[];
export {};
