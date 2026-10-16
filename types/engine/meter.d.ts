/** A group of steps [from, to) at a level: 0 the bar, then finer (1 a beat, 2 a half, 3 a subdivision, 4 finer). */
export interface MeterGroup {
    readonly level: number;
    readonly from: number;
    readonly to: number;
    readonly groups: readonly MeterGroup[];
}
export interface Meter {
    /** The bar: level 0 over all the steps, its groups nested by the levels. A scan's is flat, every step one group at level 1. */
    readonly tree: MeterGroup;
    /** Each step's level (a scan's: 1 each). */
    readonly levels: readonly number[];
    /** Each step's position in the bar, 0 ≤ p < lap (the time map's ticks). */
    readonly positions: readonly number[];
    /** The bar's length in those positions. */
    readonly lap: number;
    /** The form it was written as: `meter(…)` (levels, its steps even) or `scan(…)` (positions, every step level 1). */
    readonly written: 'meter' | 'scan';
}
/** meter(…): steps by level, a bar whose steps are even. */
export declare function meterOfLevels(levels: readonly number[]): Meter;
/** scan(…): positions in the bar, no levels: a flat tree. */
export declare function meterOfScan(steps: readonly number[]): Meter;
