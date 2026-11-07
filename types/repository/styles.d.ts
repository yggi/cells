import type { Fragment, StylePoint } from './fragments';
/** The styles built so far: the collection `styles`, associated as the facet `style` at each of its points. */
export declare const STYLE_FRAGMENTS: readonly Fragment[];
/** One preset style: its id (its cell's name), its display name, its point on the axes and its default tempo in bpm. */
export interface Style {
    readonly id: string;
    readonly name: string;
    readonly point: StylePoint;
    readonly tempo: number;
}
/** The preset styles, in the collection's order: what a frontend offers as its presets. */
export declare const STYLES: readonly Style[];
/** A preset style's point by its id; it throws on an id the collection lacks. */
export declare function stylePoint(id: string): StylePoint;
/** A point on the four axes, for a place that is not a preset's (a test's, a fragment's). */
export declare const at: (sync: number, harm: number, artic: number, energy: number) => StylePoint;
export declare const SYNTH_POP: Readonly<Record<string, number>>;
export declare const TECHNO: Readonly<Record<string, number>>;
export declare const DEEP_HOUSE: Readonly<Record<string, number>>;
export declare const AMBIENT: Readonly<Record<string, number>>;
export declare const LO_FI: Readonly<Record<string, number>>;
export declare const FUNK: Readonly<Record<string, number>>;
export declare const BOSSA_NOVA: Readonly<Record<string, number>>;
export declare const SWING_JAZZ: Readonly<Record<string, number>>;
export declare const ELECTRO_SWING: Readonly<Record<string, number>>;
export declare const SPOOKY: Readonly<Record<string, number>>;
export declare const KINDERLIED: Readonly<Record<string, number>>;
