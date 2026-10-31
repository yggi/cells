/**
 * A style read by a voice (decision 063 §3): `lpf=300..1200 * &style[artic]`. A moving parameter multiplies its factors'
 * series (`realize.ts`), each the whole of a cell; a factor picked by a slot (`&style[artic]`, `&pluck[sustain]`, read as
 * `[$i]` by `compiler/slots.ts`) is given a cell of its own here, before compile, that holds what it reads:
 *
 * - a slot of a style (`map=style`) or an envelope (`map=adsr`): that one value, held;
 * - an axis of a cell with `style=`: the style's value on it, held; for a range, `style=a..b`, a glide from a's value to
 *   b's over the cell's scope, the piece's length (`Scope`): in a straight line, sixteen steps a bar (`step=1m*16`), b's
 *   on the last, so it comes round with the piece (#376: on the meter, it is the piece's time) and follows the tempo.
 *   With no meter, it glides in seconds on a clock of its own. With no scope known yet, it holds a's value.
 *
 * And every `style=` is read: a style cell (`map=style`), an unnamed one, or a mix of them by weight, which is exact by
 * definition (the point it computes); each end within the axes' ranges.
 */
import type { ParseResult } from './ast';
/** The span a glide runs over: the piece's meter and its steps over the piece, or seconds where it has no meter. */
export type Scope = {
    readonly bars: number;
} | {
    readonly seconds: number;
};
/**
 * The piece with a cell for each picked factor of a style or an envelope, and `glides`: whether a range of styles is
 * read, which needs the piece's scope (compile once without it, then with it: `compile.ts`).
 */
export declare function readStyles(parsed: ParseResult, scope: Scope | null): {
    parsed: ParseResult;
    glides: boolean;
};
