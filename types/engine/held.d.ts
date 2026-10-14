/**
 * free() values moved by hand: what plays, not what's written, until they are kept. They are held by
 * their place among the code's free()s (the first, the second … in reading order), so rewriting the
 * code around them can't lose them.
 */
import type { CompileResult } from './program';
/** Held values by their place among the code's free()s. */
export type Held = ReadonlyMap<number, number | string>;
/** Every free() in the code, in reading order. */
export declare const freeList: (r: CompileResult) => import("./ast").FreeSpec[];
/** The place of the free() written at a span, or −1. */
export declare const freeIndex: (r: CompileResult, spec: {
    span: {
        line: number;
        col: number;
    };
}) => number;
/** The code with the held values written in. */
export declare function withHeld(src: string, r: CompileResult, held: Held): string;
