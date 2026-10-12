/**
 * A piece as a MIDI file (#307): its notes as MIDI out sends them (`engine/midi.ts`: the same channel table, routes,
 * keys, velocities and bends; decision 005, what is sent is what sounds), on the main meter's steps (`midiclock.ts`): a
 * quarter note a beat (`beat=` steps), the tempo each step's length, so a scan's or a motor's tempo map is the file's
 * and a note on a step is on the grid (a swing is tempos that alternate, not notes off the grid; a note between steps
 * sits where it sounds). A piece with no main meter is laid at 120 bpm. A piece that ends is written whole; a loop,
 * one cycle (`mainLength`); an hour at most.
 */
import { channelTable, midiNote, routesOf, router, BEND_CENTRE } from './midi';
import { mainMeter } from './midiclock';
import { clocking } from './clocking';
import { mainLength, pieceTime } from './duration';
import { eventsBetween, plan } from './realize';
import type { CompileResult, Shifts } from './program';
import type { Smf, SmfNote, SmfTrack } from './midifile';

/** Ticks a quarter note in a written file. */
const PPQ = 480;
/** A tempo change smaller than this (microseconds a quarter) is rounding, not a change. */
const SAME_TEMPO = 2;
/** At most this long is written (s): a day's piece would be a very long file. */
const LONGEST = 3600;

/** The piece's notes as a MIDI file (to `writeMidi`), and how many notes no MIDI key could carry. */
export function pieceMidi(result: CompileResult, shifts: Shifts, muted: ReadonlySet<string> = result.off, name?: string): { smf: Smf; dropped: number } {
  const p = plan(result, shifts, muted);
  const seconds = Math.min(LONGEST, Number.isFinite(p.end) ? p.end : (mainLength(pieceTime(result)) ?? 60));
  // (each note with its output: the router reads a kit's from it)
  const events = eventsBetween(p, 0, seconds, true);

  // the meter's steps, through its time map, as far as the last note sounds (or eighths at 120 bpm), each a fixed
  // number of ticks (a beat a quarter note) and the tempo its length: a note on a step falls on the grid
  const meter = mainMeter(result);
  const map = meter ? clocking(result, p.statics).map(meter.cell) : null;
  const perBeat = meter?.beat ?? 4;
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
  if (table.kit.length) names.set(table.kitChannel ?? 10, [...(names.get(table.kitChannel ?? 10) ?? []), table.kit.map((k) => k.member).join(' ')]);
  const tracks: SmfTrack[] = [...byChannel]
    .sort(([a], [b]) => a - b)
    .map(([channel, t]) => ({
      name: [...new Set(names.get(channel) ?? [`channel ${channel}`])].join(' '),
      notes: t.notes,
      bends: t.at.map((b) => ({ ...b, channel })),
      programs: [],
    }));
  return { smf: { format: 1, ppq: PPQ, ...(name !== undefined ? { name } : {}), tracks, tempos, meters: [] }, dropped };
}
