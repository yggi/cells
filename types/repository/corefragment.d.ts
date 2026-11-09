import { type CoreOptions } from '../engine/core';
/** A fragment's core, and why it is the text as written where it is. */
export interface FragmentCore {
    readonly source: string;
    /** Why nothing was cored (no signature, no host that plays): absent where it was. */
    readonly why?: string;
}
/** A fragment's core up to its signature, heard through a host (see the module's comment). */
export declare function coreFragment(text: string, options?: CoreOptions): FragmentCore;
