/** Small music-theory helpers. Nothing here is special-cased in the language; it's used for naming and colour. */

/** Floor-mod that is always non-negative. */
export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

export interface Mode {
  readonly name: string;
  readonly intervals: readonly number[];
}

/** The diatonic modes, darkest to brightest — the order even(7,12) walks as its phase rises. */
export const MODES: readonly Mode[] = [
  { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { name: 'Aeolian', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { name: 'Ionian', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
];

/** Name a 7-note set by its shape above its first note, if it's a diatonic mode. */
export function modeName(values: readonly number[]): string | null {
  if (values.length !== 7) return null;
  const shape = values.map((v) => v - values[0]).join();
  return MODES.find((m) => m.intervals.join() === shape)?.name ?? null;
}

/**
 * Maximally even placement of k onsets in n slots (Bresenham), with phase p:
 *   position(i) = floor((i·n + p) / k)
 * Raising p by 1 moves exactly one onset one slot later, so for (7, 12) it
 * walks the modes darkest → brightest; p = k lifts the whole set one slot.
 */
export function even(k: number, n: number, phase = 0, i?: number): number[] {
  const at = (j: number) => Math.floor((j * n + phase) / k);
  return i === undefined ? Array.from({ length: k }, (_, j) => at(j)) : [at(i)];
}

/**
 * Agogic beat placements: n beats in one bar, as positions on a 12-slot
 * bar (fractional), i.e. where each beat really falls. Known profiles bend
 * straight time; anything else is straight.
 */
export const AGOGIC: Readonly<Record<string, readonly number[]>> = {
  // * . + .  — beats 2 and 4 lean late (given as 0 27 50 76 % of the bar)
  '4/4': [0, 3.24, 6, 9.12],
  // Viennese waltz: beat 2 anticipated — short first beat, long second
  // (≈ 28 : 37 : 35 of the bar, i.e. beats at 0 28 65 %)
  '3/4': [0, 3.36, 7.8],
};

export function agogic(n: number, d: number): number[] {
  return [...(AGOGIC[`${n}/${d}`] ?? Array.from({ length: n }, (_, i) => (i * 12) / n))];
}

/**
 * Hue for a pitch, ordered around the circle of fifths so that
 * closely related pitches get neighbouring colours.
 */
export function pitchHue(semitones: number): number {
  // a rainbow per octave: C red, D yellow, E green, G light blue, A blue …
  return mod(Math.round(semitones), 12) * 30;
}

/** Scientific pitch name of a frequency, A4 = 440 Hz: 261.63 → C4, 65.41 → C2. Sharps as ♯. */
export function noteName(freq: number): string {
  if (!(freq > 0)) return '';
  const m = Math.round(69 + 12 * Math.log2(freq / 440));
  return `${NOTE_NAMES[mod(m, 12)]}${Math.floor(m / 12) - 1}`;
}

/**
 * The intervals between successive entries of a set of positions on a lap,
 * the last one closing the lap: [0 2 4 5 7 9 11] on 12 → 2 2 1 2 2 2 1. The
 * inverse of a scan.
 */
export function intervals(positions: readonly number[], lap: number): number[] {
  return positions.map((p, i) => +(((i + 1 < positions.length ? positions[i + 1] : positions[0] + lap) - p).toFixed(6)));
}

/** A scan: running totals from 0 (the positions), and their sum (the lap). */
export function scan(steps: readonly number[]): { positions: number[]; lap: number } {
  const positions: number[] = [];
  let at = 0;
  for (const s of steps) {
    positions.push(+at.toFixed(6));
    at += s;
  }
  return { positions, lap: +at.toFixed(6) };
}
