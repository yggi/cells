/**
 * A piece as audio (decision 062), the twin of `pieceMidi`: its notes as the renderer sounds them, over the span every
 * render takes (`span.ts`: a piece that ends whole, a loop one cycle, an hour at most, or what the caller gives), and
 * the tail after it. The piece is compiled by the caller: one rendered at another rate than its `Env`'s `SAMPLE_RATE`
 * is compiled at that rate, so a cell reading it (`loop=SAMPLE_RATE`) agrees with what it is rendered at.
 */
import { eventsBetween, plan } from './realize';
import { createRenderer, loudness, type RenderDiagnostic, type Tracks } from './render';
import { retime, windowAt } from './schedule';
import { spanOf, type Span, type SpanOptions } from './span';
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
  readonly stems: readonly { readonly voice: string; readonly channels: readonly [Float32Array, Float32Array] }[];
  readonly diagnostics: readonly RenderDiagnostic[];
  /** The mix's loudness: RMS and peak in dB below full scale, and the samples that reached it. */
  readonly loudness: { readonly rms: number; readonly peak: number; readonly clipped: number };
}

/** A compiled piece, rendered (see the module's comment). */
export function pieceAudio(result: CompileResult, shifts: Shifts, options: AudioOptions = {}): PieceAudio {
  const muted = options.muted ?? result.off;
  const p = plan(result, shifts, muted);
  const span = spanOf(result, p, options);
  const seconds = span.to - span.from;
  const r = createRenderer(result, shifts, { sampleRate: options.sampleRate, tracks: options.tracks, muted });
  // (a drone's note held to the span's end; begun later, the notes from then on, moved to the render's start)
  if (span.from > 0) r.add(retime(windowAt(p, span.from, seconds, { begins: span.from, until: span.to }), 0, 1).events);
  else r.add(eventsBetween(p, 0, seconds, true, { until: seconds }));
  const out = r.render(Math.round((seconds + span.tail) * r.sampleRate));
  return {
    sampleRate: r.sampleRate,
    span,
    mix: out.mix,
    stems: r.stems.map((voice) => ({ voice, channels: out.stems.get(voice)! })),
    diagnostics: r.diagnostics,
    loudness: loudness(out.mix),
  };
}
