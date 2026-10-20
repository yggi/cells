/**
 * Anchors (decision 052, point 3): what no operator touches, derived from a fragment's text on its workbench by a rule
 * per kind of line, never declared. Rung 1 has the drums' two: the kick (a line every note of which strikes General
 * MIDI's kick, 36: `gmDrumNote`'s `bd`, `kick`, `kd`) and the backbeat (a line every note of which strikes the snare, 38,
 * on the meter's backbeat). The root on a chord change and the cadence join with the pitched operators. Pure.
 */
import { gmDrumNote } from '../midi';
import type { Meter } from '../meter';
import type { Line } from './lines';

/** What no operator moves: a whole line, or (with the pitched operators) one note of it, its step on the line's grid. */
export interface Anchor {
  /** The line, as the card names it: `&kick`. */
  readonly line: string;
  readonly step?: number;
  readonly reason: 'kick' | 'backbeat';
}

const KICK = 36;
const SNARE = 38;

// Lifted from yggi/jambot packages/engine/src/drums.ts @ 0a56da9 (`backbeatOf`), as a function of the meter's beats
// (Jambot's pulses are what decision 040 calls the beats): every beat after the downbeat in a bar of two or three, the
// odd ones from four up. When a meter can say its accents (#21), the rule reads them instead.
/** Where a meter's backbeat falls, each in whole notes from the bar's start: 4/4's second and fourth beats, 6/8's second. */
export function backbeatOf(meter: Meter): number[] {
  const beats = meter.beats.length;
  const starts = meter.beats.map((_, i) => meter.beats.slice(0, i).reduce((sum, b) => sum + b, 0) / meter.unit);
  return starts.filter((_, beat) => (beats <= 3 ? beat > 0 : beat % 2 === 1));
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Whether a line is on its meter's backbeat: every note's onset, in its bar, one the backbeat falls on. */
function onBackbeat(line: Line): boolean {
  if (!line.meter || line.stepWhole === null) return false;
  const bar = line.meter.pulses / line.meter.unit;
  const backbeat = backbeatOf(line.meter);
  return line.notes.every((n) => {
    const at = (n.step * line.stepWhole!) % bar;
    return backbeat.some((b) => near(at, b) || near(at, b + bar));
  });
}

/** Whether every note of a line strikes this drum. */
const strikes = (line: Line, note: number) => line.notes.length > 0 && line.notes.every((n) => gmDrumNote(n.voice.slice(1)) === note);

/** The anchors among a fragment's lines: the kick's line, and the backbeat's. */
export function anchorsAmong(lines: readonly Line[]): Anchor[] {
  return lines.flatMap((line): Anchor[] =>
    strikes(line, KICK) ? [{ line: line.name, reason: 'kick' }] : strikes(line, SNARE) && onBackbeat(line) ? [{ line: line.name, reason: 'backbeat' }] : [],
  );
}
