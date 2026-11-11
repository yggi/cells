/**
 * A piece as a MIDI file (#307): its notes as MIDI out sends them (`engine/midi.ts`: the same channel table, routes,
 * keys, velocities and bends; decision 005, what is sent is what sounds), on the main meter's steps, or its swing's finest
 * level where that is finer (#558; `midiclock.ts`): a quarter note the meter's beat, the tempo each step's length, so a scan's or a motor's tempo map is the file's
 * and a note on a step is on the grid (a swing is tempos that alternate, not notes off the grid; a note between steps
 * sits where it sounds). A piece with no main meter is laid at 120 bpm. How much is written is the span every render
 * takes (`span.ts`, #315): a piece that ends whole, a loop one cycle, an hour at most, or what the caller gives.
 * The main meter's signature is written where its beat is a quarter note (2/4, 3/4, 4/4, 5/4, a scan counted in
 * quarters), the file's quarter being the meter's beat; a meter whose beat is another value (6/8's dotted quarter, alla
 * breve's half) is written without one, its bars still the meter's.
 */
import { legatoNotes, channelTable, midiNote, noteOf, routesOf, router, BEND_CENTRE } from './midi';
import { keyName } from './miditext';
import { mainMeter } from './midiclock';
import { clocking } from './clocking';
import { spanOf, type SpanOptions } from './span';
import { eventsBetween, plan } from './realize';
import { DEFAULT_FREQ, type CompileResult, type Shifts } from './program';
import type { Smf, SmfNote, SmfTrack } from './midifile';

/** Ticks a quarter note in a written file. */
const PPQ = 480;
/** A tempo change smaller than this (microseconds a quarter) is rounding, not a change. */
const SAME_TEMPO = 2;
/**
 * The meter the main meter's root is: its own, or where the root is a rate alone (`&bar meter("4/4") step=&tempo`, #290,
 * as every seed meter is) the one meter stepping on it; none where several do.
 */
function meterOf(result: CompileResult, root: string) {
  const own = result.cells.get(root)?.meter;
  if (own) return own;
  const on = [...result.cells.values()].filter((c) => c.meter && c.step?.driver === root);
  return on.length === 1 ? on[0]!.meter : undefined;
}

/** The piece's notes as a MIDI file (to `writeMidi`), and how many notes no MIDI key could carry. */
export function pieceMidi(result: CompileResult, shifts: Shifts, muted: ReadonlySet<string> = result.off, name?: string, span: SpanOptions = {}): { smf: Smf; dropped: number } {
  const p = plan(result, shifts, muted);
  const seconds = spanOf(result, p, { ...span, from: 0 }).to;
  // (each note with its output: the router reads a kit's from it)
  // (a drone's note held to the file's end: decision 028)
  // (a glide's run as its notes, each into the next, legato (#334); the run's notes past the file's end left out, as any
  // note starting there is: a run is looked ahead along its track, and goes on for up to 256 notes)
  const events = eventsBetween(p, 0, seconds, true, { until: seconds })
    .flatMap(legatoNotes)
    .filter((e) => e.at < seconds);

  // the meter's steps, through its time map, as far as the last note sounds (or eighths at 120 bpm), each a fixed
  // number of ticks (a beat a quarter note) and the tempo its length: a note on a step falls on the grid
  // (a meter that swings finer than its own steps is laid at the finest division its swing leans, as its swing plays it:
  // `meter("4/4") swing=8n:2/3` on eighths whose tempos alternate, as `meter("4/4", 2)` is; #15 rung 1)
  const meter = mainMeter(result);
  const played = meter ? clocking(result, p.statics).played(meter.cell) : null;
  const grain = Math.min(1, played?.grain ?? 1);
  const map = played ? { q: (k: number) => played.q(k * grain) } : null;
  const perBeat = (meter?.beat ?? 4) / grain;
  const last = events.reduce((m, e) => Math.max(m, e.at + e.dur), seconds);
  const steps: number[] = [];
  for (let k = 0; steps.length < 1_000_000; k++) {
    const t = map ? map.q(k) : k * 0.125;
    if (!Number.isFinite(t) || (steps.length && t <= steps[steps.length - 1])) break;
    steps.push(t);
    if (t > last) break;
  }
  // (a meter that stops before the notes do: on at its last step's length)
  while (steps.length < 2 || steps[steps.length - 1] <= last) {
    const n = steps.length;
    steps.push(n >= 2 ? 2 * steps[n - 1] - steps[n - 2] : n * 0.125);
  }
  const tickOf = (k: number) => Math.round((k * PPQ) / perBeat);
  const tickAt = (t: number) => {
    let lo = 0;
    let hi = steps.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (steps[mid] <= t) lo = mid;
      else hi = mid - 1;
    }
    return Math.round(tickOf(lo) + ((tickOf(lo + 1) - tickOf(lo)) * (t - steps[lo])) / (steps[lo + 1] - steps[lo]));
  };
  const tempos: { tick: number; micros: number }[] = [];
  // (none past the last note: a scan wrapping round after the end isn't the piece's)
  const lastTick = tickAt(last);
  for (let k = 0; k + 1 < steps.length && (k === 0 || tickOf(k) < lastTick); k++) {
    const micros = Math.round(((steps[k + 1] - steps[k]) * 1e6 * PPQ) / (tickOf(k + 1) - tickOf(k)));
    if (!tempos.length || Math.abs(micros - tempos[tempos.length - 1].micros) >= SAME_TEMPO) tempos.push({ tick: tickOf(k), micros });
  }

  // the notes, on MIDI out's routes, a track a channel
  const table = channelTable(result);
  const route = router(result, table);
  const byChannel = new Map<number, { notes: SmfNote[]; at: { tick: number; value: number }[] }>();
  let dropped = 0;
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    for (const r of routesOf(route(e))) {
      const m = midiNote(e, r);
      if (!m) {
        dropped++;
        continue;
      }
      const tick = tickAt(m.at);
      const end = Math.max(tick + 1, tickAt(m.end));
      const track = byChannel.get(m.channel) ?? { notes: [], at: [] };
      byChannel.set(m.channel, track);
      track.notes.push({ channel: m.channel, key: m.note, velocity: m.velocity, tick, end });
      // (a bend where it changes: a note off its key, its glides, and back to the centre for the next one on it)
      const bend = (at: number, value: number) => {
        const before = track.at.length ? track.at[track.at.length - 1].value : BEND_CENTRE;
        if (value !== before) track.at.push({ tick: at, value });
      };
      bend(tick, m.bend);
      for (const b of m.bends) bend(tickAt(b.at), b.value);
    }
  }
  const names = new Map<number, string[]>();
  for (const v of table.voices) names.set(v.channel, [...(names.get(v.channel) ?? []), v.voice]);
  for (const k of table.kits) names.set(k.channel, [...(names.get(k.channel) ?? []), kitName(result, table.kit)]);
  const tracks: SmfTrack[] = [...byChannel]
    .sort(([a], [b]) => a - b)
    .map(([channel, t]) => ({
      name: [...new Set(names.get(channel) ?? [`channel ${channel}`])].join(' '),
      notes: struckOnce(t.notes),
      bends: t.at.map((b) => ({ ...b, channel })),
      programs: [],
    }));
  // (its signature, where the file's quarter, the meter's beat, is the quarter note it says)
  const m = meter ? meterOf(result, meter.cell) : undefined;
  const meters = m && m.unit === 4 && m.beats.every((b) => b === 1) && m.pulses > 0 ? [{ tick: 0, num: m.pulses, den: 4 }] : [];
  return { smf: { format: 1, ppq: PPQ, ...(name !== undefined ? { name } : {}), tracks, tempos, meters }, dropped };
}

/**
 * A track's notes as a key can sound them (#104): a key can't overlap itself, so a note struck while earlier ones hold
 * its channel and key retriggers it, those ending at its start, and it sounds to the latest of their ends and its own:
 * the key is let go when the last note holding it ends, as MIDI out sends it (yggi/webmidi `src/core/out.ts`: off then
 * on, and an off only once nothing else covers it). So a note into the next on its key (`legato=` over 1, two lines on
 * one key) ends at the next one's start. Notes struck at once on one key (a unison) are left as written, each its own
 * note-on and off, so a file read back keeps them (the folder's ratchet). The events keep their lengths: only the file's
 * note-offs move.
 */
function struckOnce(notes: readonly SmfNote[]): SmfNote[] {
  // (each note kept at its place in the track, the place it starts at)
  type Placed = { readonly i: number; readonly note: SmfNote };
  const byKey = new Map<string, number[]>();
  notes.forEach((n, i) => {
    const k = `${n.channel}:${n.key}`;
    byKey.set(k, [...(byKey.get(k) ?? []), i]);
  });
  const placed: Placed[] = [];
  for (const run of byKey.values()) {
    const sorted = [...run].sort((a, b) => notes[a]!.tick - notes[b]!.tick || a - b);
    // (the notes holding the key, all struck at one tick)
    let held: Placed[] = [];
    for (const i of sorted) {
      const n = notes[i]!;
      const end = Math.max(...held.map((h) => h.note.end));
      if (held.length && n.tick === held[0]!.note.tick) held.push({ i, note: n });
      else if (held.length && n.tick < end) {
        placed.push(...held.map((h) => ({ i: h.i, note: { ...h.note, end: n.tick } })));
        held = [{ i, note: { ...n, end: Math.max(end, n.end) } }];
      } else {
        placed.push(...held);
        held = [{ i, note: n }];
      }
    }
    placed.push(...held);
  }
  return placed.sort((a, b) => a.note.tick - b.note.tick || a.i - b.i).map((p) => p.note);
}

/**
 * A kit's track name: its members in order, each with its pitch where it has one of its own (`dundun(C2) shekere`), so
 * a file the app saved opens with the piece's own drums (`midiimport.ts`: the members' notes are `kitNotes` of these
 * names, as MIDI out gave them). A pitch is a key's name, or Hz for one between keys.
 */
function kitName(result: CompileResult, kit: readonly { readonly member: string }[]): string {
  return kit
    .map(({ member }) => {
      const freq = result.cells.get(member)?.freq ?? DEFAULT_FREQ;
      if (!(freq > 0) || Math.abs(freq - DEFAULT_FREQ) < 0.01) return member;
      const { note, cents } = noteOf(freq);
      return `${member}(${Math.abs(cents) < 0.5 && note >= 0 && note <= 127 ? keyName(note) : Number(freq.toPrecision(6))})`;
    })
    .join(' ');
}
