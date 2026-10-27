/** The performers (decision 058): each gate, and the role a role cell gives it (decision 061); a role's entries are gates, one role each. */
import type { CellDecl } from '../ast';
import type { Output, Performer } from '../program';
import type { Cells, Ctx } from './context';
/** What a role cell is, where a sound is wanted (a mix, a card, a gate's play=). */
export declare const noSound: (name: string) => string;
export declare function performersOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, implicit: ReadonlySet<string>): Performer[];
/** A band's entry (decision 061): a gate, or a role cell standing for its gates. */
export declare const isPerformer: (decls: ReadonlyMap<string, CellDecl>, name: string) => boolean;
/**
 * The bands (decision 061): a table some cell reads (`over=`) whose entries are all performers, gates or role cells, as
 * written; each to its entries, in order. A gate in a band twice (itself and in a role, or in two roles there) is an error.
 */
export declare function bandsOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): Map<string, readonly string[]>;
/**
 * The outputs, each a performer's (a gate's: `through`, or `via` on a card) switched by the selectors reading a band it is in, by its entry
 * there, itself or its role (decision 061). Its part keeps its time: what switching it on does is `restart=`, `free` unless
 * said (realize.ts).
 */
export declare function banded(outputs: readonly Output[], cells: Cells, bands: ReadonlyMap<string, readonly string[]>): Output[];
/**
 * A performer restarted or resumed by a band's selector starts where the selector's step falls: on whole bars (`step=1m`)
 * its notes keep their places in the bar, and its swing; off them they move in the bar, which warns (decision 061).
 */
export declare function checkBands(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, bands: ReadonlyMap<string, readonly string[]>): void;
