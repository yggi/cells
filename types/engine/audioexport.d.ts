import { type RenderDiagnostic, type Tracks } from './render';
import { type Span, type SpanOptions } from './span';
import type { CompileResult, Shifts } from './program';
export interface AudioOptions extends SpanOptions {
    /** Hz: 48000 where left out. */
    readonly sampleRate?: number;
    readonly tracks?: Tracks;
    /** What is switched off (graph ids): the piece's `off` cells where left out. */
    readonly muted?: ReadonlySet<string>;
}
export interface PieceAudio {
    readonly sampleRate: number;
    readonly span: Span;
    /** The mix: left and right. */
    readonly mix: readonly [Float32Array, Float32Array];
    /** A stem a voice heard, in the text's order (`tracks: 'voices'`); they sum to the mix. */
    readonly stems: readonly {
        readonly voice: string;
        readonly channels: readonly [Float32Array, Float32Array];
    }[];
    readonly diagnostics: readonly RenderDiagnostic[];
    /** The mix's loudness: RMS and peak in dB below full scale, and the samples that reached it. */
    readonly loudness: {
        readonly rms: number;
        readonly peak: number;
        readonly clipped: number;
    };
}
/** A compiled piece, rendered (see the module's comment). */
export declare function pieceAudio(result: CompileResult, shifts: Shifts, options?: AudioOptions): PieceAudio;
