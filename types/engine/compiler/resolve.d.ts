import { type Meter } from '../meter';
import type { Cells, Ctx } from './context';
import type { Declared } from './declare';
import type { Typed } from './sorts';
/** A meter's steps a beat: what its bpm is read through (1 when it has no meter). */
export declare const stepsPerBeat: (m: Meter | null) => number;
export declare function resolveCells(ctx: Ctx, { decls, implicit, implicitRoot, overOk }: Declared, typed: Typed): Cells;
