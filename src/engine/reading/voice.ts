/**
 * Reading one voice of the band alone (#541): a bar's reading (`readStyle`) hides which part says what, so a voice is
 * read on its own, the pad and the stab together as the comp since they play one harmony: `drums`, `bass`, `comp`,
 * `lead`. A voice's reading has the axes the voice can say: its density (its share of the bar's steps, 0 to 1), its
 * `sync`, the `bite` of the bass and the lead, and the `harm` of the comp. A part then has a distance of its own from a
 * landmark where that voice reads at a style, since each voice reads short of the axes as the whole bar does.
 *
 * Pure: it counts steps and pitch classes and knows no clock, file or key.
 *
 * Lifted from yggi/jambot packages/engine/src/part-reading.ts @ a34d13c6: `artic` is `bite` (decision 076).
 */
import { readHarm } from './chords';
import { BAR_4_4, type Bar, type Part, readStyle, type Sounding } from './style';

export const VOICES = ['drums', 'bass', 'comp', 'lead'] as const;
export type Voice = (typeof VOICES)[number];

/** The voice a part belongs to: the pad and the stab are the comp. */
export const voiceOf = (part: Part): Voice => (part === 'pad' || part === 'stab' ? 'comp' : part);

/** What one voice's notes say, on the axes it can say. */
export interface VoiceReading {
  /** Its share of the bar's steps with an onset, 0 to 1. */
  readonly density: number;
  readonly sync?: number;
  /** The bass's and the lead's. */
  readonly bite?: number;
  /** The comp's. */
  readonly harm?: number;
}

/** A voice's notes alone, out of a bar's notes (the comp reads with its bass, for the chord's root). */
export function readVoice(voice: Voice, notes: readonly Sounding[], bar: Bar = BAR_4_4): VoiceReading {
  const own = notes.filter((n) => voiceOf(n.part) === voice);
  const { density, sync, bite } = readStyle(own, bar);
  const harm =
    voice === 'comp'
      ? readHarm(
          notes.filter((n) => voiceOf(n.part) === 'comp' || n.part === 'bass'),
          undefined,
          bar,
        )?.harm
      : undefined;
  return {
    density,
    ...(sync === undefined ? {} : { sync }),
    ...(bite === undefined || (voice !== 'bass' && voice !== 'lead') ? {} : { bite }),
    ...(harm === undefined ? {} : { harm }),
  };
}

/** Where a voice reads at a style: the axes of a reading, each a number. */
export type VoiceLandmark = Readonly<Record<'density', number>> & Partial<Record<'sync' | 'bite' | 'harm', number>>;

const VOICE_AXES = ['density', 'sync', 'bite', 'harm'] as const;

/** The root mean square of the differences over the axes the reading and the landmark both have; 0 over none. */
export function partDistance(read: VoiceReading, landmark: VoiceLandmark): number {
  const shared = VOICE_AXES.filter((a) => read[a] !== undefined && landmark[a] !== undefined);
  return shared.length ? Math.sqrt(shared.reduce((sum, a) => sum + (read[a]! - landmark[a]!) ** 2, 0) / shared.length) : 0;
}
