/**
 * Phase 7½: an instrument's sound parameters (decision 067). A mix used like a voice is a module after its voices: its
 * sound parameters process what its voices play, in series after each voice's own. The renderer plays each instrument's
 * filters as a stage of its own after the voice's (`render.ts`); its `pan=` is in the outputs' gains, a balance after the
 * voice's (`outputs.ts`). What isn't a processor (a wave, FM, a glide) belongs on a voice: an error here.
 *
 * A voice that plays only through instruments also takes, where it sets none, the linear parameters they write
 * (`ResolvedCell.inherited`): filtering a sum is the sum of the filtered, so a frontend that builds a voice's chain from
 * its cell alone plays the instrument's filter (Cell studio, until it builds an instrument's chain). cells' renderer
 * plays the instrument's stage instead, and leaves what a voice inherited out of the voice's own chain.
 */
import type { CellDecl } from '../ast';
import type { Output } from '../program';
import type { Cells, Ctx } from './context';
/** The parameters a voice takes from the instruments it plays only through: linear, so the sum's is each voice's. */
export declare const LINEAR: readonly string[];
/** The mixes the outputs play through as instruments. */
export declare const instrumentsOf: (outputs: readonly Output[], cells: Cells) => ReadonlySet<string>;
/** The cells, each voice that plays only through instruments with linear parameters given theirs where it sets none. */
export declare function instrumentParams(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, outputs: readonly Output[], playings: ReadonlyMap<string, readonly (readonly string[])[]>): Cells;
