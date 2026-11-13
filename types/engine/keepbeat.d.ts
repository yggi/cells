import type { Plan } from './realize';
/**
 * The second of `after` at which `before`, heard at its second `seconds`, goes on: where `after`'s beat clock has taken as
 * many steps as `before`'s had. A frontend swapping plans asks `after` from there what it would have asked `before` from
 * `seconds` on, each second of `after` past it one second later (Cell studio's plan swap, Jambot's seam; the host does
 * it for a `load` that carries `anchor`).
 */
export declare function keepBeat(before: Plan, after: Plan, seconds: number): number;
/** Where a recompiled plan takes over (#701): the old plan's second at the bar line it waits for, and the new plan's there. */
export interface KeptBar {
    /** The second of `before` at the next bar line of its main meter: `before` answers up to it. */
    readonly line: number;
    /** The second of `after` that goes on from there: `keepBeat(before, after, line)`. */
    readonly at: number;
}
/**
 * Where a recompiled plan waits for the bar line (#701, decision 081 §3): `before`, heard at its second `seconds`, keeps
 * the bar it is in when `after` places that bar otherwise than at another tempo (a swing's share or a bend's depth moved:
 * the bar's points, as its beat clock plays them, at other shares of the bar's length). Then `before` answers up to the
 * next bar line and `after` from there, anchored at it, the line no time map moves. Null where nothing waits: the two
 * place the bar alike (a tempo moved alone keeps #56's behaviour, the beat in progress kept and what follows at the new
 * rate at once), `seconds` is on a bar line, or either plan has no beat clock or bars of another length.
 */
export declare function keepBar(before: Plan, after: Plan, seconds: number): KeptBar | null;
