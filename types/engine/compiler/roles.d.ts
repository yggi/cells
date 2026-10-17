import { type ShowPlugin } from '../plugins';
import { type Clock } from '../program';
import type { Cells, Ctx } from './context';
import type { Declared } from './declare';
export declare function checkRoles(ctx: Ctx, { decls, implicit, sections }: Declared, cells: Cells, clocks: ReadonlyMap<string, Clock>, plugins: ReadonlyMap<string, ShowPlugin>): void;
