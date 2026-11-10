/**
 * A fragment cored up to its signature (#590, decision 077 §2). A fragment alone doesn't play: its main parameter is a
 * hole, and it has no card, so S1 hears none of its rewrites. So it is cored in a host, `audition.ts`'s, with plain
 * stand-ins (a voice for every sound, no style):
 *  - each hole a stand-in: a sound a voice, a line a stepped line, a meter, a tempo or a key as a piece writes one;
 *  - each head played on a card, by its sort: a gate as itself, a line through a voice, a voice playing a line, a meter
 *    tapped, a table read;
 *  - the whole cored with the signature's names and the host's as its interface.
 * The host's lines are then taken off again: what is left is the fragment's core, its signature line as written, its
 * heads and parameters by name. Where no head plays in the host, or the host doesn't compile, the fragment is its own
 * core, and the reason says so. Pure.
 */
import { type CoreOptions } from '../engine/core';
/** A fragment's core, and why it is the text as written where it is. */
export interface FragmentCore {
    readonly source: string;
    /** Why nothing was cored (no signature, no host that plays): absent where it was. */
    readonly why?: string;
}
/** A fragment's core up to its signature, heard through a host (see the module's comment). */
export declare function coreFragment(text: string, options?: CoreOptions): FragmentCore;
