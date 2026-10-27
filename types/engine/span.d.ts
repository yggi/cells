import type { CompileResult } from './program';
import type { Plan } from './realize';
/** At most this long by default (s): a day's piece would be a very long file. */
export declare const LONGEST = 3600;
/** A piece that neither ends nor comes round is taken for this long (s). */
export declare const UNBOUNDED = 60;
/** What still rings after the span, by default (s): a release, a reverb's tail. */
export declare const TAIL = 2;
/** What a render may say about its span; each left out takes the rule's default. */
export interface SpanOptions {
    /** How long, from `from` (s): the rule's choice where left out. */
    readonly seconds?: number;
    /** Where it starts, in the piece's time (s): 0 by default. */
    readonly from?: number;
    /** The most it may be (s): `LONGEST` by default. */
    readonly longest?: number;
    /** What still rings after it (s): `TAIL` by default. */
    readonly tail?: number;
}
/** A render's span: from, to and the tail after it, in the piece's seconds, and why it is that long. */
export interface Span {
    readonly from: number;
    readonly to: number;
    readonly tail: number;
    /**
     * Why: `given` (the caller's seconds), `ends` (the whole piece), `cycle` (one time round, every layer back together),
     * `layer` (its longest layer: the cycle is longer than half an hour, or never comes), `unbounded` (it neither ends nor
     * repeats: `UNBOUNDED`).
     */
    readonly why: 'given' | 'ends' | 'cycle' | 'layer' | 'unbounded';
    /** It was cut to `longest`. */
    readonly capped: boolean;
}
/** The span a render of this plan takes (see the module's comment). */
export declare function spanOf(result: CompileResult, plan: Plan, options?: SpanOptions): Span;
