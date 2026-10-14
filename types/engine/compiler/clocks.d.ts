/** Phase 4: time — clocks (cells moved at a rate), every cell's steps per step of its clock, times given as clocks. */
import type { CellDecl } from '../ast';
import { type Clock } from '../program';
import type { Cells, Ctx } from './context';
/** The clocks; each cell's clock, rate and times given as clocks, set on a copy of the cells it is given. */
export declare function clockCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells): {
    cells: Cells;
    clocks: ReadonlyMap<string, Clock>;
};
