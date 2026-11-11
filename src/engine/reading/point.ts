/**
 * A span of bars read as a point in style space (#541): `sync` and `bite` from onsets and lengths (`readStyle`), `harm`
 * from the chords read back (`readHarm`, each bar's change counted from the chord before it), `mood` from the mode the
 * notes fit (`readMood`, over the span's notes together), each with a confidence, 0 to 1, of how much the notes had to
 * say of it. An axis the notes can't speak to is left out, as decision 037's D6 asks of a first guess: a drum part has
 * no `harm` and no `mood`, a pad says little of where accents fall. Its density is the span's intensity (#571), not a
 * place.
 *
 * The confidences, each a bar's then their mean over the span (a bar that can't speak to the axis is a 0 in it):
 * - `sync`: the bar's onsets over its steps (`SYNC_FULL` an onset a step): a pad's chord or two a bar is under 0.2
 *   (an eighth), a groove's hats 1;
 * - `bite`: the notes of the bass and the lead over `BITE_FULL`;
 * - `harm`: the bar's halves with a chord read, over two;
 * - `mood`: `readMood`'s, over the span.
 *
 * Pure: it counts steps, lengths and pitch classes.
 */
import { readHarm, type ReadChord } from './chords';
import { readMood, type ReadMode } from './mood';
import { BAR_4_4, type Bar, lineShares, onsetsOf, readStyle, type Sounding } from './style';

/** The axes a reading places. */
export type ReadAxis = 'sync' | 'harm' | 'bite' | 'mood';

/** What a span of bars reads as. */
export interface PointReading {
  /** The axes the notes could speak to, each its mean over the bars that read it. */
  readonly point: Partial<Record<ReadAxis, number>>;
  /** How far to trust each axis of `point`, 0 to 1. */
  readonly confidence: Partial<Record<ReadAxis, number>>;
  /** Onsets per step, the span's mean: how hard it plays (#571), not a place. */
  readonly intensity: number;
  /** The mode and tonic `mood` was read from, where one was. */
  readonly mode?: { readonly mode: ReadMode; readonly tonic: number };
}

/** Onsets per step at which `sync` is fully heard: one each step. */
export const SYNC_FULL = 1;
/** Notes of the bass and the lead in a bar at which `bite` is fully heard. */
export const BITE_FULL = 4;

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** A span of bars, each its notes with steps from the bar's start, read as a point and how far to trust it. */
export function readPoint(bars: readonly (readonly Sounding[])[], bar: Bar = BAR_4_4): PointReading {
  const sync: number[] = [];
  const bite: number[] = [];
  const harm: number[] = [];
  const trust: Record<'sync' | 'bite' | 'harm', number[]> = { sync: [], bite: [], harm: [] };
  const densities: number[] = [];
  let previous: ReadChord | undefined;
  for (const notes of bars) {
    const read = readStyle(notes, bar);
    densities.push(read.density);
    if (read.sync !== undefined) sync.push(read.sync);
    if (read.bite !== undefined) bite.push(read.bite);
    trust.sync.push(Math.min(1, onsetsOf(notes).length / (SYNC_FULL * bar.steps)));
    trust.bite.push(Math.min(1, lineShares(notes, bar.steps).length / BITE_FULL));
    const h = readHarm(notes, previous, bar);
    trust.harm.push(h ? h.chords.length / 2 : 0);
    if (h) {
      harm.push(h.harm);
      previous = h.chords.at(-1);
    }
  }
  const mood = readMood(bars.flat());
  const axes = { sync, bite, harm } as const;
  const point: Partial<Record<ReadAxis, number>> = {};
  const confidence: Partial<Record<ReadAxis, number>> = {};
  for (const a of ['sync', 'harm', 'bite'] as const)
    if (axes[a].length) {
      point[a] = mean(axes[a]);
      confidence[a] = mean(trust[a]);
    }
  if (mood) {
    point.mood = mood.mood;
    confidence.mood = mood.confidence;
  }
  return { point, confidence, intensity: mean(densities), ...(mood ? { mode: { mode: mood.mode, tonic: mood.tonic } } : {}) };
}
