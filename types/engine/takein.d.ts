import type { CompileOptions } from './program';
/** A given cell taken into the piece: the text with its line written in, or why it can't be. */
export type TakenIn = {
    readonly text: string;
} | {
    readonly why: string;
};
/** The text with `name`'s line (bare) the piece's own, where an edit can reach it (see the module's comment). */
export declare function takeIn(text: string, name: string, options?: CompileOptions): TakenIn;
