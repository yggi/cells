import type { CompileResult } from './program';
/**
 * What a flow is:
 *  - `mix`: an entry of a mix (a voice, an instrument, a read head, a resonator, a mix) into it, at its gain;
 *  - `channel`: a sound card's named channel into it (`&out &left &right`);
 *  - `write`: a mix onto the sound tape that records it; `play`: a sound tape under a read head;
 *  - `excite`: a mix's sound driving a resonator; `couple`: coupled resonators ringing into each other;
 *  - `midi`: an entry of a MIDI card (map=midi) into it: a voice of a product written on it, or a cell named as the
 *    entry (a mix, a pattern read through a kit), at its channel. It carries notes (gate and pitch), not sound.
 */
type FlowKind = 'mix' | 'channel' | 'write' | 'play' | 'excite' | 'couple' | 'midi';
/** A way sound goes: from a cell (a voice, a mix, a tape head, a body) into what hears it. */
export interface Flow {
    /** Its edge in the graph (graph.ts ids). */
    readonly id: string;
    readonly kind: FlowKind;
    readonly from: string;
    readonly to: string;
    /** A mix entry's gain (the numbers in its product). */
    readonly gain?: number;
    /** A MIDI card's entry: the channel it goes out on (1–16). */
    readonly channel?: number;
    /** A coupling's way back: written on `to`'s line (`couple=&from`), not on `from`'s. */
    readonly back?: boolean;
}
/** The flows, in the order they're written (cell by cell), and by either end. */
export interface Flows {
    readonly all: readonly Flow[];
    readonly from: ReadonlyMap<string, readonly Flow[]>;
    readonly to: ReadonlyMap<string, readonly Flow[]>;
}
/** Every way sound can go. */
export declare function flows(result: CompileResult): Flows;
export {};
