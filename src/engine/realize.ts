/**
 * From a compiled program + shifts to sound: the plan (every output's braid
 * flattened, once) and the notes that start in a window (`eventsBetween`).
 * Times are seconds at the code's rates; the transport scales them (tempo
 * control). Pitches become frequencies: a voice steps at its own rate ×
 * 2^(semitones/12). When clocks step is in `clocking.ts`, the braids as
 * numbers in `flatten.ts`, streams of values over a note in `series.ts`.
 */
import type { Pick } from './ast';
import { SECONDS_PER_STEP as LAW_SPS, START as LAW_START, notesBetween as lawNotes } from './fiveto12';
import { adsrOf, balance, type CompileResult, type Output, type Shifts } from './program';
import { tableChain } from './helix';
import { clocking, EPS, playedCells, tapeMotion, varispeedOf } from './clocking';
import { ExpansionLimit, flatten, stepsOf, type StepEvent } from './flatten';
import { cellId } from './ids';
import { refsOf } from './readers';
import { levelSeries, modulation, paramTracks, pitchOf, valueThen, type ParamTrack, type Series, type VoiceParam } from './series';
import { warpOf } from './physics';
import { mod } from '../theory/modes';

export interface Played {
  /** Absolute start in seconds at the code's rates. */
  readonly at: number;
  /** Its start in the code's seconds when `at` is on another clock (`retime` keeps it): what a note's own chance is keyed on, so a live play and a render agree. */
  readonly code?: number;
  readonly dur: number;
  /** Voice cell that sounds it, and at what frequency (modulation at the start included). */
  readonly voice: string;
  readonly freq: number;
  /** Pitch changes while it sounds, from modulating terms: cents relative to the start (ramp: glide there). */
  readonly bends: readonly { readonly at: number; readonly cents: number; readonly ramp?: boolean }[];
  /** Level per channel [left, right], from the mixes. */
  readonly gains: readonly [number, number];
  /** Volume over the note: its level at the start, then each change (volume streams, a gate). */
  readonly levels: readonly { readonly at: number; readonly level: number; readonly ramp?: boolean }[];
  /** The instrument (a mix used like a voice) it plays through, if any. */
  readonly instrument?: string;
  /** Its voice's moving parameters over the note (lpf=200..3000 * &fenv …). */
  readonly params?: Readonly<Record<string, ParamTrack>>;
  /** The value that started it (a resonator reads it as where it's struck). */
  readonly value?: number;
  /** Its envelope (map=adsr, seconds), or absent for the voice's own. */
  readonly env?: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };
  /** Sent on a MIDI card, and heard on no sound card: the voices leave it out, MIDI out sends it. */
  readonly unheard?: true;
  /** The MIDI cards' entries it goes out on (those switched on): MIDI out sends it there and nowhere else. */
  readonly midi?: Output['midi'];
  /** The output it comes from (`Output.id`), when asked for (`eventsBetween(…, true)`): which mixes' wheels hear it (audio/wiring.ts `taps`). */
  readonly output?: string;
}

interface PlanTrack extends Series {
  readonly output: Output;
  readonly clock: string;
  readonly mods: readonly Series[];
  /** Volume streams (map=amp). */
  readonly levels: readonly Series[];
  /** The selectors it plays through, with the entry that picks it (and how many entries they read). */
  readonly selects: readonly { readonly series: Series; readonly entry: number; readonly entries: number }[];
  /** When it stops, in seconds (laps= on a cell that drives it); Infinity if it loops. */
  readonly end: number;
}

/** The static part of playback (braids flattened); pitches are resolved per moment. */
export interface Plan {
  readonly result: CompileResult;
  readonly statics: Shifts;
  readonly muted: ReadonlySet<string>;
  readonly tracks: readonly PlanTrack[];
  readonly played: ReadonlySet<string>;
  /** Each voice's moving parameters: their cells as series (an envelope among them, apart). */
  readonly voiceParams: ReadonlyMap<string, Readonly<Record<string, VoiceParam>>>;
  /** When the piece ends, in seconds: the last track's end — Infinity if anything loops (or nothing plays). */
  readonly end: number;
}

/**
 * When an output stops: laps= on its cell, the chain of cells that step it, its
 * clock, or a selector it plays through — the earliest of those. Infinity: it loops.
 */
export function endOf(result: CompileResult, statics: Shifts, o: Output): number {
  const clk = clocking(result, statics);
  const seen = new Set<string>();
  const ends: number[] = [];
  const visit = (name: string | null | undefined) => {
    for (let guard = 0; name && !seen.has(name) && guard < 32; guard++) {
      seen.add(name);
      const c = result.cells.get(name);
      if (!c) return;
      if (c.laps && c.clock) ends.push(clk.map(c.clock).q((c.laps * Math.max(1, stepsOf(result, name, null))) / c.rate));
      if (c.clock && c.clock !== name) visit(c.clock);
      name = c.step?.driver;
    }
  };
  visit(o.cell);
  for (const x of o.select) visit(x.cell);
  return ends.length ? Math.min(...ends) : Infinity;
}

/** A number in [0, 1) from a text: the same text, the same number (cyrb53). */
export function chanceOf(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0) * 2 ** 21 + (h1 >>> 11)) / 2 ** 53;
}

/**
 * Chance, thrown: is this step dropped this time round (x?p: it sounds if the throw is under 1 − p), and which does it
 * choose ([a|b|c])? Reproducible — the same cell, voice, lap and step always
 * throw the same — and different each lap. A chord's notes share their step,
 * so they sound or rest together.
 */
function thrown(result: CompileResult, t: PlanTrack, e: StepEvent, lap: number): StepEvent | null {
  if (e.chance === undefined && !e.options) return e;
  const key = `${result.cells.get(t.output.cell)?.seed ?? 0}|${t.output.cell}|${t.output.voice}|${lap}|${e.step.toFixed(6)}`;
  if (e.chance !== undefined && chanceOf(`${key}|sounds`) >= 1 - e.chance) return null;
  if (!e.options) return e;
  const o = e.options[Math.floor(chanceOf(`${key}|picks`) * e.options.length)];
  return { ...e, value: o.value, alter: o.alter };
}

/** The entries a selector picks right now. */
export function picksNow(result: CompileResult, statics: Shifts, name: string, seconds: number): Set<number> {
  const c = result.cells.get(name);
  const entries = result.cells.get(c?.over ?? '')?.units.length ?? 0;
  if (!c?.clock || entries === 0) return new Set();
  const period = Math.max(1, stepsOf(result, name, null));
  const local = mod(clocking(result, statics).map(c.clock).stepAt(seconds) * c.rate, period);
  const out = new Set<number>();
  for (const e of flatten(result, name, statics, null)) if (local >= e.step - EPS && local < e.step + e.duration - EPS) out.add(mod(Math.round(e.value + e.alter), entries));
  return out;
}

/**
 * When a selector picks an entry, in [from, to): its windows, in seconds. Reading a
 * table of parts splices: each window is where the picked part starts again.
 */
function windowsOf(p: Plan, sel: PlanTrack['selects'][number], from: number, to: number): { a: number; b: number }[] {
  const m = sel.series;
  if (!m.clock || m.events.length === 0) return [];
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { a: number; b: number }[] = [];
  for (let lap = Math.floor(c0 / m.period) - 1; lap * m.period < c1; lap++)
    for (const e of m.events) {
      if (mod(Math.round(e.value + e.alter), sel.entries) !== sel.entry) continue;
      const s0 = lap * m.period + e.step;
      const s1 = s0 + e.duration;
      if (s1 <= c0 + EPS || s0 >= c1 - EPS) continue;
      out.push({ a: tm.q(s0 / m.rate), b: tm.q(s1 / m.rate) });
    }
  return out.sort((x, y) => x.a - y.a);
}

export const chainMuted = (result: CompileResult, table: string, muted: ReadonlySet<string>) => tableChain(result, table).some((c) => muted.has(cellId(c)));

/** Is anything in a cell's chain of step= drivers switched off (&t steps by &swing, &swing by &bar …)? */
const driverMuted = (result: CompileResult, name: string, muted: ReadonlySet<string>) => {
  let c = result.cells.get(name);
  for (let guard = 0; c?.step && guard < 32; guard++) {
    if (muted.has(cellId(c.step.driver))) return true;
    c = result.cells.get(c.step.driver);
  }
  return false;
};

/** An output's level per channel, leaving out mixes (or sound cards) that are switched off. */
export function liveGains(o: Output, muted: ReadonlySet<string>): [number, number] {
  // a send (a mix played only into a resonator or a tape): its own gain, unless its mix is off
  // (a MIDI card it is also on takes nothing away from what it feeds)
  if (o.silent) return o.via.some((m) => muted.has(cellId(m)) && !o.midi?.some((d) => d.card === m)) ? [0, 0] : [o.gains[0], o.gains[1]];
  return partsGains(o.parts, muted);
}

/** What a read head's return or a resonator ringing alone in a mix reaches the sound card at, with what is switched off. */
export function returnGains(x: { readonly parts: Output['parts']; readonly through: Output['through'] }, muted: ReadonlySet<string>): [number, number] {
  return x.through.some((t) => muted.has(cellId(t))) ? [0, 0] : partsGains(x.parts, muted);
}

/** Gains summed over the mixes and sound cards they go through that are on (an output's, a read head's return, a resonator ringing in a mix). */
function partsGains(parts: Output['parts'], muted: ReadonlySet<string>): [number, number] {
  const g: [number, number] = [0, 0];
  for (const p of parts)
    if (!muted.has(cellId(p.mix)) && !muted.has(cellId(p.sink))) {
      g[0] += p.gains[0];
      g[1] += p.gains[1];
    }
  return g;
}

/** Is it heard: on, and reaching a sound card through what is on (a send: into what it feeds)? */
export function outputSounds(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean {
  if (!outputOn(result, o, muted)) return false;
  const g = liveGains(o, muted);
  return g[0] > 0 || g[1] > 0;
}

/** Does it play at all: heard (`outputSounds`), or sent on a MIDI card that is on (`outputSent`)? What the plan plays. */
export function outputPlays(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean {
  if (!outputOn(result, o, muted)) return false;
  const g = liveGains(o, muted);
  return g[0] > 0 || g[1] > 0 || outputSent(o, muted);
}

/** Its MIDI cards' entries that are on (the card, and a mix named as the entry); none: it isn't sent. */
function liveMidi(o: Output, muted: ReadonlySet<string>): NonNullable<Output['midi']> {
  return (o.midi ?? []).filter((m) => !muted.has(cellId(m.card)) && !(m.mix && muted.has(cellId(m.mix))));
}
const outputSent = (o: Output, muted: ReadonlySet<string>) => liveMidi(o, muted).length > 0;

/** Its notes can play: nothing they need (its cells, clocks, instruments, envelope, selectors) is switched off. */
function outputOn(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean {
  if (muted.has(cellId(o.voice)) || muted.has(cellId(o.cell))) return false;
  const c = result.cells.get(o.cell);
  if (!c?.clock || chainMuted(result, c.clock, muted) || driverMuted(result, o.cell, muted)) return false;
  // the instruments it plays through (and its envelope) must be on, and it has to reach a sound card through a mix that's on
  if (o.through.some((t) => muted.has(cellId(t))) || (o.envelopeCell && muted.has(cellId(o.envelopeCell)))) return false;
  // a selector, its table or the part switched off: silent
  if (o.select.some((x) => muted.has(cellId(x.cell)) || muted.has(cellId(x.part)) || muted.has(cellId(result.cells.get(x.cell)!.over!)))) return false;
  // … or the score it reads (what its steps are spliced from)
  if (o.select.some((x) => [...result.cells.get(x.cell)!.children.keys()].some((c) => muted.has(cellId(c))))) return false;
  return true;
}

/** What to play. A program with errors plays nothing: it may name cells it doesn't have. */
export function plan(result: CompileResult, statics: Shifts, muted: ReadonlySet<string> = new Set()): Plan {
  if (!result.ok) return { result, statics, muted, tracks: [], played: new Set(), voiceParams: new Map(), end: Infinity };
  const tracks: PlanTrack[] = [];
  const voiceParams = new Map<string, Record<string, VoiceParam>>();
  for (const o of result.outputs) {
    if (!outputPlays(result, o, muted)) continue;
    const c = result.cells.get(o.cell)!;
    const series = (cell: string, pick: Pick | null, shift: number, sign: 1 | -1): Series => {
      const m = result.cells.get(cell)!;
      const events = muted.has(cellId(cell)) ? [] : flatten(result, cell, statics, pick, (n) => muted.has(cellId(n)), shift).filter((e) => !chainMuted(result, e.table, muted));
      return { sign, lin: m.map?.kind === 'lin', db: m.map?.kind === 'db', clock: m.clock, rate: m.rate, period: Math.max(1, stepsOf(result, cell, pick)), events };
    };
    try {
      const main = series(o.cell, o.pick, o.shift, o.sign);
      // the voices' moving parameters (lpf=200..3000 * &fenv …): their cells, as series
      for (const voice of o.kit ? refsOf(result.cells.get(o.voice)) : [o.voice]) {
        if (voiceParams.has(voice)) continue;
        const vc = result.cells.get(voice);
        const out: Record<string, VoiceParam> = {};
        for (const [key, pc] of Object.entries(vc?.paramCells ?? {})) {
          const envCell = pc.factors.find((f) => result.cells.get(f)?.map?.kind === 'adsr');
          out[key] = {
            range: pc.range,
            series: pc.factors.filter((f) => f !== envCell).map((f) => series(f, null, 0, 1)),
            env: envCell ? adsrOf(result.cells.get(envCell)!) : null,
          };
        }
        voiceParams.set(voice, out);
      }
      const mods = o.mods.map((t) => series(t.cell, t.pick, t.shift, t.sign)).filter((m) => m.events.length > 0);
      const levels = o.levels.map((t) => series(t.cell, t.pick, t.shift, t.sign));
      const selects = o.select.map((x) => ({
        series: series(x.cell, null, 0, 1),
        entry: x.entry,
        entries: result.cells.get(result.cells.get(x.cell)!.over!)!.units.length,
      }));
      if (main.events.length) tracks.push({ ...main, output: o, clock: c.clock!, mods, levels, selects, end: endOf(result, statics, o) });
    } catch (e) {
      if (!(e instanceof ExpansionLimit)) throw e;
    }
  }
  const ends = tracks.map((t) => t.end);
  // a clock that runs down (wind=) ends the piece where it comes to rest
  let stops = -Infinity;
  for (const c of result.clocks.values()) {
    const at = warpOf(result, c.cell)?.stopsAt();
    if (at != null) stops = Math.max(stops, at);
  }
  const lapsEnd = ends.length ? Math.max(...ends) : Infinity;
  return { result, statics, muted, tracks, played: playedCells(result), voiceParams, end: Math.min(lapsEnd, stops > -Infinity ? stops : Infinity) };
}

/**
 * The envelope a kit's member brings with it (its own env=&adsr). A voice played directly gets its env= folded
 * into the product it is in; a kit is a table of voices picked per note, so the picked member's own is read here.
 */
function memberEnvelope(result: CompileResult, voice: string) {
  const name = result.cells.get(voice)?.env;
  const cell = name ? result.cells.get(name) : undefined;
  return cell?.map?.kind === 'adsr' ? adsrOf(cell) : null;
}

/** Which voice a number plays on, and that voice's base frequency. */
export function voiceFor(result: CompileResult, o: Output, value: number): { voice: string; freq: number } | null {
  if (!o.kit) return { voice: o.voice, freq: result.cells.get(o.voice)!.freq };
  const kit = result.cells.get(o.voice)!;
  const u = kit.units[mod(Math.round(value), kit.units.length)];
  if (u?.atom.kind !== 'ref') return null;
  return { voice: u.atom.name, freq: result.cells.get(u.atom.name)!.freq };
}

/**
 * A law's steps ahead of play (law=fiveto12 over=&day): where its day stands when play starts, against 11:55, the
 * moment its day begins; 0 without a day, or with a day that starts there.
 */
function lawOffset(result: Plan['result'], cell: string): number {
  const day = result.cells.get(result.cells.get(cell)?.over ?? '');
  const anchor = day?.params.anchor;
  if (typeof anchor !== 'number') return 0;
  const sec = (h: number) => Math.floor(h) * 3600 + Math.round((h % 1) * 100) * 60;
  return Math.round(((((sec(anchor) - LAW_START) % 86400) + 86400) % 86400) / LAW_SPS);
}

/**
 * Everything that starts in [from, to). The triggering term's pitch (tables as
 * they stand at that moment) plus every modulating term sets the voice's rate:
 * freq = voice rate × 2^(semitones / 12). Kits take the number as an index.
 * `outputs`: each note names the output it comes from (for the audio: which mixes' wheels hear it); left out,
 * a note is only what sounds.
 */
export function eventsBetween(p: Plan, from: number, to: number, outputs = false): Played[] {
  // (a law's cell plays only what its law computes — not its steps counted as values)
  const lawful = (t: PlanTrack) => p.result.cells.get(t.output.cell)?.params.law !== undefined;
  const plain = p.tracks.filter((t) => !t.output.tape && !lawful(t));
  const taped = p.tracks.filter((t) => t.output.tape);
  const out = plainEvents({ ...p, tracks: plain }, from, to, outputs);
  // a law (law=fiveto12): its notes computed, not written — any moment of its day at once
  for (const o of p.result.outputs) {
    if (p.result.cells.get(o.cell)?.params.law !== 'fiveto12') continue;
    const g = liveGains(o, p.muted);
    // (on a MIDI card too: its notes are sent there, and heard only if a sound card hears them)
    const midi = o.midi ? liveMidi(o, p.muted) : [];
    const heard = g[0] > 0 || g[1] > 0;
    if (!heard && !midi.length) continue;
    const base = p.result.cells.get(o.voice)?.freq || 261.63;
    // (it reads the day it plays in, over=&day: where that day stands when play starts, against the law's own 11:55)
    const off = lawOffset(p.result, o.cell);
    for (const n of lawNotes(Math.ceil(from / LAW_SPS - 1e-9) + off, Math.ceil(to / LAW_SPS - 1e-9) + off)) {
      const at = (n.step - off) * LAW_SPS;
      out.push({
        at,
        dur: n.dur * LAW_SPS,
        voice: o.voice,
        freq: base * Math.pow(2, n.semis / 12),
        bends: [],
        gains: [g[0] * Math.min(1, 1 - n.pan), g[1] * Math.min(1, 1 + n.pan)],
        levels: [{ at, level: n.level }],
        ...(heard ? {} : { unheard: true as const }),
        ...(midi.length ? { midi } : {}),
        ...(outputs ? { output: o.id } : {}),
      });
    }
  }
  if (!taped.length) return out;
  // a tape: what its write head records passes a read head d tape-seconds on, when the tape has moved
  // that far — and on a loop of length L again every L, (1 − erase) as loud each pass under the write
  // head. The tape moves with its clock (a meter, a belt: physics and hands and all); pos(t), how far.
  const clk = clocking(p.result, p.statics);
  for (const t of taped) {
    const tp = t.output.tape!;
    const tc = p.result.cells.get(tp.tape);
    const { pos, real, speed, moving: m } = tapeMotion(p.result, clk, tp.tape);
    const vari = typeof tc?.params.varispeed === 'number' ? tc.params.varispeed : 0;
    const keep = 1 - tp.erase;
    const passes = tp.length > 0 ? Math.min(40, keep > 0 ? Math.ceil(Math.log(0.02) / Math.log(keep)) : 1) : 1;
    const source = { ...t, output: { ...t.output, tape: undefined } };
    for (let k = 0; k < passes; k++) {
      const shift = tp.at + k * tp.length;
      const g = Math.pow(keep, k);
      const s0 = real(pos(from) - shift);
      const s1 = real(pos(to) - shift);
      if (!(s1 > 0) || !Number.isFinite(s1)) continue;
      const through = (x: number) => real(pos(x) + shift);
      for (const e of plainEvents({ ...p, tracks: [source] }, Math.max(0, s0), s1, outputs)) {
        const at = through(e.at);
        if (!(at >= from && at < to) || !Number.isFinite(at)) continue;
        const end = through(e.at + e.dur);
        // (a tape at a standstill records nothing; and its pitch moves two octaves at most, either way)
        if (m && speed(e.at) < 0.05) continue;
        const ratio = vari ? Math.min(4, Math.max(0.25, Math.pow(speed(at) / speed(e.at), vari))) : 1;
        out.push({
          ...e,
          at,
          dur: Math.max(0.01, (Number.isFinite(end) ? end : at + e.dur) - at),
          freq: e.freq * ratio,
          bends: e.bends.map((b) => ({ ...b, at: through(b.at) })),
          levels: e.levels.map((l) => ({ ...l, at: through(l.at) })),
          gains: [e.gains[0] * g, e.gains[1] * g],
          ...(e.params
            ? {
                params: Object.fromEntries(
                  Object.entries(e.params).map(([key, tr]) => [key, tr.kind === 'points' ? { ...tr, points: tr.points.map((x) => ({ ...x, at: through(x.at) })) } : tr]),
                ),
              }
            : {}),
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function plainEvents(p: Plan, from: number, to: number, outputs: boolean): Played[] {
  const out: Played[] = [];
  const { result, statics } = p;
  const clk = clocking(result, statics);
  for (const t of p.tracks) {
    const tm = clk.map(t.clock);
    const until = Math.min(to, t.end); // laps=: nothing after its end
    if (until <= from) continue;
    const c0 = tm.stepAt(Math.max(0, from)) * t.rate;
    const c1 = tm.stepAt(Math.max(0, until)) * t.rate;
    if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 <= c0) continue; // (a clock gone wild: nothing from it)
    // a note at step s, lasting until step `upto` (a window's end cuts it)
    const emit = (s: number, e: StepEvent, upto: number) => {
      const at = tm.q(s / t.rate);
      if (!Number.isFinite(at)) return; // (a clock run down: this step never comes)
      if (at >= t.end - EPS) return;
      // (a note whose clock stops beneath it never reaches its end: it rings 8 s at most)
      const ends = Math.min(tm.q(upto / t.rate), t.end);
      const dur = Number.isFinite(ends) ? ends - at : 8;
      const v = voiceFor(result, t.output, e.value);
      if (!v || p.muted.has(cellId(v.voice))) return;
      // a gate starts notes at pitch 0, at its own level
      let semis = t.output.kit || t.output.gate ? t.output.offset : t.sign * pitchOf(p, e, at) + t.output.offset;
      // modulation: the sum at the start sets the pitch; later changes become bends
      const bends: { at: number; cents: number; ramp?: boolean }[] = [];
      if (!t.output.kit && t.mods.length) {
        const series = t.mods.map((m) => modulation(p, m, at, at + dur));
        const start = series.reduce((a, s) => a + s[0].semis, 0);
        semis += start;
        const times = [...new Set(series.flatMap((s) => s.slice(1).map((x) => x.at)))].sort((a, b) => a - b);
        for (const time of times) {
          // a ramped term ramps the whole sum to here; held ones step
          const ramp = series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS));
          const total = series.reduce((a, s) => a + valueThen(s, time, (x) => x.semis), 0);
          bends.push({ at: time, cents: 100 * (total - start), ...(ramp ? { ramp } : {}) });
        }
      }
      // varispeed: on a physical clock that asks for it, pitch follows its speed — as tape does
      const vs = varispeedOf(result, t.clock);
      if (vs && tm.speed && !t.output.kit && !t.output.gate) {
        const sp = (x: number) => Math.max(1e-3, tm.speed!(x));
        const s0 = sp(at);
        if (s0 < 0.05) return; // (tape at a standstill: nothing sounds)
        semis += 12 * vs * Math.log2(s0);
        if (!bends.length)
          for (let x = at + 0.04, n = 0; x < at + dur && n < 400; x += 0.04, n++) {
            const cents = 1200 * vs * Math.log2(sp(x) / s0);
            if (Math.abs(cents) > 1) bends.push({ at: x, cents, ramp: true });
          }
      }
      // volume: the product of the streams (and a gate's own value), over the note
      const own = t.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter);
      const level: { at: number; level: number; ramp?: boolean }[] = [{ at, level: t.output.gate ? own : 1 }];
      if (t.levels.length) {
        const series = t.levels.map((m) => levelSeries(p, m, at, at + dur));
        const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
        const base = level[0].level;
        level.length = 0;
        for (const time of times)
          level.push({
            at: time,
            level: base * series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1),
            ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
          });
      }
      const freq = v.freq * Math.pow(2, semis / 12);
      const params = paramTracks(p, v.voice, at, dur);
      const env = t.output.envelope ?? (t.output.kit ? memberEnvelope(result, v.voice) : null);
      // a kit's member placed by its own pan= (a voice's own is in its output's gains already)
      const memberPan = (g: [number, number]): [number, number] => {
        if (!t.output.kit) return g;
        const [l, r] = balance(result.cells.get(v.voice)?.params.pan);
        return [g[0] * l, g[1] * r];
      };
      const gains = memberPan(liveGains(t.output, p.muted));
      const midi = t.output.midi ? liveMidi(t.output, p.muted) : [];
      if (freq > 0 && freq < 20000 && level.some((l) => l.level > 0))
        out.push({
          at,
          dur,
          voice: v.voice,
          freq,
          bends,
          value: e.value + e.alter,
          gains,
          levels: level,
          // (on MIDI cards only, or its sound card switched off: sent, not heard)
          ...(!t.output.silent && !(gains[0] > 0 || gains[1] > 0) ? { unheard: true as const } : {}),
          ...(midi.length ? { midi } : {}),
          ...(env ? { env } : {}),
          ...(t.output.through.length ? { instrument: t.output.through[0] } : {}),
          ...(params ? { params } : {}),
          ...(outputs ? { output: t.output.id } : {}),
        });
    };
    if (t.selects.length === 0) {
      for (let lap = Math.floor(c0 / t.period) - 1; lap * t.period < c1; lap++)
        for (const e of t.events) {
          const s = lap * t.period + e.step;
          if (s < c0 - EPS || s >= c1 - EPS) continue;
          const r = thrown(result, t, e, lap);
          if (r) emit(s, r, s + e.duration);
        }
      continue;
    }
    // picked by selectors: where they all pick it, starting again from its beginning (reading a table splices)
    let windows = windowsOf(p, t.selects[0], from, until);
    for (const sel of t.selects.slice(1)) {
      const other = windowsOf(p, sel, from, until);
      windows = windows.flatMap((w) => other.flatMap((x) => (Math.max(w.a, x.a) < Math.min(w.b, x.b) ? [{ a: Math.max(w.a, x.a), b: Math.min(w.b, x.b) }] : [])));
    }
    for (const w of windows) {
      const sA = tm.stepAt(w.a) * t.rate;
      const sB = tm.stepAt(w.b) * t.rate;
      const lo = Math.max(c0, sA);
      const hi = Math.min(c1, sB);
      if (hi <= lo) continue;
      for (let lap = Math.floor((lo - sA) / t.period) - 1; sA + lap * t.period < hi; lap++)
        for (const e of t.events) {
          const s = sA + lap * t.period + e.step;
          if (lap < 0 || s < lo - EPS || s >= hi - EPS) continue;
          const r = thrown(result, t, e, lap);
          if (r) emit(s, r, Math.min(s + e.duration, sB));
        }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
