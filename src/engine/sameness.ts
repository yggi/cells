/**
 * Sameness: do two texts sound the same, at some rung of decision 050's ladder? The sound rungs (S); the text rungs (E)
 * are `identity.ts`'s. Every tool that rewrites a piece promises S1 (decision 049): Migrate, Normalise and Shorten check a
 * rewrite against it before they offer or apply it. Lifted out of `shorten/harness.ts` (#155). Pure.
 *
 *  - S1 `soundsIdentical`: every event alike, voice, onset, length, pitch, gains, bends, levels, moving parameters,
 *    envelope (the snapshot's `notes` and `events` hashes), over the whole piece (`wholeWindow`). `samePiece` is S1 over
 *    the first minute, what the tools check by until they move to the whole window.
 *  - S2 `playsSameNotes`: every event's voice, onset, length and pitch alike, gains and the rest free.
 *  - S3 `sameNotes`: the named cells' flattened steps alike.
 */
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { flatten } from './flatten';
import { pieceTime } from './duration';

type Result = ReturnType<typeof compileSource>;

/** S3: do these cells play the same notes (value, place, length) in both programs? */
export function sameNotes(a: string, b: string, names: readonly string[]): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!rb.ok) return false;
    const notes = (r: Result, n: string) =>
      flatten(r, n, codeShifts(r))
        .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
        .join(' ');
    return names.every((n) => notes(ra, n) === notes(rb, n));
  } catch {
    return false;
  }
}

/**
 * How many seconds two spellings are compared over: the tools' check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export const SAMENESS_SECONDS = 60;

/** One event as two pieces are compared: all of it (S1), or the note it plays (S2: voice, onset, length, pitch). */
type Event = ReturnType<typeof eventsBetween>[number];
const whole = (e: Event) =>
  `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`;
const note = (e: Event) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`;

/** Do two texts compile and play the same events, each read as `key` reads it, from 0 to `until` seconds? */
function sameEvents(a: string, b: string, until: number | ((ra: Result, rb: Result) => number), key: (e: Event) => string): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!ra.ok || !rb.ok) return false;
    const to = typeof until === 'number' ? until : until(ra, rb);
    const play = (r: Result) =>
      eventsBetween(plan(r, codeShifts(r)), 0, to)
        .map(key)
        .sort()
        .join('\n');
    return play(ra) === play(rb);
  } catch {
    return false;
  }
}

/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export function samePiece(a: string, b: string, until = SAMENESS_SECONDS): boolean {
  return sameEvents(a, b, until, whole);
}

/**
 * The longest a piece is compared over to its end, in seconds: twenty minutes, past every example that ends (BWV 847 is
 * 189 s), short of a day-long piece (law=fiveto12), which is compared over its first twenty minutes.
 */
export const WHOLE_PIECE_LIMIT = 1200;

/**
 * Where two pieces are compared to (#180): the later of their ends, each piece's end where it ends (laps=) and its first
 * minute where it goes on (`SAMENESS_SECONDS`), at most `WHOLE_PIECE_LIMIT`.
 */
export function wholeWindow(a: Result, b: Result): number {
  const end = (r: Result) => pieceTime(r).ends ?? SAMENESS_SECONDS;
  return Math.min(WHOLE_PIECE_LIMIT, Math.max(end(a), end(b)));
}

/**
 * S1, **sounds identical** (#180; the owner: the snapshot's `notes` and `events` hashes agree): every event alike, its
 * voice, onset, length, pitch, gains, bends, levels, moving parameters and envelope, over the whole piece (`wholeWindow`),
 * or to `until` seconds.
 */
export function soundsIdentical(a: string, b: string, until?: number): boolean {
  return sameEvents(a, b, until ?? wholeWindow, whole);
}

/** S2, **plays the same notes** (#180): every event's voice, onset, length and pitch alike, its gains and the rest free, over the whole piece or to `until`. */
export function playsSameNotes(a: string, b: string, until?: number): boolean {
  return sameEvents(a, b, until ?? wholeWindow, note);
}
