import { type Role } from '../attributes';
import type { ShowPlugin } from '../plugins';
import { type Clock, type ResolvedCell } from '../program';
import type { Cells, Ctx } from './context';
import type { Declared } from './declare';
/** What `rolesOf` reads of a piece: its cells, its clocks, its sections (each to its table) and its bands (each with its entries). */
export interface RolePiece {
    readonly cells: ReadonlyMap<string, ResolvedCell>;
    readonly clocks: ReadonlyMap<string, Clock>;
    readonly sections: ReadonlyMap<string, string>;
    readonly bands?: ReadonlyMap<string, readonly string[]>;
}
/** roles(cell): what the cell is, as far as an attribute cares (`Role`, attributes.ts). A cell can be several. */
export declare function rolesOf({ cells, clocks, sections, bands }: RolePiece): (c: ResolvedCell) => Set<Role>;
export declare function checkRoles(ctx: Ctx, { decls, implicit, sections }: Declared, cells: Cells, clocks: ReadonlyMap<string, Clock>, plugins: ReadonlyMap<string, ShowPlugin>, bands?: ReadonlyMap<string, readonly string[]>, instruments?: ReadonlySet<string>): void;
