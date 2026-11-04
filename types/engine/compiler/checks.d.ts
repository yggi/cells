import type { CellDecl } from '../ast';
import type { Cells, Ctx } from './context';
export declare function checkCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, sections?: ReadonlyMap<string, string>, bands?: ReadonlyMap<string, readonly string[]>): void;
/** A grid's period as written: a whole number, or the simplest fraction within a millionth (3/2, 5/4). */
export declare function ratioText(r: number): string;
