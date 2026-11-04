/**
 * Phase 7½: an instrument's sound parameters (decision 067). A mix used like a voice is a module after its voices: the
 * linear parameters on it (a filter, a pan, a send) are each of its voices', where the voice sets none, since filtering
 * a sum is the sum of the filtered. What its own chain would sound (a parameter on both, in series; grit on the sum) is
 * said and not yet rendered; what isn't a processor (a wave, FM, a glide) belongs on a voice.
 */
import type { CellDecl } from '../ast';
import type { Output } from '../program';
import type { Cells, Ctx } from './context';
/** The parameters an instrument passes to its voices: linear, so the sum filtered is the sum of the filtered. */
export declare const LINEAR: readonly string[];
/** The mixes the outputs play through as instruments. */
export declare const instrumentsOf: (outputs: readonly Output[], cells: Cells) => ReadonlySet<string>;
/** The cells, each voice that plays only through instruments with sound parameters given theirs where it sets none. */
export declare function instrumentParams(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, outputs: readonly Output[], playings: ReadonlyMap<string, readonly (readonly string[])[]>): Cells;
