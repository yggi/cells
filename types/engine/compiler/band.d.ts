/** The performers (decision 058): each gate, and the role a role cell gives it (decision 061); a role's entries are gates, one role each. */
import type { CellDecl } from '../ast';
import type { Performer } from '../program';
import type { Ctx } from './context';
/** What a role cell is, where a sound is wanted (a mix, a card, a gate's play=). */
export declare const noSound: (name: string) => string;
export declare function performersOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, implicit: ReadonlySet<string>): Performer[];
