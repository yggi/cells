import type { CellDecl } from '../ast';
import { type Clock, type Output } from '../program';
import type { Cells, Ctx } from './context';
export declare function checkLimits(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, clocks: ReadonlyMap<string, Clock>, outputs: readonly Output[]): void;
