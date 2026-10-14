/** A rate's units (`84bpm`, `440hz`, `1d` …): read after a number in step=, loop= and a free() rate. */
import { type Syntax } from './syntax';
/** A rate's units: n of them is n·times/per a second. */
export declare const RATE_UNITS: Readonly<Record<string, {
    readonly times: number;
    readonly per: number;
    readonly syntax: Syntax;
}>>;
/** The units after a number, longest first: bpm, hz, k. */
export declare const UNIT: RegExp;
/** n of a unit, a second. */
export declare const perSecond: (n: number, unit: string | null | undefined) => number;
