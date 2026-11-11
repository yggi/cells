/**
 * Reading a style from notes (#541, decision 043 point 2): the axes a bar's sounding notes say, one at a time, by rule.
 * Nothing here is learned, so it is the baseline and the oracle of whatever reads after it. It is the reader the
 * repository's first guess at a fragment's place, a corpus's styles (#542) and a frontend's style of an open piece
 * share, beside the form it reads.
 *
 * It reads a bar's notes as they sound: their steps, and their lengths as played (the gate, where the bite lives; a
 * written length fills its gap and says none of it). Swing is the meter's, not the style's (#360), so nothing here reads
 * it. A reading is raw, not fitted: `sync` and `bite` lie in 0 to 1 as their axes do, and `density` is onsets per step,
 * which is intensity (#571), not a place. An axis with nothing to read in the bar is absent, not zero.
 *
 * Pure: it counts steps and knows no file, key or clock; `readTiming` is given the clock.
 *
 * Lifted from yggi/jambot packages/engine/src/style-reading.ts @ a34d13c6: `artic` is `bite` (decision 076), and a bar
 * is cells' (`Bar`, `barOf`), a meter's sixteenths and its pulses, where Jambot's was its own meter's.
 */
import { beatCount, type Meter } from '../meter';

/** The band's parts, as its performers are named (`fragments/performers/`): what a note was played by. */
export type Part = 'drums' | 'bass' | 'pad' | 'stab' | 'lead';

/** What a reading needs of a note: its part, the step it starts on in its bar, and how many steps it sounds. */
export interface Sounding {
  readonly part: Part;
  readonly step: number;
  readonly length: number;
  /** Its MIDI note, where a reading needs a pitch (the chords, the mood). */
  readonly note?: number;
}

/** A bar as a reading counts it: its steps (sixteenths) and the steps its pulses start on. */
export interface Bar {
  readonly steps: number;
  readonly pulses: readonly number[];
}

/** Steps to an eighth: a step is a sixteenth. */
export const STEPS_PER_EIGHTH = 2;

/** 4/4's bar: sixteen steps, a pulse on each quarter. A reading's bar where none is given. */
export const BAR_4_4: Bar = { steps: 16, pulses: [0, 4, 8, 12] };

/**
 * A meter's bar in sixteenths: its pulses, each a `unit` long (a quarter in 4/4, an eighth in 7/8), and its beats'
 * starts as the pulses (7/8's 3 2 2 starts on steps 0, 6 and 10). A meter a reading can't lay on sixteenths (a scan's
 * uneven steps, a unit finer than a sixteenth) has no bar: null.
 */
export function barOf(meter: Meter): Bar | null {
  const perPulse = 16 / meter.unit;
  if (meter.written !== 'meter' || !Number.isInteger(perPulse) || perPulse < 1) return null;
  const beats = meter.beats.length ? meter.beats : Array.from({ length: beatCount(meter) }, () => 1);
  const pulses: number[] = [];
  let at = 0;
  for (const b of beats) {
    pulses.push(at * perPulse);
    at += b;
  }
  return { steps: meter.pulses * perPulse, pulses };
}

/** The parts whose length says how a line is played; the others are hits and voicings. */
const LINES: readonly Part[] = ['bass', 'lead'];

/** What one bar's notes say of its style, axis by axis. */
export interface StyleReading {
  /** Onsets per step of the bar; a chord struck at one step is one onset. Intensity (#571), not an axis. */
  readonly density: number;
  /** The share of onsets off the pulses and off the eighths: 0 on the grid's strong places, 1 all between. */
  readonly sync?: number;
  /** Paddy (0) to stabby (1): one less the median share of its gap a note of the bass or lead sounds. */
  readonly bite?: number;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** The share of its gap to the next onset (or the bar's end) that each note of one line sounds. */
export function soundingShares(line: readonly Sounding[], steps: number): number[] {
  const starts = [...new Set(line.map((n) => n.step))].sort((a, b) => a - b);
  return starts.map((step, i) => {
    const gap = (starts[i + 1] ?? steps) - step;
    const length = Math.max(...line.filter((n) => n.step === step).map((n) => n.length));
    return Math.min(length, gap) / gap;
  });
}

/** The onsets of a bar: one per part and step, so a chord's notes are one and the same step of two parts two. */
export const onsetsOf = (notes: readonly Sounding[]): number[] => [...new Set(notes.map((n) => `${n.part}:${n.step}`))].map((id) => Number(id.split(':')[1]));

/** The notes of the bass and the lead, each line's shares of its gaps. */
export const lineShares = (notes: readonly Sounding[], steps: number): number[] =>
  LINES.flatMap((part) =>
    soundingShares(
      notes.filter((n) => n.part === part),
      steps,
    ),
  );

/** The style a bar's sounding notes read as, on the axes that can be read from onsets and lengths alone. */
export function readStyle(notes: readonly Sounding[], bar: Bar = BAR_4_4): StyleReading {
  const onsets = onsetsOf(notes);
  const shares = lineShares(notes, bar.steps);
  return {
    density: onsets.length / bar.steps,
    ...(onsets.length ? { sync: onsets.filter((step) => !bar.pulses.includes(step) && step % STEPS_PER_EIGHTH !== 0).length / onsets.length } : {}),
    ...(shares.length ? { bite: 1 - median(shares) } : {}),
  };
}

/** What a reading needs of a laid step: how long it lasts on the clock, in seconds. */
export interface Laid {
  readonly length: number;
}

/** The timing a bar's steps read as: the tempo. */
export interface TimingReading {
  /** Beats (quarters) per minute, from how long the steps last. */
  readonly bpm?: number;
}

/**
 * The tempo of a bar from the clock: 60 over the mean length of a quarter, four steps. Swing does not enter it: it moves
 * notes inside a beat and leaves the beat whole, and it is the meter's (#360).
 */
export function readTiming(laid: readonly Laid[]): TimingReading {
  return laid.length ? { bpm: 15 / (laid.reduce((sum, s) => sum + s.length, 0) / laid.length) } : {};
}
