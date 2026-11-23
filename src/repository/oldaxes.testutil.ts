/**
 * The style axes before decision 076 (`sync harm artic energy`), for the tests whose expected data was placed on them and
 * is read on the axes now (`sync harm bite mood`): `newPoint` is the conversion decision 076 and #572 made, frozen here so
 * those tests keep their numbers. Test data only, nothing a text or a host reads: Migrate's `axes` rule that wrote it
 * went with the forms retired before 1.0.0 (#643), and these tests' fixtures are the next to be rewritten on the new axes.
 */
import { moodOf } from '../engine/style';

/** The axes before decision 076, in their order. */
export const OLD_AXES = ['sync', 'harm', 'artic', 'energy'] as const;
type OldPoint = Readonly<Record<(typeof OLD_AXES)[number], number>>;

/** The seed library's mode fragments' association points on the old axes, as they were at v0.21.0, with their modes. */
export const OLD_MODES: readonly { readonly mode: string; readonly point: OldPoint }[] = [
  { mode: 'aeolian', point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
  { mode: 'aeolian', point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
  { mode: 'aeolian', point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
  { mode: 'dorian', point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
  { mode: 'dorian', point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
  { mode: 'ionian', point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
  { mode: 'ionian', point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
  { mode: 'ionian', point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
  { mode: 'ionian', point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
  { mode: 'mixolydian', point: { sync: 0.875, harm: 0.485, artic: 0.65, energy: 0.6 } },
  { mode: 'phrygian', point: { sync: 0.6, harm: 0.6, artic: 0.7, energy: 0.85 } },
  { mode: 'lydian', point: { sync: 0.15, harm: 0.6, artic: 0.15, energy: 0.3 } },
  { mode: 'locrian', point: { sync: 0.9, harm: 1, artic: 0.6, energy: 0.9 } },
  // (bell_and_scale plays ionian)
  { mode: 'ionian', point: { sync: 0.383, harm: 0.717, artic: 0.25, energy: 0.417 } },
  { mode: 'harmonic_minor', point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
  { mode: 'harmonic_minor', point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
];

/** The squared distance between two old points. */
const d2 = (p: OldPoint, q: OldPoint) => OLD_AXES.reduce((a, k) => a + (p[k] - q[k]) ** 2, 0);

/** The mode the library found nearest an old point (the first of a tie, as the repository's query takes it). */
export function oldMode(p: OldPoint): string {
  return OLD_MODES.reduce((best, m) => (d2(p, m.point) < d2(p, best.point) ? m : best)).mode;
}

/**
 * The library's styles as they were at v0.21.0, on the old axes, each with its mood placed by hand (#572): its mode's
 * brightness tempered by the tension heard in it (`moodOf`, `docs/notes/572-axes-atlas.md`), on a grid of twentieths.
 */
export const OLD_STYLES: readonly { readonly id: string; readonly mood: number; readonly point: OldPoint }[] = [
  { id: 'synthPop', mood: 0.5, point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
  { id: 'techno', mood: 0.4, point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
  { id: 'deepHouse', mood: 0.65, point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
  { id: 'ambient', mood: 0.9, point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
  { id: 'lofi', mood: 0.5, point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
  { id: 'funk', mood: 0.65, point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
  { id: 'bossaNova', mood: 0.9, point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
  { id: 'swingJazz', mood: 0.85, point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
  { id: 'electroSwing', mood: 0.5, point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
  { id: 'spooky', mood: 0.3, point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
  { id: 'kinderlied', mood: 0.95, point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
];

/** How near a style an old point is placed for it, and takes its mood: half the repository's miss distance (0.3). */
export const NEAR_STYLE = 0.15;

/** An old point's mood: the nearest style's, where one is within `NEAR_STYLE`; else its mode's (`moodOf`). */
export function oldMood(p: OldPoint): number {
  const near = OLD_STYLES.reduce((best, s) => (d2(p, s.point) < d2(p, best.point) ? s : best));
  return Math.sqrt(d2(p, near.point) / OLD_AXES.length) <= NEAR_STYLE + 1e-9 ? near.mood : moodOf(oldMode(p));
}

/** An old point on the new axes: `bite` its articulation, and `mood` (`oldMood`), unless a point speaks to no mood. */
export function newPoint(p: OldPoint, mood = true): { sync: number; harm: number; bite: number; mood?: number } {
  return { sync: p.sync, harm: p.harm, bite: p.artic, ...(mood ? { mood: oldMood(p) } : {}) };
}
