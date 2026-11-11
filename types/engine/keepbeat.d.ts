import type { Plan } from './realize';
/**
 * The second of `after` at which `before`, heard at its second `seconds`, goes on: where `after`'s beat clock has taken as
 * many steps as `before`'s had. A frontend swapping plans asks `after` from there what it would have asked `before` from
 * `seconds` on, each second of `after` past it one second later (Cell studio's plan swap, Jambot's seam; the host does
 * it for a `load` that carries `anchor`).
 */
export declare function keepBeat(before: Plan, after: Plan, seconds: number): number;
