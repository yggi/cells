import type { CompileResult, Shifts } from './program';
import { type Played } from './realize';
/** A render's sample rate when none is given (Hz): cells' `SAMPLE_RATE`. */
export declare const DEFAULT_RATE = 48000;
/** The rates a render takes (Hz). */
export declare const RATES: {
    readonly lowest: 8000;
    readonly highest: 192000;
};
/**
 * What a stem is (decision 062): `mix`, the mix alone; `voices`, a stem for each voice heard; `entries`, a stem for each
 * entry of the sound card (each term of its mix, or of a channel's: what the piece mixes, at the level it mixes it). The
 * mix is given with either, and the stems sum to it.
 */
export type Tracks = 'mix' | 'voices' | 'entries';
export interface RenderOptions {
    /** Hz: `DEFAULT_RATE` where left out. */
    readonly sampleRate?: number;
    readonly tracks?: Tracks;
    /** What is switched off (graph ids): the piece's `off` cells where left out. */
    readonly muted?: ReadonlySet<string>;
}
/** Something the renderer couldn't sound as written: a voice's parameter of a later stage, which it renders dry. */
export interface RenderDiagnostic {
    readonly voice: string;
    readonly param: string;
    readonly message: string;
}
/** Frames rendered: the mix's two channels, and each stem's (`tracks: 'voices'` or `'entries'`), by its name. */
export interface Rendered {
    readonly mix: readonly [Float32Array, Float32Array];
    readonly stems: ReadonlyMap<string, readonly [Float32Array, Float32Array]>;
}
export interface Renderer {
    readonly sampleRate: number;
    /**
     * The stems' names, in order: the voices heard, in the order the text defines them (`'voices'`); the card's entries,
     * named by the cells they name (`crackle*vinyl`, a second of a name `#2`, on a card of two channels `:left`, `:right`),
     * in the card's order (`'entries'`); none for `'mix'`.
     */
    readonly stems: readonly string[];
    /** Frames rendered so far: the next `render` starts here. */
    readonly position: number;
    readonly diagnostics: readonly RenderDiagnostic[];
    /** Notes to sound. One that starts before `position` sounds from there on. Stems by entry need each note's `output` (`eventsBetween(…, true)`). */
    add(events: readonly Played[]): void;
    /** The next `frames` frames. */
    render(frames: number): Rendered;
}
/** A renderer for a compiled piece's voices (see the module's comment). */
export declare function createRenderer(result: CompileResult, shifts: Shifts, options?: RenderOptions): Renderer;
/** A render's loudness: the RMS of its channels and its peak, in dB below full scale, and how many samples reached it. */
export declare function loudness(channels: readonly Float32Array[]): {
    rms: number;
    peak: number;
    clipped: number;
};
