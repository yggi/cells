/**
 * Reading `mood` from notes (#541): the mode the pitched notes fit, and its mood at the default tension (`moodOf`,
 * decision 076 §2). The mode is the scale, of the eight `BRIGHTNESS` knows, that covers the most of the notes' weight
 * (each pitch class weighed by how long it sounds); of the scales that cover as much, the one whose tonic weighs most,
 * the bass's weight counted twice since the bass states the tonic; then the order of `MODES` (the plain major and
 * minor first). Relative modes hold the same notes, so the tonic is what tells C ionian from A aeolian.
 *
 * Tension is not read: dissonance, menace and unrest are heard in the harmony and the sound, and a rule for them is
 * open (decision 076's "its tension heard"). So a reading's mood is its mode's, which a style placed by hand may move.
 *
 * Its confidence is the share of the weight its scale covers, times the pitch classes heard over the scale's seven: a
 * triad fits many modes, a whole scale one or two. A bar of one chord says little of its mode; read a span of bars, by
 * `readMood` over all their notes, for a mood worth weighing.
 *
 * Pure: it counts pitch classes and lengths and knows no clock, file or key.
 */
import { SCALES } from '../../theory/modes';
import { moodOf } from '../style';
import type { Sounding } from './style';

/** The modes a mood is read from, in the order a tie is broken: the plain major and minor first. */
export const MODES = ['ionian', 'aeolian', 'dorian', 'mixolydian', 'harmonic_minor', 'lydian', 'phrygian', 'locrian'] as const;
export type ReadMode = (typeof MODES)[number];

/** Each mode's pitch classes above its tonic, from its steps (`SCALES`; harmonic minor is its `harmonic`). */
const tonesOf = (mode: ReadMode): ReadonlySet<number> =>
  new Set(SCALES[mode === 'harmonic_minor' ? 'harmonic' : mode]!.steps.slice(0, -1).reduce<number[]>((at, s) => [...at, at.at(-1)! + s], [0]));
const TONES = new Map(MODES.map((m) => [m, tonesOf(m)]));

/** What `readMood` found: the mood, the mode and tonic it is read from, and how far to trust it (0 to 1). */
export interface MoodReading {
  readonly mood: number;
  readonly mode: ReadMode;
  /** The tonic's pitch class, 0 C to 11 B. */
  readonly tonic: number;
  readonly confidence: number;
}

const pc = (note: number) => ((note % 12) + 12) % 12;

/** The mood the pitched notes read as (but the drums'), absent where none is pitched or none sounds. */
export function readMood(notes: readonly Sounding[]): MoodReading | undefined {
  const weight = Array<number>(12).fill(0);
  const bass = Array<number>(12).fill(0);
  for (const n of notes) {
    if (n.note === undefined || n.part === 'drums' || n.length <= 0) continue;
    weight[pc(n.note)]! += n.length;
    if (n.part === 'bass') bass[pc(n.note)]! += n.length;
  }
  const total = weight.reduce((a, b) => a + b, 0);
  if (total === 0) return undefined;
  const heard = weight.filter((w) => w > 0).length;
  let best: { mode: ReadMode; tonic: number; covered: number; tonicWeight: number } | null = null;
  for (const mode of MODES)
    for (let tonic = 0; tonic < 12; tonic++) {
      const covered = weight.reduce((sum, w, p) => sum + (TONES.get(mode)!.has(pc(p - tonic)) ? w : 0), 0);
      const tonicWeight = weight[tonic]! + 2 * bass[tonic]!;
      // (a tie in both is kept: the earlier mode, the lower tonic)
      if (!best || covered > best.covered + 1e-9 || (Math.abs(covered - best.covered) <= 1e-9 && tonicWeight > best.tonicWeight + 1e-9))
        best = { mode, tonic, covered, tonicWeight };
    }
  const { mode, tonic, covered } = best!;
  return { mood: moodOf(mode), mode, tonic, confidence: (covered / total) * Math.min(1, heard / 7) };
}
