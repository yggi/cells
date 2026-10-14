/** Phase 6: the outputs — one per voice binding, articulated (the finest step= term starts notes; the others and loop= terms bend or hold). */
import { type CellDecl } from '../ast';
import { type Clock, type Output, type Resonance, type TapeReturn } from '../program';
import type { Bound } from './bindings';
import type { Cells, Ctx } from './context';
export declare function outputsOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, clocks: ReadonlyMap<string, Clock>, { sinks, cards, bindings, soundHead }: Bound): {
    outputs: Output[];
    returns: TapeReturn[];
    resonances: Resonance[];
};
