/**
 * Sameness: do two texts sound the same, at some rung of decision 050's ladder? The sound rungs (S); the text rungs (E)
 * are `identity.ts`'s. Every tool that rewrites a piece promises S1 (decision 049): Migrate, Normalise and Shorten check a
 * rewrite against it before they offer or apply it. Lifted out of `shorten/harness.ts` (#155). Pure.
 *
 *  - S1 `soundsIdentical`: every event alike to the ear (decision 070, `HEARD`), voice (by its sound, and on a MIDI card
 *    what it sends: decision 057), onset, length, pitch, gains, bends, levels, moving parameters, envelope, a noise by its
 *    colour and level; the snapshot's hashes stay exact, stricter than S1; over
 *    the whole piece (`wholeWindow`): what the tools check a rewrite by. `samePiece` is S1 over the first minute, kept for the tests of equal spellings and its public subpath.
 *  - S2 `playsSameNotes`: every event's voice (as S1 reads it), onset, length and pitch alike to the ear, gains and the rest free.
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

/** S3: do these cells play the same notes (value, place, length) in both programs? Their `from` lines read through `options`. */
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
 * What a listener can't tell apart (decision 070, #483): each threshold a fraction of the smallest difference people hear
 * in the best conditions, so two texts S1 calls identical sound alike to every listener, not to most. The sources and the
 * fractions are the decision's.
 *  - `cents`: pitch, a note's, a bend's and a voice's own, 0.5 cent (the frequency JND is about 2 to 5 cents for tones
 *    in the middle of hearing, 0.2 to 0.3 %: Wier, Jesteadt & Green 1977; Moore 2012).
 *  - `db`: level, per channel, 0.1 dB (the intensity JND is about 0.5 to 1 dB: Jesteadt, Wier & Green 1977; an
 *    interaural level difference about 0.5 to 1 dB: Mills 1960).
 *  - `seconds`: where a note starts and ends, 0.25 ms (two onsets about 1 to 2 ms apart are heard as two: Zera & Green
 *    1993; a gap in noise about 2 to 3 ms: Fitzgibbons & Wightman 1982).
 *  - `silent`: an amplitude below −100 dB is none.
 */
export const HEARD = { cents: 0.5, db: 0.1, seconds: 0.00025, silent: 1e-5 } as const;

/** A frequency ratio of `HEARD.cents`: how far apart two numbers inside an event or a voice's sound may be, relatively. */
const RELATIVE = 2 ** (HEARD.cents / 1200) - 1;

/** Two numbers no listener tells apart where their unit isn't known (a cutoff in Hz, an envelope's seconds, a bend's cents): within `HEARD.seconds` absolutely, or the pitch threshold relatively. */
const near = (a: number, b: number) => a === b || Math.abs(a - b) <= HEARD.seconds + RELATIVE * Math.max(Math.abs(a), Math.abs(b));

/** Two values alike to the ear: numbers `near`, strings and the rest equal, arrays and records alike throughout. */
function alike(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return near(a, b);
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => alike((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Two pitches within `HEARD.cents`. */
const samePitch = (a: number, b: number) => a === b || (a > 0 && b > 0 && Math.abs(1200 * Math.log2(a / b)) <= HEARD.cents);
/** Two amplitudes within `HEARD.db`, of one sign (a polarity: an inverted voice cancels another), or both silent. */
const sameLevel = (a: number, b: number) =>
  Math.abs(a) < HEARD.silent ? Math.abs(b) < HEARD.silent : Math.abs(b) >= HEARD.silent && Math.sign(a) === Math.sign(b) && Math.abs(20 * Math.log10(a / b)) <= HEARD.db;

/** The noises a voice can be (`s=`): heard by their colour, level and filters, never by their samples or a pitch. */
const NOISES: ReadonlySet<string> = new Set(['white', 'pink', 'brown']);

/**
 * One event as two pieces are compared. Its voice is read by what it sounds like (`soundOf`, decision 057), numbered by
 * the class of voices alike to the ear across both texts, not by its name (#186) or its place among the voices: a voice
 * renamed sounds identical, as a renamed text is E2; two voices' names swapped don't, unless they sound alike; and two
 * voices alike merged into one sound as the two did. A noise has no pitch: its frequency and bends aren't heard.
 */
interface Heard {
  readonly voice: number;
  readonly at: number;
  readonly dur: number;
  /** Its pitch, or null for a noise. */
  readonly freq: number | null;
  /** Its level per channel: the gains of every event alike in all else, summed (one note in both channels is two, one in each). */
  readonly gains: readonly [number, number];
  /** Bends (none for a noise), levels, moving parameters and envelope. */
  readonly rest: unknown;
  /** What MIDI out sends of it. */
  readonly sent: string;
}

type Event = ReturnType<typeof eventsBetween>[number];
/** A number as the snapshot reads it, to 9 significant digits (`snapshot.test.ts`): the exact pass's, before the heard one. */
const nine = (_: string, v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? +v.toPrecision(9) : v);

/** A voice's attributes its events already carry: its gain and pan in their gains, its legato in their lengths. */
const IN_EVENTS: ReadonlySet<string> = new Set(['gain', 'pan', 'legato']);

/**
 * What a voice sounds like apart from the events it plays (decision 057): every attribute of its cell that shapes its
 * sound, the cells those name read the same way in their turn (an `env=`, an `fm=`, a `map=` table, a moving parameter's
 * factors), its own braid as its steps flatten. No name enters it, so a voice renamed, or two voices alike merged into
 * one, sound as they did. A noise's pitch doesn't: its frequency, glide and braid are left out (decision 070).
 */
function soundOf(r: Result): (voice: string) => unknown {
  const shifts = codeShifts(r);
  const memo = new Map<string, unknown>();
  const of = (name: string, seen: ReadonlySet<string>): unknown => {
    if (memo.has(name)) return memo.get(name);
    const c = r.cells.get(name);
    if (!c || seen.has(name)) return c ? '(loop)' : name;
    const inner = new Set([...seen, name]);
    const ref = (n: string | null) => (n ? of(n, inner) : null);
    const noise = NOISES.has(String(c.params.s));
    const params = Object.entries(c.params)
      .filter(([k]) => !IN_EVENTS.has(k))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, typeof v === 'string' && CELL_PARAMS.has(k) ? ref(v) : v]);
    const moving = Object.entries(c.paramCells)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, m]) => [k, m.range, m.factors.map((f) => ref(f))]);
    const steps = noise ? [] : flatten(r, name, shifts).map((e) => [e.step, e.duration, e.value + e.alter + (e.transpose ?? 0)]);
    const out = [
      c.map?.kind === 'table' ? ref(c.map.table) : c.map,
      // (a noise's pitch isn't heard: its frequency, whether it loops, its braid's length and its glide)
      noise ? null : c.freq,
      noise ? null : c.loops,
      noise ? null : c.steps,
      noise ? null : c.glide,
      c.oneshot,
      c.kit,
      ref(c.env),
      // (its pitch= is not: a cell read as pitch= joins every product the voice is in as a term of its sum, so its
      // bends are in the events, as `(&t + &vib) * &lead`'s are, decision 068; a per-note shape, pitch=0..30 * &(…),
      // is a moving parameter, read above)
      c.exciters ?? null,
      params,
      moving,
      steps,
    ];
    if (!seen.size) memo.set(name, out);
    return out;
  };
  return (voice) => of(voice, new Set());
}

/** How two lists of events are compared: all of each (S1), or the notes they play (S2: voice, onset, length, pitch). */
type Reading = 'whole' | 'note';

/** Do two texts compile and play the same events to the ear, read as `reading` says, from 0 to `until` seconds? Their `from` lines read through `options`. */
function sameEvents(a: string, b: string, until: number | ((ra: Result, rb: Result) => number), reading: Reading, options: CompileOptions = {}): boolean {
  try {
    const ra = compileSource(a, undefined, options);
    const rb = compileSource(b, undefined, options);
    if (!ra.ok || !rb.ok) return false;
    const to = typeof until === 'number' ? until : until(ra, rb);
    const played = (r: Result) => {
      const events = eventsBetween(plan(r, codeShifts(r), r.off), 0, to, true);
      // (each voice heard read as what it sounds like, not by its name or place: two voices alike are one, decision 057;
      // and, sent on a MIDI card, what MIDI out sends: its entry's output slot and channel, and a kit member's drum note,
      // its name's, which its output tells; #273)
      const route = router(r, channelTable(r));
      const sent = (e: Event) =>
        routesOf(e.midi ? route(e) : null)
          .map((x) => {
            const m = midiNote(e, x);
            return m ? `${x?.port ?? 1}:${m.channel}:${m.note}` : '-';
          })
          .join(',');
      return { r, events, sent: events.map(sent), sound: soundOf(r) };
    };
    const pa = played(ra);
    const pb = played(rb);
    // (the voices alike to the ear across both texts, numbered: each the first sound it is alike to)
    const sounds: unknown[] = [];
    const classOf = new Map<string, number>();
    const voiceOf = (p: typeof pa, side: string) => (voice: string) => {
      const key = `${side}${voice}`;
      let k = classOf.get(key);
      if (k === undefined) {
        const s = p.sound(voice);
        k = sounds.findIndex((t) => alike(t, s));
        if (k < 0) k = sounds.push(s) - 1;
        classOf.set(key, k);
      }
      return k;
    };
    // (first the exact pass, as the snapshot reads numbers: most rewrites play the same numbers, and it is quick)
    const exact = (p: typeof pa, side: string) => {
      const voice = voiceOf(p, side);
      return p.events
        .map((e, i) => {
          const v = `${voice(e.voice)} ${p.sent[i]}`;
          const n = `${v} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`;
          return reading === 'note' ? n : `${n} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null], nine)}`;
        })
        .sort()
        .join('\n');
    };
    if (exact(pa, 'a') === exact(pb, 'b')) return true;
    // (an onset within a threshold of where the listening stops is in one text and past it in the other: neither is heard)
    const within = (h: Heard) => h.at < to - HEARD.seconds;
    return sameHeard(heard(pa, voiceOf(pa, 'a'), reading).filter(within), heard(pb, voiceOf(pb, 'b'), reading).filter(within), reading);
  } catch {
    return false;
  }
}

/** A text's events as heard: each read as `reading` says, those alike in all but their channel summed, the silent left out. */
function heard(p: { r: Result; events: readonly Event[]; sent: readonly string[] }, voice: (name: string) => number, reading: Reading): Heard[] {
  const out: Heard[] = [];
  const sorted = p.events.map((e, i) => ({ e, sent: p.sent[i]! })).sort((x, y) => x.e.at - y.e.at);
  for (const { e, sent } of sorted) {
    const noise = NOISES.has(String(p.r.cells.get(e.voice)?.params.s));
    const h: Heard = {
      voice: voice(e.voice),
      at: e.at,
      dur: e.dur,
      freq: noise ? null : e.freq,
      gains: reading === 'note' ? [0, 0] : e.gains,
      rest: reading === 'note' ? null : [noise ? [] : e.bends, e.levels, e.params ?? null, e.env ?? null],
      sent,
    };
    // (an event alike to one already heard, but for its channels, sounds with it: their levels add)
    let j = out.length - 1;
    while (j >= 0 && h.at - out[j]!.at <= HEARD.seconds && !sameBut(out[j]!, h)) j--;
    if (j >= 0 && h.at - out[j]!.at <= HEARD.seconds) {
      const g = out[j]!.gains;
      out[j] = { ...out[j]!, gains: [g[0] + h.gains[0], g[1] + h.gains[1]] };
    } else out.push(h);
  }
  // (what sounds nowhere and is sent nowhere isn't heard)
  return reading === 'note' ? out : out.filter((h) => h.sent !== '' || h.gains.some((g) => Math.abs(g) >= HEARD.silent));
}

/** Two events alike to the ear in all but their levels. */
const sameBut = (x: Heard, y: Heard) =>
  x.voice === y.voice &&
  x.sent === y.sent &&
  Math.abs(x.at - y.at) <= HEARD.seconds &&
  Math.abs(x.at + x.dur - (y.at + y.dur)) <= HEARD.seconds &&
  (x.freq === null ? y.freq === null : y.freq !== null && samePitch(x.freq, y.freq)) &&
  alike(x.rest, y.rest);

/** Does every event of one list have its own in the other, alike to the ear (each taken once, the first in time that is)? */
function sameHeard(a: readonly Heard[], b: readonly Heard[], reading: Reading): boolean {
  if (a.length !== b.length) return false;
  const taken = new Uint8Array(b.length);
  let from = 0;
  for (const x of a) {
    while (from < b.length && b[from]!.at < x.at - HEARD.seconds) {
      if (!taken[from]) return false;
      from++;
    }
    let found = -1;
    for (let j = from; j < b.length && b[j]!.at <= x.at + HEARD.seconds; j++)
      if (!taken[j] && sameBut(x, b[j]!) && (reading === 'note' || (sameLevel(x.gains[0], b[j]!.gains[0]) && sameLevel(x.gains[1], b[j]!.gains[1])))) {
        found = j;
        break;
      }
    if (found < 0) return false;
    taken[found] = 1;
  }
  return true;
}

/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export function samePiece(a: string, b: string, until = SAMENESS_SECONDS): boolean {
  return sameEvents(a, b, until, 'whole');
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
 * or to `until` seconds. A text's `from` lines (decision 054) read through `options`.
 */
export function soundsIdentical(a: string, b: string, until?: number, options?: CompileOptions): boolean {
  return sameEvents(a, b, until ?? wholeWindow, 'whole', options);
}

/** S2, **plays the same notes** (#180): every event's voice, onset, length and pitch alike, its gains and the rest free, over the whole piece or to `until`. */
export function playsSameNotes(a: string, b: string, until?: number, options?: CompileOptions): boolean {
  return sameEvents(a, b, until ?? wholeWindow, 'note', options);
}
