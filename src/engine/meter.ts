/**
 * The compiled Meter: one tree of groups and one time map for a bar, whether it was written as
 * `meter("4/4")` (levels, its steps even) or `scan(1 1 1 1)` (positions, no levels). A reader of
 * a bar (the swing clock, the MIDI clock, a tap) reads this and not how it was written.
 *
 * It knows its pulse, its beats and the note value of a pulse (decision 040): a line taps the meter by
 * pulse, beat or note value (`tapPositions`), never by the meter cell's own steps.
 */
import { scan as scanOf } from '../theory/modes';
import type { Tap } from './ast';

/** A group of steps [from, to) at a level: 0 the bar, then finer (1 a beat, 2 a half, 3 a subdivision, 4 finer). */
export interface MeterGroup {
  readonly level: number;
  readonly from: number;
  readonly to: number;
  readonly groups: readonly MeterGroup[];
}

export interface Meter {
  /** The bar: level 0 over all the steps, its groups nested by the levels. A scan's is flat, every step one group at level 1. */
  readonly tree: MeterGroup;
  /** Each step's level (a scan's: 1 each). */
  readonly levels: readonly number[];
  /** Each step's position in the bar, 0 ≤ p < lap (the time map's ticks). */
  readonly positions: readonly number[];
  /** The bar's length in those positions. */
  readonly lap: number;
  /** The form it was written as: `meter(…)` (levels, its steps even) or `scan(…)` (positions, every step level 1). */
  readonly written: 'meter' | 'scan';
  /** The pulse: the numerator, equal steps of the denominator's length; a scan's are its entries. */
  readonly pulses: number;
  /** The note value of a pulse, as the denominator: 4 a quarter (a scan's), 8 an eighth. */
  readonly unit: number;
  /** The beats, each its length in pulses: what is counted, what bpm counts (6/8: 3 3; 7/8: 3 2 2; 4/4: 1 1 1 1). */
  readonly beats: readonly number[];
  /** A scan with pulse= (its beats quarters, the last maybe cut): how many beats its bpm counts, a fraction where it ends mid-beat. */
  readonly counted?: number;
  /** swing= (#18): the levels that lean, coarse to fine, each a division of a beat (`swingAt`). */
  readonly swing?: readonly SwingLevel[];
}

/**
 * A level of a meter that leans (#18, decision 040's `swing=8n:.67`): its divisions as a note value (`8n`), and the share
 * of each of their nodes at which the second starts (.5 straight, .67 the triplet swing).
 */
export interface SwingLevel {
  /** The note value as written: `8n`, `16n`, `8t`. */
  readonly level: string;
  /** Its length in whole notes (`8n`: 1/8). */
  readonly whole: number;
  readonly share: number;
}

/** How a time signature writes a meter: its pulses, its note value and its beats (in pulses), each pulse in `sub` steps. */
export interface Signature {
  readonly pulses: number;
  readonly unit: number;
  readonly beats: readonly number[];
  readonly sub: number;
}

/** The meter's steps a pulse (meter("4/4", 2): 2; a scan: 1). */
export const stepsPerPulse = (m: Meter): number => m.levels.length / Math.max(1, m.pulses);

/** A note value as written (`16n`, `8t`, `4n.`): its length in whole notes, or null. */
export function noteValue(v: string): number | null {
  const m = /^([1-9][0-9]*)(n\.?|t)$/.exec(v);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2] === 'n.' ? 3 / (2 * n) : m[2] === 't' ? 2 / (3 * n) : 1 / n;
}

/**
 * pulse= on a scan (decision 040): the note value of each of its entries (`pulse=16n`: sixteenths; a scan's are quarters
 * unless it says). Its beats are then what musicians count, the quarter: so many pulses a beat, the last one cut where
 * the scan ends (BWV 847's tempo map: 1,105 sixteenths, 276¼ beats).
 */
export function withPulse(m: Meter, whole: number): Meter {
  const unit = 1 / whole;
  const per = unit / 4; // (pulses a quarter)
  if (!(per > 1)) return { ...m, unit };
  const beats: number[] = [];
  for (let at = 0; at < m.pulses - 1e-9; at += per) beats.push(Math.min(per, m.pulses - at));
  // (a last beat cut short counts its share: the bpm reads quarters however the scan ends)
  return { ...m, unit, beats, counted: m.pulses / per };
}

/** How many beats a meter's bpm counts in a bar: one each (7/8: three, unequal), or a scan's beats of `pulse=` (276¼). */
export const beatCount = (m: Meter): number => m.counted ?? Math.max(1, m.beats.length);

/** beat=n on a meter: n equal beats over its pulses, in place of the beats it was written with (alla breve: `meter("4/4") beat=2`). */
export function withBeats(m: Meter, n: number): Meter {
  const k = Math.max(1, Math.round(n));
  const { counted: _, ...rest } = m;
  return { ...rest, beats: Array.from({ length: k }, () => m.pulses / k) };
}

/** swing= on a meter: the levels that lean, those at .5 (straight) left out. */
export function withSwing(m: Meter, levels: readonly SwingLevel[]): Meter {
  const leaning = levels.filter((l) => l.share !== 0.5);
  return leaning.length ? { ...m, swing: leaning } : m;
}

/** A note value from its length in whole notes (1/8: `8n`, 1/12: `8t`, 3/16: `8n.`), or null. */
export function noteName(whole: number): string | null {
  const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-9 && Math.round(x) >= 1 && Number.isInteger(Math.log2(Math.round(x)));
  if (near(1 / whole)) return `${Math.round(1 / whole)}n`;
  if (near(2 / (3 * whole))) return `${Math.round(2 / (3 * whole))}t`;
  if (near(3 / (2 * whole))) return `${Math.round(3 / (2 * whole))}n.`;
  return null;
}

/** A bare swing= on a meter (`swing=.67`): the level of its own steps (`meter("4/4", 2)`: `8n`), or null. */
export const bareSwingLevel = (m: Meter): string | null => noteName(1 / (m.unit * stepsPerPulse(m)));

/**
 * A level a meter can lean: one some beat divides into, two or more of them (swing never moves a beat: decision 040).
 * What is wrong with it, or null.
 */
export function swingLevelProblem(m: Meter, whole: number): string | null {
  const len = whole * m.unit;
  const fits = m.beats.some((b) => {
    const q = b / len;
    return Math.abs(q - Math.round(q)) < 1e-9 && Math.round(q) >= 2;
  });
  return fits
    ? null
    : `no beat of this meter divides into two or more of ${noteName(whole) ?? 'them'} (its beats: ${m.beats.map((b) => noteName(b / m.unit) ?? b).join(' ')}), and swing never moves a beat`;
}

/** On a node's divisions, halved and halved again (a 16th under swung 8ths): v in units of its children. */
const held = (v: number) => {
  for (let k = 0, x = v; k <= 6; k++, x *= 2) if (Math.abs(x - Math.round(x)) < 1e-9) return true;
  return false;
};

/**
 * Where a node's children start, as shares of it: even, or leaning (#18). A pair's second starts at the share; a group of
 * three leans its second and third (Jambot's ternary lean, `apps/web/src/meter/ternary.ts` there): the second moves as far
 * as a pair's would, from a third (.67, a pair's triplet swing, puts it at a half: long, short, short), the third halfway
 * between it and the end.
 */
function knotsOf(parts: number, share: number | null): number[] {
  const even = Array.from({ length: parts + 1 }, (_, i) => i / parts);
  if (share === null || (parts !== 2 && parts !== 3)) return even;
  if (parts === 2) return [0, Math.min(0.95, Math.max(0.05, share)), 1];
  const second = Math.min(0.95, Math.max(0.05, share - 1 / 6));
  return [0, second, (second + 1) / 2, 1];
}

/**
 * Where a position x within a beat of n pulses is played, its levels leaning (lengths in pulses, with their shares). The
 * beat is a tree: its pulses where it holds several (a group of three eighths), then halves, down to the finest level
 * that leans; each node keeps its ends and divides its span among its children, by a level's share where its children
 * are that level, evenly otherwise. A position on the tree's divisions (or halves of them) is placed through it; one the
 * tree doesn't hold (a triplet in a swung pair) is even within its node, not warped.
 */
function swungIn(x: number, n: number, levels: readonly { len: number; share: number }[]): number {
  const finest = Math.min(...levels.map((l) => l.len));
  let from = 0;
  let len = n;
  let at = 0;
  let span = n;
  for (let guard = 0; guard < 16; guard++) {
    const q = len / finest;
    const qi = Math.round(q);
    if (Math.abs(q - qi) > 1e-9 || qi < 2) break;
    // (two or three: the level's own node; more: a beat's pulses (thirds) or halves first)
    const parts = qi === 2 || qi === 3 ? qi : qi % 3 === 0 ? 3 : qi % 2 === 0 ? 2 : qi;
    const child = len / parts;
    const rel = ((x - from) / len) * parts;
    if (!held(rel)) break;
    const knots = knotsOf(parts, levels.find((l) => Math.abs(l.len - child) < 1e-9)?.share ?? null);
    const k = Math.min(parts - 1, Math.max(0, Math.floor(rel + 1e-9)));
    from += k * child;
    len = child;
    at += knots[k] * span;
    span *= knots[k + 1] - knots[k];
  }
  return at + ((x - from) / len) * span;
}

/**
 * Where a position, in pulses from the first downbeat, is played under the meter's swing (#18): within its beat, through
 * the beat's tree (`swungIn`). Every beat and every bar line stays where it is.
 */
export function swingAt(m: Meter, p: number): number {
  if (!m.swing?.length) return p;
  const levels = m.swing.map((l) => ({ len: l.whole * m.unit, share: l.share }));
  const P = m.pulses;
  const bar = Math.floor(p / P + 1e-9);
  const x = p - bar * P;
  let at = 0;
  let i = 0;
  while (i < m.beats.length - 1 && at + m.beats[i] <= x + 1e-9) at += m.beats[i++];
  const beat = m.beats[i] ?? P;
  return bar * P + at + swungIn(x - at, beat, levels);
}

/** The meter's own steps under its swing, in steps of one bar; null where none moves. */
export function swungSteps(m: Meter): number[] | null {
  const per = stepsPerPulse(m);
  const out = m.levels.map((_, i) => swingAt(m, i / per) * per);
  return out.some((p, i) => Math.abs(p - i) > 1e-12) ? out : null;
}

/**
 * meter(…): steps by level, a bar whose steps are even. Its signature, when it was written as one (`meter("7/8")`), says
 * its pulses and beats; written as levels (`meter("*.+.+..")`), its steps are its pulses and its beats run from each
 * beat (+, *) to the next, a pulse an eighth (a quarter when every step is a beat, a sixteenth when every beat is four).
 */
export function meterOfLevels(levels: readonly number[], signature?: Signature): Meter {
  const n = levels.length;
  const root: { level: number; from: number; to: number; groups: MeterGroup[] } = { level: 0, from: 0, to: n, groups: [] };
  const open = [root];
  for (let i = 1; i < n; i++) {
    const level = Math.max(1, levels[i]);
    while (open.length > 1 && open[open.length - 1].level >= level) open.pop();
    const group = { level, from: i, to: n, groups: [] as MeterGroup[] };
    // (a group ends where the next step of its level or coarser begins)
    for (let j = i + 1; j < n; j++) if (Math.max(1, levels[j]) <= level) ((group.to = j), (j = n));
    open[open.length - 1].groups.push(group);
    open.push(group);
  }
  const shape = signature ?? signatureOfLevels(levels);
  return { tree: root, levels, positions: levels.map((_, i) => i), lap: n, written: 'meter', pulses: shape.pulses, unit: shape.unit, beats: shape.beats };
}

/** A meter written as levels: its steps its pulses, its beats from each beat (0 or 1) to the next. */
function signatureOfLevels(levels: readonly number[]): Signature {
  const starts = levels.flatMap((l, i) => (i === 0 || l <= 1 ? [i] : []));
  const beats = starts.map((s, i) => (starts[i + 1] ?? levels.length) - s);
  const per = levels.length / Math.max(1, beats.length);
  // (steps a beat a power of two: a pulse that fraction of a quarter; otherwise eighths, grouped)
  const unit = Number.isInteger(Math.log2(per)) ? 4 * per : 8;
  return { pulses: levels.length, unit, beats, sub: 1 };
}

/** scan(…): positions in the bar, no levels: a flat tree. */
export function meterOfScan(steps: readonly number[]): Meter {
  const { positions, lap } = scanOf(steps);
  const groups = positions.map((_, i) => ({ level: 1, from: i, to: i + 1, groups: [] }));
  const pulses = positions.length;
  return { tree: { level: 0, from: 0, to: pulses, groups }, levels: positions.map(() => 1), positions, lap, written: 'scan', pulses, unit: 4, beats: positions.map(() => 1) };
}

/**
 * Where a tap's steps fall in `bars` bars of a meter, in pulses from the downbeat (decision 040): `pulse` each pulse,
 * `beat` each beat (unequal where the beats are), a note value every so many pulses, cut at the end of the last bar
 * (`1n` in 3/4: one a bar; `4n.` in 4/4: 3+3+2 eighths), `1m` each bar. The tap comes round after them.
 */
export function tapPositions(m: Meter, tap: Tap, bars = 1): number[] {
  const out: number[] = [];
  const P = m.pulses;
  const lap = P * Math.max(1, bars);
  if (tap.kind === 'note') {
    const len = tap.whole * m.unit;
    // (by index, never by adding up: 8t's thirds land where they should)
    for (let i = 0; i * len < lap - 1e-9; i++) out.push(i * len);
    return out;
  }
  for (let b = 0; b < Math.max(1, bars); b++) {
    if (tap.kind === 'bar') out.push(b * P);
    else if (tap.kind === 'pulse') for (let p = 0; p < P; p++) out.push(b * P + p);
    else {
      let at = 0;
      for (const len of m.beats) (out.push(b * P + at), (at += len));
    }
  }
  return out;
}
