/**
 * What a tap does to what it carries (docs/notes/nets.md, "a tap is (net, transform)"): the transform written where a
 * name is read, as data. A wire of the graph (engine/graph.ts) carries one per place its name is written; its label is
 * drawn from them (`edgeLabel`), so the label and the transform can't disagree.
 */
import { type Pick, type RateOp } from './ast';
/** One step of a transform, applied in order (as the language applies them: a pick, a shift, the values' operations, then the tables, then a transposition). */
export type TransformStep = 
/** A slice or a pick of the steps as written: `[a:b]`, `[i]`, `[::-1]`. */
{
    readonly kind: 'pick';
    readonly pick: Pick;
}
/**
 * A delay: `by` steps behind (`[<<n]`; `[>>n]` is −n: on a table read through over=, a rotation) or, on a tape's
 * read head, `by` tape-seconds after its write head (`at=`).
 */
 | {
    readonly kind: 'delay';
    readonly by: number;
    readonly unit: 'step' | 'second';
}
/** `degree(…, n)`: n steps up the table it is read through, before the tables read it. */
 | {
    readonly kind: 'degree';
    readonly by: number;
}
/** `inverse(…)`: the values mirrored round 0, before the tables read them. */
 | {
    readonly kind: 'inverse';
}
/** A transposition after the tables: `^$n` grid steps, or `+n` semitones (a number in a pitch sum). */
 | {
    readonly kind: 'transpose';
    readonly by: number;
    readonly unit: 'grid' | 'semitone';
}
/** Subtracted in a pitch sum (`− &x`). */
 | {
    readonly kind: 'negate';
}
/** A gain: a voice's level in a mix (`&lead * .4`). */
 | {
    readonly kind: 'gain';
    readonly by: number;
}
/**
 * A rate (step= / loop=): the driver's ticks multiplied (`*n`) and divided (`/n`) left to right, as written; once per
 * cycle of the driver (`cycle(&x)`) rather than per step; the whole braid per tick (`loop=`); through a spring (`belt=`).
 */
 | {
    readonly kind: 'rate';
    readonly by: readonly RateOp[];
    readonly per: 'step' | 'cycle';
    readonly whole: boolean;
    readonly belt?: number;
};
export type Transform = readonly TransformStep[];
/** `×2÷3`: a rate's chain, as written. */
export declare const rateChain: (by: readonly RateOp[]) => string;
/** One step, as the label shows it (close to how it is written). */
export declare function stepLabel(s: TransformStep): string;
/** A transform as the label shows it: its steps in order. */
export declare const transformLabel: (t: Transform) => string;
/** A port that is an attribute of the reader (`fm=`, `lpf=`, `write=` …): its label names it. */
export declare const isAttribute: (port: string) => boolean;
/**
 * An edge's label: how many slots of it are written (`×2`), the attribute it feeds, what each place it is written does
 * (the different ones, in order: the first three, then …), and how its port combines it. Undefined when there is nothing to say.
 * A relative pick into a braid isn't said: its strand leaves the tap it reads; an absolute one ([$0]) is, on its wire from the hub.
 */
export declare function edgeLabel(e: {
    readonly port: string;
    readonly count: number;
    readonly transforms: readonly Transform[];
}): string | undefined;
