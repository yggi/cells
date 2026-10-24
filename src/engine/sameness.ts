/**
 * Sameness: do two texts sound the same, at some rung of decision 050's ladder? The sound rungs (S); the text rungs (E)
 * are `identity.ts`'s. Every tool that rewrites a piece promises S1 (decision 049): Migrate, Normalise and Shorten check a
 * rewrite against it before they offer or apply it. Lifted out of `shorten/harness.ts` (#155). Pure.
 *
 *  - S1 `soundsIdentical`: every event alike, voice (by its sound, and on a MIDI card what it sends: decision 057), onset,
 *    length, pitch, gains, bends, levels, moving parameters, envelope (the snapshot's `notes` and `events` hashes), over
 *    the whole piece (`wholeWindow`): what the tools check a rewrite by. `samePiece` is S1 over the first minute, kept for the tests of equal spellings and its public subpath.
 *  - S2 `playsSameNotes`: every event's voice (as S1 reads it), onset, length and pitch alike, gains and the rest free.
 *  - S3 `sameNotes`: the named cells' flattened steps alike.
 */
import { compileSource } from './compile';
import { codeShifts, type CompileOptions } from './program';
import { eventsBetween, plan } from './realize';
import { flatten } from './flatten';
import { pieceTime } from './duration';
import { CELL_PARAMS } from './attributes';
import { channelTable, midiNote, router, routesOf } from './midi';

type Result = ReturnType<typeof compileSource>;

/** S3: do these cells play the same notes (value, place, length) in both programs? Their `use` lines read through `options`. */
export function sameNotes(a: string, b: string, names: readonly string[], options: CompileOptions = {}): boolean {
  try {
    const ra = compileSource(a, undefined, options);
    const rb = compileSource(b, undefined, options);
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

/**
 * One event as two pieces are compared: all of it (S1), or the note it plays (S2: voice, onset, length, pitch). Its voice
 * is read by what it sounds like (`soundOf`, decision 057), not by its name (#186) or its place among the voices: a voice
 * renamed sounds identical, as a renamed text is E2; two voices' names swapped don't, unless they sound alike; and two
 * voices alike merged into one sound as the two did.
 */
type Event = ReturnType<typeof eventsBetween>[number];
const whole = (e: Event, voice: string) =>
  `${voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`;
const note = (e: Event, voice: string) => `${voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`;

/** A voice's attributes its events already carry: its gain and pan in their gains, its legato in their lengths. */
const IN_EVENTS: ReadonlySet<string> = new Set(['gain', 'pan', 'legato']);

/**
 * What a voice sounds like apart from the events it plays (decision 057): every attribute of its cell that shapes its
 * sound, the cells those name read the same way in their turn (an `env=`, an `fm=`, a `map=` table, a moving parameter's
 * factors), its own braid as its steps flatten. No name enters it, so a voice renamed, or two voices alike merged into
 * one, sound as they did.
 */
function soundOf(r: Result): (voice: string) => string {
  const shifts = codeShifts(r);
  const memo = new Map<string, string>();
  const of = (name: string, seen: ReadonlySet<string>): string => {
    const known = memo.get(name);
    if (known !== undefined) return known;
    const c = r.cells.get(name);
    if (!c || seen.has(name)) return c ? '(loop)' : name;
    const inner = new Set([...seen, name]);
    const ref = (n: string | null) => (n ? of(n, inner) : null);
    const params = Object.entries(c.params)
      .filter(([k]) => !IN_EVENTS.has(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, typeof v === 'string' && CELL_PARAMS.has(k) ? ref(v) : v]);
    const moving = Object.entries(c.paramCells)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, m]) => [k, m.range, m.factors.map((f) => ref(f))]);
    const steps = flatten(r, name, shifts).map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}`);
    const out = JSON.stringify([
      c.map?.kind === 'table' ? ref(c.map.table) : c.map,
      c.freq,
      c.loops,
      c.steps,
      c.glide,
      c.oneshot,
      c.kit,
      ref(c.env),
      ref(c.pitch),
      c.exciters ?? null,
      params,
      moving,
      steps,
    ]);
    if (!seen.size) memo.set(name, out);
    return out;
  };
  return (voice) => of(voice, new Set());
}

/** Do two texts compile and play the same events, each read as `key` reads it, from 0 to `until` seconds? Their `use` lines read through `options`. */
function sameEvents(a: string, b: string, until: number | ((ra: Result, rb: Result) => number), key: (e: Event, voice: string) => string, options: CompileOptions = {}): boolean {
  try {
    const ra = compileSource(a, undefined, options);
    const rb = compileSource(b, undefined, options);
    if (!ra.ok || !rb.ok) return false;
    const to = typeof until === 'number' ? until : until(ra, rb);
    const play = (r: Result) => {
      const events = eventsBetween(plan(r, codeShifts(r)), 0, to, true);
      // (each voice heard read as what it sounds like, not by its name or place: two voices alike are one, decision 057;
      // and, sent on a MIDI card, what MIDI out sends: its entry's channel, and a kit member's drum note, its name's,
      // which its output tells)
      const sound = soundOf(r);
      const route = router(r, channelTable(r));
      const sent = (e: Event) =>
        routesOf(e.midi ? route(e) : null)
          .map((x) => midiNote(e, x))
          .map((m) => (m ? `${m.channel}:${m.note}` : '-'))
          .join(',');
      return events
        .map((e) => key(e, `${sound(e.voice)} ${sent(e)}`))
        .sort()
        .join('\n');
    };
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
 * or to `until` seconds. A text's `use` lines (decision 054) read through `options`.
 */
export function soundsIdentical(a: string, b: string, until?: number, options?: CompileOptions): boolean {
  return sameEvents(a, b, until ?? wholeWindow, whole, options);
}

/** S2, **plays the same notes** (#180): every event's voice, onset, length and pitch alike, its gains and the rest free, over the whole piece or to `until`. */
export function playsSameNotes(a: string, b: string, until?: number, options?: CompileOptions): boolean {
  return sameEvents(a, b, until ?? wholeWindow, note, options);
}
