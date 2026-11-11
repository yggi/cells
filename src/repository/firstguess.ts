/**
 * A fragment's first guess at its place, from its notes (#681, decision 043 point 2, decision 037's D6): read what it
 * plays (`readPoint`), then take the places the library gave the fragments of its facet whose readings are nearest.
 *
 * A reading and a placed point are on two scales: a style's axes are placed by hand (Funk's `sync` 1 is "the most
 * syncopated style", not "every onset syncopated"), and a statistic of onsets lands where the notes put it, compressed
 * or shifted (#681: Jambot's presets read their sync between 0.08 and 0.34). So a reading is compared with readings, not
 * with points: the fragments of a facet are read as the new one is, and the guess is the mean of the placed points of
 * the `GUESS_K` nearest in reading space. Scale stops mattering, and the hand placements stay the measure.
 *
 * A fragment is read through its audition (`audition.ts`: the host gives each hole a stand-in and plays its heads), as
 * the part its facet names (`PART_OF`), over `READ_BARS` bars. Pure.
 */
import { gmDrumNote } from '../engine/midi';
import { planOf } from '../engine/host';
import type { Resolve } from '../engine/program';
import { readPoint, type PointReading } from '../engine/reading/point';
import type { Part, Sounding } from '../engine/reading/style';
import { windowAt } from '../engine/schedule';
import { midiOf } from '../theory/modes';
import { audition } from './audition';
import { fitsAs } from './fit';
import type { Fragment, StylePoint } from './fragments';

/** The part a facet's fragment plays as, where it plays notes a reading can read. */
export const PART_OF: Readonly<Record<string, Part>> = { rhythm: 'drums', bass: 'bass', harmony: 'pad', stab: 'stab', motif: 'lead' };

/** Bars a fragment is read over: sixteen, longer than the library's longest lap (`twelve_bar`'s twelve). */
export const READ_BARS = 16;

/**
 * The fragments a guess is taken from: the two whose readings are nearest. Over the library, leaving each fragment out,
 * a beat's `sync` is guessed best from the nearest one or two (k 1 to 5: 0.74, 0.77, 0.80, 0.87, 0.92 of the others'
 * mean's error) and a harmony's `harm` from three to five (0.58, 0.47, 0.41, 0.38, 0.41): two serves both.
 */
export const GUESS_K = 2;

/**
 * The axes a facet's notes carry, so a guess places them: a beat's `sync`, a harmony's `harm` (#681). Over the library,
 * each fragment guessed from the others (`firstguess.test.ts`), these are where the guess comes nearest its placement:
 * beats' `sync` 0.23 off, against 0.30 for the others' mean and 0.34 for the reading itself (30 beats in
 * 4/4); harmonies' `harm` 0.15, against 0.32 and 0.25 (17 harmonies). A bass line's and a motif's notes guess no axis better than the others' mean, since a part is
 * placed at its style's point and its notes say little of that style's other parts; so they guess none, and an axis
 * not guessed is left out (decision 037's D6).
 */
export const GUESSED: Readonly<Record<string, readonly string[]>> = { rhythm: ['sync'], harmony: ['harm'] };

/** The host's bar, in seconds (`audition`'s meter: 4/4 at a bar of 2 s), and a step's, a sixteenth. */
const BAR_SECONDS = 2;
const STEP = BAR_SECONDS / 16;

/** The meter a fragment is read in: the host's 4/4. */
const FOUR_FOUR = '&bar meter("4/4") step=120bpm';

/**
 * What a fragment of a facet plays, read as its part: its reading, or null where it plays nothing a reading can read.
 * A fragment whose clock 4/4 doesn't meet (`fitsAs`'s `unmet`: a waltz's beat, an aksak's, a motif in 6/8) is not read:
 * the host plays it in 4/4, where its syncopation, which lies in its meter's uneven beats, reads as none.
 */
export function readFragment(text: string, facet: string, resolve: Resolve): PointReading | null {
  const part = PART_OF[facet];
  if (!part) return null;
  const self = '_read';
  if (fitsAs(self, FOUR_FOUR, { resolve: (id) => (id === self ? text : resolve(id)) }).unmet.length) return null;
  const a = audition(text, { resolve });
  if (a.why) return null;
  const plan = planOf(a.text, undefined, { resolve });
  const bars: Sounding[][] = Array.from({ length: READ_BARS }, () => []);
  for (const e of windowAt(plan, 0, READ_BARS * BAR_SECONDS - 1e-9).events) {
    if (e.unheard) continue;
    const at = Math.round(e.at / STEP);
    const bar = Math.floor(at / 16);
    if (bar >= READ_BARS) continue;
    const note = part === 'drums' ? (gmDrumNote(e.voice) ?? Math.round(midiOf(e.freq))) : Math.round(midiOf(e.freq));
    bars[bar]!.push({ part, step: at % 16, length: Math.max(e.dur / STEP, 1e-9), note });
  }
  return bars.some((b) => b.length) ? readPoint(bars) : null;
}

/** The features a reading is compared on: its axes and its intensity. */
const featuresOf = (r: PointReading): Record<string, number> => ({ ...r.point, intensity: r.intensity });

/** The root mean square of the differences over the features two readings both have; Infinity over none. */
export function readingDistance(a: PointReading, b: PointReading): number {
  const fa = featuresOf(a);
  const fb = featuresOf(b);
  const shared = Object.keys(fa).filter((k) => fb[k] !== undefined);
  return shared.length ? Math.sqrt(shared.reduce((s, k) => s + (fa[k]! - fb[k]!) ** 2, 0) / shared.length) : Infinity;
}

/** A fragment's placed points as the facet: the points it is associated at as that facet (or as every facet). */
export const placedAs = (f: Fragment, facet: string): StylePoint[] => f.association.filter((w) => w.facet === undefined || w.facet === facet).map((w) => w.point);

/** A read fragment of the library: its id, its reading and its placed points. */
export interface Read {
  readonly id: string;
  readonly reading: PointReading;
  readonly placed: readonly StylePoint[];
}

/** The fragments of a facet the library holds, each read (those that play nothing a reading can read left out). */
export function readFacet(library: readonly Fragment[], facet: string, resolve: Resolve): Read[] {
  return library.flatMap((f) => {
    const placed = placedAs(f, facet);
    if (!placed.length) return [];
    const reading = readFragment(f.text, facet, resolve);
    return reading ? [{ id: f.id, reading, placed }] : [];
  });
}

/** A guess: the point, and the fragments it was taken from, nearest first, each its reading's distance. */
export interface Guess {
  readonly point: StylePoint;
  readonly from: readonly { readonly id: string; readonly distance: number }[];
}

/** The mean of some points, axis by axis, over the points that have each axis. */
function meanPoint(points: readonly StylePoint[]): StylePoint {
  const axes = [...new Set(points.flatMap((p) => Object.keys(p)))];
  return Object.fromEntries(
    axes.map((a) => {
      const vs = points.flatMap((p) => (p[a] === undefined ? [] : [p[a]]));
      return [a, vs.reduce((s, v) => s + v, 0) / vs.length];
    }),
  );
}

/**
 * The first guess at a reading's place among read fragments: the mean of the placed points (each fragment's own mean,
 * where it is placed at several) of the `k` whose readings are nearest. Null where none can be compared.
 */
export function firstGuess(reading: PointReading, among: readonly Read[], k = GUESS_K): Guess | null {
  const near = among
    .map((r) => ({ r, distance: readingDistance(reading, r.reading) }))
    .filter((x) => Number.isFinite(x.distance))
    .sort((a, b) => a.distance - b.distance || (a.r.id < b.r.id ? -1 : 1))
    .slice(0, k);
  if (!near.length) return null;
  return { point: meanPoint(near.map((x) => meanPoint(x.r.placed))), from: near.map((x) => ({ id: x.r.id, distance: x.distance })) };
}

/** A fragment's first guess at its place as a facet: the axes its notes carry (`GUESSED`), from the library's fragments of that facet. Null where it guesses none. */
export function guessPlace(text: string, facet: string, library: readonly Fragment[], resolve: Resolve): Guess | null {
  const axes = GUESSED[facet];
  if (!axes) return null;
  const reading = readFragment(text, facet, resolve);
  if (!reading) return null;
  const g = firstGuess(reading, readFacet(library, facet, resolve));
  if (!g) return null;
  const point = Object.fromEntries(axes.flatMap((a) => (g.point[a] === undefined ? [] : [[a, g.point[a]]])));
  return Object.keys(point).length ? { point, from: g.from } : null;
}
