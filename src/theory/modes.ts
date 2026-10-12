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

/**
 * The scales `scale(name, tonic)` knows, by name: each its steps up the 12 (a scan), and the name it is shown by. The
 * seven modes by their own names, the two everyone knows by theirs, and a few beyond the diatonic.
 */
export const SCALES: Readonly<Record<string, { readonly steps: readonly number[]; readonly name: string }>> = {
  major: { steps: [2, 2, 1, 2, 2, 2, 1], name: 'Ionian' },
  minor: { steps: [2, 1, 2, 2, 1, 2, 2], name: 'Aeolian' },
  ionian: { steps: [2, 2, 1, 2, 2, 2, 1], name: 'Ionian' },
  dorian: { steps: [2, 1, 2, 2, 2, 1, 2], name: 'Dorian' },
  phrygian: { steps: [1, 2, 2, 2, 1, 2, 2], name: 'Phrygian' },
  lydian: { steps: [2, 2, 2, 1, 2, 2, 1], name: 'Lydian' },
  mixolydian: { steps: [2, 2, 1, 2, 2, 1, 2], name: 'Mixolydian' },
  aeolian: { steps: [2, 1, 2, 2, 1, 2, 2], name: 'Aeolian' },
  locrian: { steps: [1, 2, 2, 1, 2, 2, 2], name: 'Locrian' },
  harmonic: { steps: [2, 1, 2, 2, 1, 3, 1], name: 'Harmonic minor' },
  melodic: { steps: [2, 1, 2, 2, 2, 2, 1], name: 'Melodic minor' },
  pentatonic: { steps: [2, 2, 3, 2, 3], name: 'Pentatonic' },
  minorpentatonic: { steps: [3, 2, 2, 3, 2], name: 'Minor pentatonic' },
  blues: { steps: [3, 2, 1, 1, 3, 2], name: 'Blues' },
  wholetone: { steps: [2, 2, 2, 2, 2, 2], name: 'Whole tone' },
};

/** A scale's name for a phase of the seven modes (0 the darkest): what `scale(tonic, phase)` is now written as. */
export function scaleOfPhase(phase: number): string {
  const mode = MODES[phase]?.name.toLowerCase() ?? 'major';
  return mode === 'ionian' ? 'major' : mode === 'aeolian' ? 'minor' : mode;
}

/** Name a set by its shape above its first note: a diatonic mode, or one of the scales beyond it (Blues …). */
export function modeName(values: readonly number[]): string | null {
  const shape = values.map((v) => v - values[0]!).join();
  if (values.length === 7) {
    const m = MODES.find((x) => x.intervals.join() === shape);
    if (m) return m.name;
  }
  return Object.values(SCALES).find((x) => scan(x.steps).positions.join() === shape)?.name ?? null;
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
const AGOGIC: Readonly<Record<string, readonly number[]>> = {
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
  return positions.map((p, i) => +((i + 1 < positions.length ? positions[i + 1]! : positions[0]! + lap) - p).toFixed(6));
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

/**
 * A note by name, as semitones from C4: `C` (octave 4 when left out), `F#`, `Bb3`, `C5`. Null if it isn't one. In a
 * braid a name is a pitch (where a number is an index into the cell's table); as a tonic, a pitch class.
 */
export function pitchOfName(name: string): number | null {
  const m = /^([A-G])(#|b)?(-?[0-9]+)?$/.exec(name);
  if (!m) return null;
  const letter = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]!]!;
  return letter + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * ((m[3] === undefined ? 4 : parseInt(m[3], 10)) - 4);
}
