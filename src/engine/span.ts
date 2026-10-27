/**
 * How much of a piece a render takes (#315, option A): one rule for every writer, so a MIDI file and an audio render of
 * one piece cover the same time. A piece that ends is taken whole; one that loops, one cycle, every layer back together
 * (`pieceTime`), if that is half an hour at most, else its longest layer; one that does neither, a minute. A caller may
 * give the seconds itself, and a start (`from`); every span is capped (`longest`, an hour by default), and says why it is
 * what it is. The tail is the time after the last note for what is still ringing: a sound render's, not a MIDI file's.
 */
import { pieceTime } from './duration';
import type { CompileResult } from './program';
import type { Plan } from './realize';

/** At most this long by default (s): a day's piece would be a very long file. */
export const LONGEST = 3600;
/** A piece that neither ends nor comes round is taken for this long (s). */
export const UNBOUNDED = 60;
/** What still rings after the span, by default (s): a release, a reverb's tail. */
export const TAIL = 2;

/** What a render may say about its span; each left out takes the rule's default. */
export interface SpanOptions {
  /** How long, from `from` (s): the rule's choice where left out. */
  readonly seconds?: number;
  /** Where it starts, in the piece's time (s): 0 by default. */
  readonly from?: number;
  /** The most it may be (s): `LONGEST` by default. */
  readonly longest?: number;
  /** What still rings after it (s): `TAIL` by default. */
  readonly tail?: number;
}

/** A render's span: from, to and the tail after it, in the piece's seconds, and why it is that long. */
export interface Span {
  readonly from: number;
  readonly to: number;
  readonly tail: number;
  /**
   * Why: `given` (the caller's seconds), `ends` (the whole piece), `cycle` (one time round, every layer back together),
   * `layer` (its longest layer: the cycle is longer than half an hour, or never comes), `unbounded` (it neither ends nor
   * repeats: `UNBOUNDED`).
   */
  readonly why: 'given' | 'ends' | 'cycle' | 'layer' | 'unbounded';
  /** It was cut to `longest`. */
  readonly capped: boolean;
}

/** The span a render of this plan takes (see the module's comment). */
export function spanOf(result: CompileResult, plan: Plan, options: SpanOptions = {}): Span {
  const from = Math.max(0, options.from ?? 0);
  const longest = options.longest ?? LONGEST;
  const tail = Math.max(0, options.tail ?? TAIL);
  const [length, why] = ((): [number, Span['why']] => {
    if (options.seconds !== undefined) return [Math.max(0, options.seconds), 'given'];
    if (Number.isFinite(plan.end)) return [Math.max(0, plan.end - from), 'ends'];
    const t = pieceTime(result);
    if (t.ends !== null) return [Math.max(0, t.ends - from), 'ends'];
    if (t.cycle !== null && Number.isFinite(t.cycle) && t.cycle <= 1800) return [t.cycle, 'cycle'];
    if (t.longest !== null) return [t.longest, 'layer'];
    return [UNBOUNDED, 'unbounded'];
  })();
  const capped = length > longest;
  return { from, to: from + (capped ? longest : length), tail, why, capped };
}
