/** Phase 3: who plays what — kits, the sound card's channels, MIDI cards' channels, mixes expanded (instruments, sends), voices marked. */
import type { Binding, CellDecl, Span } from '../ast';
import { type MidiDest, type Output, type ResolvedCell } from '../program';
import type { Cells, Ctx } from './context';
import type { Typed } from './sorts';
/** Marks kits and voices on a copy of the cells it is given; returns it with the sound card's bindings. */
export declare function bindVoices(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells, typed: Typed): {
    cells: Cells;
    sinks: ResolvedCell[];
    cards: ResolvedCell[];
    bindings: {
        b: Binding;
        span: Span;
        gains: [number, number];
        via: Set<string>;
        parts: Output["parts"][number][];
        through: Set<string>;
        /** Played, but not heard: a mix that only excites a resonator or feeds a tape (a send). */
        silent?: boolean;
        /** The MIDI cards' entries it goes out on. */
        midi?: MidiDest[];
    }[];
    soundHead: (name: string) => boolean;
};
export type Bound = ReturnType<typeof bindVoices>;
