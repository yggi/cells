import type { CoreOptions } from '../engine/core';
import type { CompileResult } from '../engine/program';
import type { StylePoint } from './fragments';
import { type Holes } from './holes';
/** The host's own cells, named so no fragment's are. */
export declare const HOST: {
    readonly voice: "_hv";
    readonly line: "_hl";
    readonly meter: "_hbar";
    readonly card: "_hout";
    readonly read: "_hr";
};
/** How a host stands in for a sound and a style: `coreFragment`'s plain one has neither a kit nor a style. */
export interface StandIns {
    /** The id of the kit whose drums stand in for the sounds it defines (`gm_kit`); null for a voice for every sound. */
    readonly kit: string | null;
    /** Where a style the fragment picks from stands: a point on the axes (the centre where an axis is left out); null for none. */
    readonly style: StylePoint | null;
}
/** How a head plays on the host's card, by what it compiled to; null where it plays no way the host knows. */
export declare function entryOf(result: CompileResult, head: string, tap: string): {
    entry: string;
    line?: string;
} | null;
/** Why a host plays nothing: none of the heads plays any way the host knows. */
export declare const NO_HEAD = "no head plays in a host";
/** A text and its host, as the host is built: before its card (to read what each head compiles to) and with it. */
export interface Hosted {
    /** The fragment's text (an argument the host gives written over its parameter's default line), then the host's lines. */
    readonly source: string;
    readonly holes: Holes;
    /** The host's lines, as written after the fragment's: each stand-in with the hole it fills, the host's own with none. */
    readonly lines: readonly {
        readonly line: string;
        readonly fills: string | null;
    }[];
    /** The heads it plays. */
    readonly heads: readonly string[];
    /** Did the host write a meter of its own (the fragment taps one it doesn't define, and doesn't read `&bar`)? */
    readonly meterless: boolean;
    /** Why nothing plays: no head the host can play, or a host that doesn't compile; absent where it plays. */
    readonly why?: string;
}
/**
 * What a fragment gives, read off its structure and never off a name (decision 075): a template's heads, its
 * signature's; a collection's, the cells nothing else in it reads (a groove's mix, a kit's drums). Bare names, in the
 * order written. No compile.
 */
export declare function headsOf(text: string): string[];
/**
 * The heads a host plays: of what a fragment gives (`headsOf`), those nothing else in it reads, so a groove's mix is
 * heard once and not again through each limb it mixes (`&groove`, not `&kick` too); all of them where each is read.
 */
export declare function playedHeadsOf(text: string): string[];
/**
 * A text in its host (see the module's comment): what `audition` gives and `coreFragment` cores. `heads`: the heads to
 * play, by default the signature's, else the cells nothing reads.
 */
export declare function hosted(given: string, standIns: StandIns, options?: CoreOptions, heads?: readonly string[]): Hosted;
/** What `audition` is told: how to read the library, and where a style the fragment picks from stands. */
export interface AuditionOptions extends CoreOptions {
    /** The point a style the fragment reads stands at (`{ bite: .8 }`); the centre of each axis it leaves out. */
    readonly style?: StylePoint;
    /** The kit whose drums stand in for the sounds it defines; `gm_kit` by default, null for a sine voice for every sound. */
    readonly kit?: string | null;
}
/** A fragment heard alone: the text that plays, the host's lines (each stand-in with the hole it fills), the heads it plays. */
export interface Audition {
    /** The fragment's text (an argument the host gives written over its parameter's default line), then the host's lines: what a frontend plays. */
    readonly text: string;
    readonly host: readonly {
        readonly line: string;
        readonly fills: string | null;
    }[];
    readonly heads: readonly string[];
    /** Why it doesn't play (no head the host can play; a host that doesn't compile); absent where it plays. */
    readonly why?: string;
}
/** A fragment's text heard alone (see the module's comment). */
export declare function audition(text: string, options?: AuditionOptions): Audition;
