/**
 * MIDI out, the pure part (#205): a played note (`Played`, realize.ts) as MIDI — its note and the cents it is off a
 * key, its velocity, its pitch bends — and which channel each voice of a piece goes to, with a kit's members on
 * channel 10 under General MIDI drum notes picked by their names. Sending it, at the right moment and with the
 * note-offs worked out, is the browser's business (`src/midi/out.ts`).
 *
 * Two ways a piece's notes find their channels (decision 019): a piece with MIDI cards (map=midi) says it — each note
 * goes where its cards' entries say (`Played.midi`), on their channels and output slots, and nothing else is sent; a
 * piece with none goes out as the app's default output, every voice heard on a channel of its own in the order the
 * piece declares them, which the MIDI page can change and this browser keeps (docs/ui/midi.md).
 */
import type { Played } from './realize';
import { isMidiCard, type CompileResult, type Output } from './program';

/** The channel a kit's members play on (General MIDI drums), 1–16. */
const DRUM_CHANNEL = 10;
/** The bend range most synths start with, in semitones each way; an MPE synth takes 48. */
export const DEFAULT_BEND_RANGE = 2;
/** A pitch bend's centre: no bend. */
export const BEND_CENTRE = 8192;
/** How finely a glide (a ramped bend) is sampled into bend messages, in seconds. */
const BEND_STEP = 0.02;
/** Cents off a key that count as on it (a frequency's rounding): no bend is sent for less. */
const IN_TUNE = 0.5;

/** A frequency as the MIDI note nearest it, tuned from A4 (note 69), and the cents it is above that note (−50 … 50). */
export function noteOf(freq: number, a4 = 440): { note: number; cents: number } {
  const n = 69 + 12 * Math.log2(freq / a4);
  const note = Math.round(n);
  return { note, cents: (n - note) * 100 };
}

/** Cents of bend as a 14-bit pitch-bend value (0 … 16383, 8192 the centre) on a synth bending `range` semitones each way. */
export function bendValue(cents: number, range = DEFAULT_BEND_RANGE): number {
  if (!Number.isFinite(cents)) return BEND_CENTRE;
  const v = Math.round(BEND_CENTRE + (cents / (100 * range)) * BEND_CENTRE);
  return Math.max(0, Math.min(16383, v));
}

/** A pitch-bend message on a channel (1–16). */
export const bendMessage = (channel: number, value: number): number[] => [0xe0 | ((channel - 1) & 15), value & 0x7f, (value >> 7) & 0x7f];

/**
 * How hard a note is struck, 1 … 127: its level at its start times the louder of its two channels' gains (on a MIDI
 * card, the gain of its product there). Synths
 * mostly turn velocity into amplitude on a square law, so the velocity is the square root of that amplitude.
 */
export function velocityOf(e: Pick<Played, 'gains' | 'levels'>, gain = Math.max(e.gains[0], e.gains[1])): number {
  const level = e.levels[0]?.level ?? 1;
  const amp = Math.max(0, level * gain);
  const v = Math.round(127 * Math.sqrt(Math.min(1, amp)));
  return Math.max(1, Math.min(127, Number.isFinite(v) ? v : 1));
}

/**
 * The General MIDI drum note for a kit member's name (lower case, a trailing number ignored: `bd2` is a kick), or
 * null for a name it doesn't know.
 */
const GM_DRUMS: Readonly<Record<string, number>> = {
  bd: 36,
  kick: 36,
  kd: 36,
  rim: 37,
  rs: 37,
  sd: 38,
  snare: 38,
  cp: 39,
  clap: 39,
  hh: 42,
  ch: 42,
  ph: 44,
  oh: 46,
  crash: 49,
  cr: 49,
  ride: 51,
  rd: 51,
  lt: 41,
  lo: 41,
  tom: 45,
  mt: 45,
  mid: 45,
  ht: 48,
  hi: 48,
};
export function gmDrumNote(name: string): number | null {
  return GM_DRUMS[name.toLowerCase().replace(/\d+$/, '')] ?? null;
}

/**
 * Each kit member's drum note: by its name where General MIDI has one (`gmDrumNote`), else the next note from 36
 * that no other member has, up to 127 (a member past that has none, and isn't sent).
 */
export function kitNotes(members: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of members) {
    const n = gmDrumNote(m);
    if (n !== null) out.set(m, n);
  }
  const taken = new Set(out.values());
  let next = 36;
  for (const m of members) {
    if (out.has(m)) continue;
    while (next <= 127 && taken.has(next)) next++;
    if (next > 127) break;
    out.set(m, next);
    taken.add(next);
  }
  return out;
}

/**
 * Where a piece's notes go: each gate (all its receivers) and each voice it plays directly on a channel, each kit member
 * on the kit's channel (10 unless chosen) with a note.
 */
export interface ChannelTable {
  /**
   * The gates and the voices played directly, in the order the piece declares them, each on its channel (1–16); set by the piece
   * (its MIDI cards), each on every channel and output slot (1 the default output) its cards put it on.
   */
  readonly voices: readonly { readonly voice: string; readonly channel: number; readonly port?: number }[];
  /** The kits' members, in the order the piece declares them, each with its General MIDI drum note. */
  readonly kit: readonly { readonly member: string; readonly note: number }[];
  /** The channel the kits' members go on (1–16; 10, General MIDI's, unless chosen). Absent on a piece's MIDI cards: they say it. */
  readonly kitChannel?: number;
  /** Set by the piece: its MIDI cards say where each note goes (the channels above can't be chosen by hand). */
  readonly byPiece?: true;
  /** The output slots its MIDI cards name, in order (none: the default output alone). */
  readonly ports?: readonly number[];
}

/** Does the piece name its MIDI channels itself (a MIDI card, map=midi)? */
const hasMidiCards = (result: CompileResult): boolean => [...result.cells.values()].some((c) => isMidiCard(c));

const byPlace = (result: CompileResult) => (a: string, b: string) => {
  const sa = result.cells.get(a)?.span;
  const sb = result.cells.get(b)?.span;
  return (sa?.line ?? Infinity) - (sb?.line ?? Infinity) || (sa?.col ?? 0) - (sb?.col ?? 0);
};

/** The melodic channels in the order voices take them: 1, 2, 3 … skipping the kit's (10), round again past 16. */
export const melodicChannel = (i: number, kit: number = DRUM_CHANNEL): number => {
  const k = i % 15;
  return k < kit - 1 ? k + 1 : k + 2;
};

/** A kit's members, as the voices its braid names. */
const membersOf = (result: CompileResult, o: Output): string[] => (result.cells.get(o.voice)?.units ?? []).flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []));

/** The gate an output plays through (docs/language/mix.md: a gate), if any: its notes go out as the gate's. */
const gateOf = (result: CompileResult, o: Output): string | undefined => [...o.through, ...o.via].find((n) => !!result.cells.get(n)?.gate);

/** What an output's channel is kept under: its gate, else its voice. */
const channelKey = (result: CompileResult, o: Output): string => gateOf(result, o) ?? o.voice;

/**
 * The channel table of a piece: the gates and the voices it plays directly (a gate's receivers go out on its channel,
 * as one part: a doubling is the synth's to layer) numbered 1, 2, 3 … in the order it declares them, skipping the kit's
 * channel, which its kits' members share (10, or `kitChannel`: chosen in the MIDI page). `kept`: channels chosen by hand
 * for some voices (the page), which win. A send (a voice played only into a resonator or a tape) is not heard from itself
 * and is left out.
 */
export function channelTable(result: CompileResult, kept: Readonly<Record<string, number>> = {}, kitChannel: number = DRUM_CHANNEL): ChannelTable {
  if (hasMidiCards(result)) return cardTable(result);
  const voices = new Set<string>();
  const members = new Set<string>();
  for (const o of result.outputs) {
    if (o.silent) continue;
    if (o.kit) for (const m of membersOf(result, o)) members.add(m);
    else voices.add(channelKey(result, o));
  }
  const order = byPlace(result);
  const notes = kitNotes([...members].sort(order));
  const kit = validChannel(kitChannel) ?? DRUM_CHANNEL;
  return {
    voices: [...voices].sort(order).map((voice, i) => ({ voice, channel: validChannel(kept[voice]) ?? melodicChannel(i, kit) })),
    kit: [...notes].map(([member, note]) => ({ member, note })),
    kitChannel: kit,
  };
}

/**
 * The channel table a piece's MIDI cards set: every voice they name on each of its channels and output slots, a kit's
 * members with their drum notes (on the channel its card gives the kit, 10 or another). What no card names isn't sent.
 */
function cardTable(result: CompileResult): ChannelTable {
  const order = byPlace(result);
  const voices = new Map<string, { voice: string; channel: number; port: number }>();
  const members = new Set<string>();
  const ports = new Set<number>();
  for (const o of result.outputs)
    for (const m of o.midi ?? []) {
      ports.add(m.port);
      if (o.kit) for (const k of membersOf(result, o)) members.add(k);
      else voices.set(`${o.voice}|${m.channel}|${m.port}`, { voice: o.voice, channel: m.channel, port: m.port });
    }
  for (const c of result.cells.values()) if (c.map?.kind === 'midi') ports.add(c.map.port);
  const notes = kitNotes([...members].sort(order));
  return {
    voices: [...voices.values()].sort((a, b) => order(a.voice, b.voice) || a.port - b.port || a.channel - b.channel),
    kit: [...notes].map(([member, note]) => ({ member, note })),
    byPiece: true,
    ports: [...ports].sort((a, b) => a - b),
  };
}

const validChannel = (c: number | undefined) => (typeof c === 'number' && Number.isInteger(c) && c >= 1 && c <= 16 ? c : null);

/**
 * Where one note goes: a channel (1–16), and for a kit's member its drum note; on a MIDI card, its output slot and the
 * gain of its product there (velocity reads it instead of the sound card's gains). Null: it isn't sent.
 */
export type Route = { readonly channel: number; readonly drum: number | null; readonly port?: number; readonly gain?: number } | null;

/** Where a note goes: one place, none (null), or, on MIDI cards, every entry it is on. */
export type Routes = Route | readonly NonNullable<Route>[];

/** Where a note goes, as a list: every place, none for a note that isn't sent. */
export const routesOf = (r: Routes): readonly NonNullable<Route>[] => (r === null ? [] : Array.isArray(r) ? r : [r as NonNullable<Route>]);

/**
 * A piece's routing: where each played note goes, from its channel table. Set by the piece (MIDI cards): each entry
 * the note is on (`Played.midi`, those switched on), a kit's member as its drum note, and nothing for a note on none.
 */
export function router(result: CompileResult, table: ChannelTable): (e: Played) => Routes {
  const outputs = new Map(result.outputs.map((o) => [o.id, o]));
  const channels = new Map(table.voices.map((v) => [v.voice, v.channel]));
  const drums = new Map(table.kit.map((k) => [k.member, k.note]));
  const kitChannel = table.kitChannel ?? DRUM_CHANNEL;
  if (table.byPiece)
    return (e) => {
      if (!e.midi?.length) return null;
      const o = e.output === undefined ? undefined : outputs.get(e.output);
      const drum = o?.kit ? drums.get(e.voice) : null;
      if (drum === undefined) return null;
      return e.midi.map((m) => ({ channel: m.channel, drum, port: m.port, gain: m.gain }));
    };
  return (e) => {
    const o = e.output === undefined ? undefined : outputs.get(e.output);
    if (o?.silent) return null;
    if (o?.kit) {
      const note = drums.get(e.voice);
      return note === undefined ? null : { channel: kitChannel, drum: note };
    }
    const channel = channels.get(o ? channelKey(result, o) : e.voice);
    return channel === undefined ? null : { channel, drum: null };
  };
}

/** One note as MIDI: what to strike, when, how hard, and the bends over it (14-bit values at moments). */
export interface MidiNote {
  readonly channel: number;
  readonly note: number;
  readonly velocity: number;
  readonly at: number;
  readonly end: number;
  /** The bend it starts on (the cents its frequency is off its key): the centre for a note on a key. */
  readonly bend: number;
  /** Bends while it sounds (its `bends`, ramps sampled every BEND_STEP), each a change from the one before. */
  readonly bends: readonly { readonly at: number; readonly value: number }[];
}

/**
 * A played note as MIDI, on the route given: its key and the bend for the cents it is off it, then its bends as
 * bend messages (a ramp glides there from the point before, sampled). A drum is its drum note, unbent. Null for a
 * note no MIDI key can play (below note 0 or above 127, or no frequency).
 */
export function midiNote(e: Played, route: NonNullable<Route>, bendRange = DEFAULT_BEND_RANGE, a4 = 440): MidiNote | null {
  const velocity = velocityOf(e, route.gain);
  const end = e.at + Math.max(0, e.dur);
  if (route.drum !== null) return { channel: route.channel, note: route.drum, velocity, at: e.at, end, bend: BEND_CENTRE, bends: [] };
  if (!(e.freq > 0) || !Number.isFinite(e.freq)) return null;
  const { note, cents } = noteOf(e.freq, a4);
  if (note < 0 || note > 127) return null;
  const off = Math.abs(cents) < IN_TUNE ? 0 : cents;
  const value = (c: number) => (Math.abs(off + c) < IN_TUNE ? BEND_CENTRE : bendValue(off + c, bendRange));
  const bends: { at: number; value: number }[] = [];
  let last = { at: e.at, cents: 0 };
  const push = (at: number, v: number) => {
    if (v !== (bends.at(-1)?.value ?? value(0))) bends.push({ at, value: v });
  };
  for (const b of e.bends) {
    if (b.at >= end) break;
    if (b.ramp && b.at > last.at) {
      for (let t = last.at + BEND_STEP; t < b.at - 1e-9; t += BEND_STEP) push(t, value(last.cents + ((b.cents - last.cents) * (t - last.at)) / (b.at - last.at)));
    }
    const at = Math.max(e.at, b.at);
    push(at, value(b.cents));
    last = { at, cents: b.cents };
  }
  return { channel: route.channel, note, velocity, at: e.at, end, bend: value(0), bends };
}

/**
 * MPE-style channels for microtonal pieces: a note takes, from `channels`, one that nothing still sounds on (the one
 * free longest), so notes with different bends never share a channel; when all are busy, the one that frees first.
 */
export class Rotation {
  #busy = new Map<number, number>();
  constructor(readonly channels: readonly number[]) {}

  take(end: number): number {
    // (the channel whose last note ends earliest: free longest if any is free, else the first to free)
    let best = this.channels[0];
    for (const c of this.channels) if ((this.#busy.get(c) ?? -Infinity) < (this.#busy.get(best) ?? -Infinity)) best = c;
    this.#busy.set(best, Math.max(end, this.#busy.get(best) ?? -Infinity));
    return best;
  }

  forget(): void {
    this.#busy.clear();
  }
}

/** The channels a rotation runs over: `from` … `to` (1–16), without the kit's (10 unless chosen) where the piece has a kit. */
export function rotationChannels(from: number, to: number, kit: boolean, kitChannel: number = DRUM_CHANNEL): number[] {
  const out: number[] = [];
  for (let c = Math.max(1, Math.min(from, to)); c <= Math.min(16, Math.max(from, to)); c++) if (!(kit && c === kitChannel)) out.push(c);
  return out.length ? out : [1];
}
