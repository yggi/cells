import type { CellDecl } from '../ast';
import type { Cells, Ctx } from './context';
export declare function checkCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, sections?: ReadonlyMap<string, string>): void;
