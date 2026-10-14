import type { Cells, Ctx } from './context';
import type { Declared } from './declare';
import type { Typed } from './sorts';
export declare function resolveCells(ctx: Ctx, { decls, implicit, implicitRoot, overOk }: Declared, typed: Typed): Cells;
