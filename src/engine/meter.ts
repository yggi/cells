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

/** beat=n on a meter: n equal beats over its pulses, in place of the beats it was written with (alla breve: `meter("4/4") beat=2`). */
export function withBeats(m: Meter, n: number): Meter {
  const k = Math.max(1, Math.round(n));
  return { ...m, beats: Array.from({ length: k }, () => m.pulses / k) };
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
