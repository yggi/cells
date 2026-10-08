/**
 * The "5 to 12" cycle: a day of music, anchored to the clock at 11:55.
 *
 * The day: 12 blocks of 2 hours, one mode each — down from Ionian to Locrian (the nadir), up again
 * from Phrygian to Lydian (the earned zenith). A block: 12 keys of 10 minutes — descending, by fifths
 * (C G D … F); ascending, by fourths (C F B♭ … G: a new dawn, strange but full of hope). A key: 840
 * steps at 84 a minute — 70 bars of 12/8.
 *
 * A key's law: use all 7, 2 times, full circle, in 5 different ways.
 *  - 7: every bar sounds all 7 degrees of the mode, once each — nothing outside it.
 *  - the bell: a bar's 7 onsets sit where its mode's notes sit in the 12 (the 12/8 bell is the
 *    diatonic scale as rhythm).
 *  - 5 ways: five dimensions — melody (a degree), rhythm (the bell), harmony (1 … 7 voices in thirds),
 *    dynamics (ppp … fff), space (7 places) — each reading the key's row at its own offset
 *    (counterpoint). Phrase k (7 bars) foregrounds dimension k with its operation: translation,
 *    rotation, inversion, retrograde, multiplication (the Apple: ×5 mod 7 — it never leaves the mode).
 *  - full circle: in a phrase, each bar starts the row on the next degree.
 *  - 2 times: bars 36 … 70 are bars 35 … 1, in retrograde-inversion.
 *
 * Everything is a function of the step of the day: nothing to play through, any moment computed.
 */

const STEPS_PER_MINUTE = 84;
export const BAR = 12;
const BARS_PER_KEY = 70;
export const KEY = BAR * BARS_PER_KEY; // 840
export const BLOCK = KEY * 12; // 10 080
export const DAY = BLOCK * 12; // 120 960 — 24 hours at 84 a minute
export const SECONDS_PER_STEP = 60 / STEPS_PER_MINUTE;
/** When the law's day begins: 11:55, in seconds of the day (its first block, the false zenith, starts here). */
export const START = 11 * 3600 + 55 * 60;

/** The modes, as rotations of the major scale's steps: 0 Ionian … 6 Locrian. */
export const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const STEPS = [2, 2, 1, 2, 2, 2, 1];
/** The day's modes, block by block (from 11:55). */
export const DAY_MODES = [0, 4, 1, 5, 2, 6, 2, 5, 1, 4, 0, 3];
export const BLOCK_NAMES = [
  'the false zenith',
  'the first shadow',
  'twilight',
  'evening',
  'late night',
  'the nadir',
  'the spark',
  'deep morning',
  'dawn',
  'morning',
  'mid-morning',
  'the earned zenith',
];

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** How bright each mode is: Lydian 1 … Locrian 0, by mode index (Ionian … Locrian). */
const MODE_BRIGHTNESS = [5, 3, 1, 6, 4, 2, 0].map((b) => b / 6);

/**
 * The law's day as plain data, for a view of it (a plugin's `view.law`): when each block and key begins, in seconds
 * of the day from `start`; each block's mode and brightness; each key's tonic (0 = C), block by block.
 */
export function dayLaw() {
  return {
    start: START,
    blockSeconds: BLOCK * SECONDS_PER_STEP,
    keySeconds: KEY * SECONDS_PER_STEP,
    modeNames: [...MODE_NAMES],
    blockNames: [...BLOCK_NAMES],
    blocks: DAY_MODES.map((mode) => ({ mode, brightness: MODE_BRIGHTNESS[mode] })),
    tonics: DAY_MODES.map((_, block) => Array.from({ length: 12 }, (__, key) => tonicOf(block, key))),
  };
}

/** A mode's degrees as semitones above its tonic (parallel: on the same tonic). */
export function modeSemis(mode: number): number[] {
  const s = [0];
  for (let i = 0; i < 6; i++) s.push(s[i] + STEPS[(i + mode) % 7]);
  return s;
}

/** Where a step of the day is: block, key in the block, bar in the key, step in the bar. */
export function place(step: number) {
  const d = mod(Math.floor(step), DAY);
  const block = Math.floor(d / BLOCK);
  const key = Math.floor((d % BLOCK) / KEY);
  const bar = Math.floor((d % KEY) / BAR);
  return { block, key, bar, inBar: d % BAR, mode: DAY_MODES[block], tonic: tonicOf(block, key) };
}

/** A key's tonic (0 = C): the descent moves by fifths, the ascent by fourths — every block from C. */
export function tonicOf(block: number, key: number): number {
  return mod((block < 6 ? 7 : 5) * key, 12);
}

/** The row of a key: the 7 degrees in fifths order, turned by its place in the block, moved by its mode. */
export function rowOf(block: number, key: number): number[] {
  const base = [0, 4, 1, 5, 2, 6, 3];
  const mode = DAY_MODES[block];
  return base.map((_, i) => mod(base[(i + key) % 7] + mode, 7));
}

/** One onset of a bar: where (step in the bar), how long, which degree, and its other dimensions. */
export interface Onset {
  readonly at: number;
  readonly dur: number;
  readonly degree: number;
  /** Voices sounding, stacked in thirds above the degree (1 … 7). */
  readonly density: number;
  /** 0 ppp … 6 fff. */
  readonly dynamic: number;
  /** 0 hard left … 6 hard right. */
  readonly space: number;
}

/** The bell of a mode: its 7 onsets in the 12 — where its notes sit. */
function bellOf(mode: number): number[] {
  return modeSemis(mode);
}

/** A bar of the first half, by the law (bar 0 … 34 of a key). */
function stated(row: number[], mode: number, bar: number): Onset[] {
  const phrase = Math.floor(bar / 7);
  const r = bar % 7;
  // full circle: the row starts on the next degree each bar
  const R = row.map((_, i) => row[(i + r) % 7]);
  let bell = bellOf(mode);
  // rhythm, rotated (phrase 1): the bell starting from its r-th stroke
  if (phrase === 1) bell = bell.map((_, j) => mod(bell[(j + r) % 7] - bell[r], 12)).sort((a, b) => a - b);
  const onsets: Onset[] = [];
  for (let j = 0; j < 7; j++) {
    let degree = R[j];
    let density = R[(j + 2) % 7] + 1;
    let dynamic = R[(j + 4) % 7];
    let space = R[(j + 6) % 7];
    if (phrase === 0) degree = mod(degree + r + 1, 7); // melody, translated
    if (phrase === 2) density = 8 - density; // harmony, inverted
    if (phrase === 3) dynamic = R[(6 - j + 4) % 7]; // dynamics, retrograde
    if (phrase === 4) space = mod(space * 5, 7); // space, multiplied: the Apple
    const at = bell[j];
    const next = j < 6 ? bell[j + 1] : BAR;
    onsets.push({ at, dur: next - at, degree, density, dynamic, space });
  }
  return onsets;
}

/** A bar of a key (0 … 69): the first half as stated; the second, the first's retrograde-inversion. */
export function barOf(block: number, key: number, bar: number): Onset[] {
  const row = rowOf(block, key);
  const mode = DAY_MODES[block];
  if (bar < 35) return stated(row, mode, bar);
  // the mirror: bar 69 − b's onsets, backwards in time, its degrees inverted about the tonic
  const src = stated(row, mode, 69 - bar);
  return src.map((o) => ({ ...o, at: BAR - (o.at + o.dur), degree: mod(-o.degree, 7) })).sort((a, b) => a.at - b.at);
}

/** A note to sound: its step of the day, length in steps, semitones above C4, level, pan (−1 … 1). */
export interface LawNote {
  readonly step: number;
  readonly dur: number;
  readonly semis: number;
  readonly level: number;
  readonly pan: number;
}

/** Every note starting in steps [from, to) of the day (whole bars' onsets, stacks included). */
export function notesBetween(from: number, to: number): LawNote[] {
  const out: LawNote[] = [];
  const firstBar = Math.floor(from / BAR);
  for (let b = firstBar; b * BAR < to; b++) {
    const s0 = b * BAR;
    const p = place(s0);
    const semis = modeSemis(p.mode);
    for (const o of barOf(p.block, p.key, p.bar)) {
      const step = s0 + o.at;
      if (step < from || step >= to) continue;
      for (let v = 0; v < o.density; v++) {
        const d = o.degree + 2 * v; // in thirds
        out.push({
          step,
          dur: o.dur,
          semis: p.tonic + semis[mod(d, 7)] + 12 * Math.floor(d / 7),
          level: 0.18 + o.dynamic * 0.11,
          pan: o.space / 3 - 1,
        });
      }
    }
  }
  return out;
}
