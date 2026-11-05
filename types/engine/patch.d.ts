import type { Resolve } from './program';
/** A place a cable goes into. */
export interface Jack {
    /** The attribute (`lpf`, `pitch`, `env`, `fm`), or a module's parameter by its name (`cutoff`), or its input (`in`). */
    readonly port: string;
    /** Where it is written: an attribute of the cell's line, a module's argument, or a module's input (its main argument). */
    readonly kind: 'attribute' | 'argument' | 'input';
    /** What it takes: a level or a share (`cv`), or sound (`audio`). */
    readonly band: 'cv' | 'audio';
    /** The cells patched into it now, by name (no `&`), in the order written. */
    readonly patched: readonly string[];
    /** Its value with no cable, as written (`70..4800`, `800`, a module's default `map=lin .5`), or null where none is written. */
    readonly knob: string | null;
}
/** A patch the text can't take: why, in words. */
export declare class PatchError extends Error {
}
/** The moving sound parameters a voice offers as jacks; an instrument's are the linear ones among them (decision 067 §1). */
export declare const MOVING: readonly ["lpf", "lpq", "hpf", "hpq", "bpf", "bpq", "room", "delay"];
/** The jacks &cell offers, patched or not (see the module's comment); none for a cell that is no voice, instrument or module. */
export declare function jacksOf(source: string, cell: string, resolve?: Resolve): Jack[];
/** &cell's line with a cable from &from patched into `port` (see the module's comment). */
export declare function patch(source: string, cell: string, port: string, from: string, resolve?: Resolve): string;
/** &cell's line with the cable from &from pulled out of `port`: the jack back to its knob. */
export declare function unpatch(source: string, cell: string, port: string, from: string, resolve?: Resolve): string;
