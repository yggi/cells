/** Phase 4: time — clocks (cells moved at a rate), every cell's steps per step of its clock, times given as clocks. */
import type { CellDecl, Tap } from '../ast';
import { type Clock } from '../program';
import { type Meter } from '../meter';
import type { Cells, Ctx } from './context';
/** A tap's clock's name: the meter's, the tap and its bars (`bar:16n`, `bar:1n:4`); no cell can be called that. */
export declare const tapClockName: (meter: string, tap: Tap, bars: number) => string;
/**
 * The tap of a root meter that steps a second meter as its own tempo does (decision 093): `pulse*n/d`, the second's beats
 * a second (a meter(…)'s, as its bpm counts them; a scan's entries) over the root's pulses a second, as a fraction of
 * whole numbers; null where the two rates are in no such ratio (a denominator past 100,000).
 */
export declare function derivedTap(root: {
    readonly meter: Meter;
    readonly perSecond: number;
}, second: {
    readonly beat: number;
    readonly scan: boolean;
    readonly perSecond: number;
}): string | null;
/**
 * The tap that says what `step=&bar<chain>` says on a meter of `meterSteps` steps and `pulses` pulses of note value `unit`
 * (decision 040): the bar (`1m`, `1m/4`), a note value where a bar holds a whole number of them (`8n`, `4t`), else the
 * pulse with the chain (`pulse*3/4`). Exact: each steps where the raw step did.
 */
export declare function tapFor(meterSteps: number, pulses: number, unit: number, ratio: number): string;
/** The clocks; each cell's clock, rate and times given as clocks, set on a copy of the cells it is given. */
export declare function clockCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells): {
    cells: Cells;
    clocks: ReadonlyMap<string, Clock>;
    mainMeter: string | null;
    meters: readonly string[];
};
