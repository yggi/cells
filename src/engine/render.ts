/**
 * The renderer (decision 062): events in, samples out, in blocks. A text's events, or what a performer played, and the
 * voices of a compiled piece go in; stereo tracks come out, a mix and, when asked, a stem a voice. Offline (a WAV, a
 * test in Node) and live (a worklet, a stream) are the same calls: `add` the events of a window, `render` the frames
 * after it. A render in chunks is the render whole, sample for sample, and the stems sum to the mix.
 *
 * What a parameter means is superdough's, written from what it documents (it is AGPL: none of its code is here); the
 * level scale and a note's articulation are the ones the examples' `postgain=` were set by (Cell studio's voices, yggi/
 * cell-studio `src/audio/voice/voice.ts` @ f18aa7a). Stage R1 sounds the waveforms, noise, envelopes, levels, pan,
 * bends and a pitch's shape, and the filters, moving or not; a parameter of a later stage (effects, FM, resonators,
 * tapes) is left out, the voice rendered dry, and a diagnostic names the voice and the parameter.
 */
import { DOUGH_SOURCES } from './dough-params';
import { cellId } from './ids';
import { grainOffset, noise, NOISE_SECONDS } from './noise';
import type { CompileResult, Shifts } from './program';
import { outputSounds, type Played } from './realize';
import type { ParamTrack } from './series';
import { harmonics, waveform } from './wave';

/** A render's sample rate when none is given (Hz): cells' `SAMPLE_RATE`. */
export const DEFAULT_RATE = 48000;
/** The rates a render takes (Hz). */
export const RATES = { lowest: 8000, highest: 192000 } as const;

/**
 * What a stem is (decision 062): `mix`, the mix alone; `voices`, a stem for each voice heard; `entries`, a stem for each
 * entry of the sound card (each term of its mix, or of a channel's: what the piece mixes, at the level it mixes it). The
 * mix is given with either, and the stems sum to it.
 */
export type Tracks = 'mix' | 'voices' | 'entries';

export interface RenderOptions {
  /** Hz: `DEFAULT_RATE` where left out. */
  readonly sampleRate?: number;
  readonly tracks?: Tracks;
  /** What is switched off (graph ids): the piece's `off` cells where left out. */
  readonly muted?: ReadonlySet<string>;
}

/** Something the renderer couldn't sound as written: a voice's parameter of a later stage, which it renders dry. */
export interface RenderDiagnostic {
  readonly voice: string;
  readonly param: string;
  readonly message: string;
}

/** Frames rendered: the mix's two channels, and each stem's (`tracks: 'voices'` or `'entries'`), by its name. */
export interface Rendered {
  readonly mix: readonly [Float32Array, Float32Array];
  readonly stems: ReadonlyMap<string, readonly [Float32Array, Float32Array]>;
}

export interface Renderer {
  readonly sampleRate: number;
  /**
   * The stems' names, in order: the voices heard, in the order the text defines them (`'voices'`); the card's entries,
   * named by the cells they name (`crackle*vinyl`, a second of a name `#2`, on a card of two channels `:left`, `:right`),
   * in the card's order (`'entries'`); none for `'mix'`.
   */
  readonly stems: readonly string[];
  /** Frames rendered so far: the next `render` starts here. */
  readonly position: number;
  readonly diagnostics: readonly RenderDiagnostic[];
  /** Notes to sound. One that starts before `position` sounds from there on. Stems by entry need each note's `output` (`eventsBetween(…, true)`). */
  add(events: readonly Played[]): void;
  /** The next `frames` frames. */
  render(frames: number): Rendered;
}

/** Parameters of the later stages: rendered dry, and said (decision 062's stages R2 and R3). */
const LATER: Readonly<Record<string, string>> = {
  room: 'R2',
  delay: 'R2',
  delaytime: 'R2',
  delayfeedback: 'R2',
  distort: 'R2',
  crush: 'R2',
  fm: 'R2',
  body: 'R3',
  ring: 'R3',
  hard: 'R3',
  board: 'R3',
  couple: 'R3',
  coupling: 'R3',
  excite: 'R3',
};

/** A filter's parameters, which move per note on the voice's filter. */
const FILTER = ['lpf', 'lpq', 'hpf', 'hpq'] as const;
type FilterKey = (typeof FILTER)[number];

/** Frames between a filter's coefficients, counted from the render's first frame, so a chunk boundary moves nothing. */
const BLOCK = 32;
/** A note's peak per unit of level, and a voice's own gain after its filters: the scale the examples' `postgain=` assume. */
const NOTE_PEAK = 0.35;
const NOISE_PEAK = 2.8;
const VOICE_GAIN = 0.4;
/** A note is articulated: its gate open for this share of its length (a drone's, all of it). */
const ARTICULATION = 0.9;
/** A voice with no envelope in its product plays quick and full (sound.md). */
const DEFAULT_ENV = { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 };

// ---- automation: a parameter's value over time, set, ramped or approaching a target ----

interface AutoEvent {
  readonly at: number;
  readonly value: number;
  /** set: from then on; lin, exp: a ramp ending then; target: from then on, approaching the value by `tau`. */
  readonly kind: 'set' | 'lin' | 'exp' | 'target';
  readonly tau?: number;
}

/** A parameter's events, read at times that only grow. */
class Auto {
  private events: AutoEvent[] = [];
  private j = -1;
  private start: number;
  constructor(private readonly initial: number) {
    this.start = initial;
  }
  /** Events from `at` on dropped (a note scheduling its own track on the voice's parameter). */
  cancel(at: number): void {
    this.events = this.events.filter((e) => e.at < at);
    if (this.j >= this.events.length) this.j = this.events.length - 1;
  }
  push(e: AutoEvent): void {
    let i = this.events.length;
    while (i > 0 && this.events[i - 1]!.at > e.at) i--;
    this.events.splice(i, 0, e);
  }
  private segment(t: number): number {
    const e = this.events[this.j];
    const n = this.events[this.j + 1];
    const t0 = e ? e.at : 0;
    if (n && (n.kind === 'lin' || n.kind === 'exp') && n.at > t0) {
      const x = Math.min(1, Math.max(0, (t - t0) / (n.at - t0)));
      if (n.kind === 'exp' && this.start > 0 && n.value > 0) return this.start * Math.pow(n.value / this.start, x);
      return this.start + (n.value - this.start) * x;
    }
    if (e?.kind === 'target') return e.value + (this.start - e.value) * Math.exp(-(t - e.at) / Math.max(1e-6, e.tau ?? 0));
    return this.start;
  }
  at(t: number): number {
    while (this.j + 1 < this.events.length && this.events[this.j + 1]!.at <= t) {
      const next = this.events[this.j + 1]!;
      const before = this.j < 0 && next.kind !== 'set' ? this.initial : this.segment(next.at);
      this.j++;
      this.start = next.kind === 'target' ? before : next.value;
    }
    return this.segment(t);
  }
}

// ---- wavetables: a waveform's harmonics, as many as fit under the Nyquist frequency ----

const TABLE = 2048;
const MOST_HARMONICS = TABLE / 2 - 1;

/** A waveform as tables: `tables[l]` holds its harmonics up to 2^l, all scaled by one factor so the fullest peaks at 1. */
interface Wave {
  readonly tables: readonly Float32Array[];
}

const SINES = (() => {
  const s = new Float64Array(TABLE);
  for (let i = 0; i < TABLE; i++) s[i] = Math.sin((2 * Math.PI * i) / TABLE);
  return s;
})();

function waveOf(real: ArrayLike<number>, imag: ArrayLike<number>): Wave {
  const top = Math.max(1, Math.min(MOST_HARMONICS, Math.max(real.length, imag.length) - 1));
  const levels = Math.ceil(Math.log2(top)) + 1;
  const raw: Float64Array[] = [];
  for (let l = 0; l < levels; l++) {
    const most = Math.min(top, 2 ** l);
    const t = new Float64Array(TABLE);
    for (let k = 1; k <= most; k++) {
      const a = real[k] ?? 0;
      const b = imag[k] ?? 0;
      if (!a && !b) continue;
      for (let i = 0; i < TABLE; i++) {
        const p = (k * i) % TABLE;
        // (cos is sin a quarter on)
        t[i]! += a * SINES[(p + TABLE / 4) % TABLE]! + b * SINES[p]!;
      }
    }
    raw.push(t);
  }
  const full = raw[raw.length - 1]!;
  let peak = 0;
  for (let i = 0; i < TABLE; i++) peak = Math.max(peak, Math.abs(full[i]!));
  const scale = peak > 0 ? 1 / peak : 0;
  return { tables: raw.map((t) => Float32Array.from(t, (v) => v * scale)) };
}

/** The built-in waveforms' harmonics, as Web Audio's oscillators define them (sine terms). */
function builtin(type: 'sine' | 'triangle' | 'sawtooth' | 'square'): Wave {
  const n = type === 'sine' ? 1 : MOST_HARMONICS;
  const imag = new Float64Array(n + 1);
  for (let k = 1; k <= n; k++)
    imag[k] =
      type === 'sine'
        ? 1
        : type === 'sawtooth'
          ? (2 / (Math.PI * k)) * (k % 2 ? 1 : -1)
          : type === 'square'
            ? (2 / (Math.PI * k)) * (1 - (k % 2 ? -1 : 1))
            : (8 * Math.sin((Math.PI * k) / 2)) / (Math.PI * k) ** 2;
  return waveOf(new Float64Array(n + 1), imag);
}

const BUILTIN = new Map<string, Wave>();
const builtinWave = (type: 'sine' | 'triangle' | 'sawtooth' | 'square') => {
  let w = BUILTIN.get(type);
  if (!w) BUILTIN.set(type, (w = builtin(type)));
  return w;
};

/** The table to read at a frequency: the fullest whose harmonics all stay under the Nyquist frequency (null: none fits). */
function tableFor(w: Wave, freq: number, rate: number): Float32Array | null {
  const allowed = Math.floor(rate / 2 / Math.abs(freq));
  if (!(allowed >= 1)) return null;
  const l = Math.min(w.tables.length - 1, Math.floor(Math.log2(allowed)));
  return w.tables[l]!;
}

// ---- a biquad, as Web Audio's (its Q in dB for a low- or a high-pass) ----

class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private readonly z1 = [0, 0];
  private readonly z2 = [0, 0];
  constructor(private readonly type: 'lowpass' | 'highpass') {}
  set(freq: number, q: number, rate: number): void {
    const f = Math.min(Math.max(freq, 1), rate / 2 - 1);
    const w0 = (2 * Math.PI * f) / rate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.pow(10, q / 20));
    const a0 = 1 + alpha;
    const low = this.type === 'lowpass';
    this.b0 = (low ? (1 - cos) / 2 : (1 + cos) / 2) / a0;
    this.b1 = (low ? 1 - cos : -(1 + cos)) / a0;
    this.b2 = this.b0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  /** One sample of channel `ch` (transposed direct form II). */
  run(x: number, ch: 0 | 1): number {
    const y = this.b0 * x + this.z1[ch]!;
    this.z1[ch] = this.b1 * x - this.a1 * y + this.z2[ch]!;
    this.z2[ch] = this.b2 * x - this.a2 * y;
    return y;
  }
}

// ---- a voice and its notes ----

interface Voice {
  readonly name: string;
  readonly seed: number;
  readonly wave: Wave | null;
  readonly noise: Float32Array | null;
  /** Which filters it has; their parameters move for all its chains alike. */
  readonly has: { readonly lpf: boolean; readonly hpf: boolean };
  readonly autos: Partial<Record<FilterKey, Auto>>;
  /** Its sound on its way to each stem: one chain, or one for each entry of the card it is heard through. */
  readonly chains: Chain[];
}

/** A voice's notes going to one stem, through filters of their own (so a stem by entry is filtered as the mix is). */
interface Chain {
  /** The stem it goes to: '' (the voice's own), or an entry's key. */
  readonly key: string;
  readonly filters: Partial<Record<'lpf' | 'hpf', Biquad>>;
  /** Its notes sounding or to come, in order of their start. */
  notes: Note[];
  /** Its sound before its filters, this block. */
  readonly dry: [Float64Array, Float64Array];
}

interface Note {
  readonly start: number;
  readonly at: number;
  readonly end: number;
  readonly gateEnd: number;
  readonly peak: number;
  /** Its gain on each channel: where it is panned, times the share of it that goes to its chain's stem. */
  readonly left: number;
  readonly right: number;
  readonly env: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };
  readonly level: Auto | null;
  /** Its pitch: Hz at the start, and what moves it (semitones from a shape, cents from bends), or none. */
  readonly freq: number;
  readonly semis: Auto | null;
  readonly cents: Auto | null;
  /** A noise note: where in the noise it starts (frames). */
  readonly grain: number;
  phase: number;
}

const finite = (x: number) => Number.isFinite(x);

/** Its amplitude envelope at t: a line up to its peak, a fall to its sustain, and after the gate a fall to silence. */
function envelopeAt(n: Note, t: number): number {
  const { attack, decay, sustain } = n.env;
  const open = (u: number) => {
    if (u < 0) return 0;
    if (u < attack) return (n.peak * u) / attack;
    const s = n.peak * sustain;
    return decay > 0 ? s + (n.peak - s) * Math.exp(-(u - attack) / (decay / 3)) : s;
  };
  if (t < n.gateEnd) return open(t - n.at);
  return open(n.gateEnd - n.at) * Math.exp(-(t - n.gateEnd) / (Math.max(n.env.release, 0.005) / 3));
}

/** A track scheduled on a voice's filter parameter for one note, as a moving parameter does (exponential for a frequency). */
function schedule(auto: Auto, key: FilterKey, track: ParamTrack, time: number, dur: number): void {
  const freq = key === 'lpf' || key === 'hpf';
  const v = (x: number) => (freq ? Math.max(1, x) : x);
  const ramp = freq ? 'exp' : 'lin';
  auto.cancel(time);
  if (track.kind === 'points') {
    track.points.forEach((x, i) => {
      if (!finite(x.at) || !finite(x.value)) return;
      auto.push({ at: Math.max(time, x.at), value: v(x.value), kind: i > 0 && x.ramp ? ramp : 'set' });
    });
    return;
  }
  const { from, peak, attack, decay, sustain, release } = track;
  const hold = from + (peak - from) * sustain;
  const held = time + Math.max(dur, attack + decay + 0.003);
  auto.push({ at: time, value: v(from), kind: 'set' });
  auto.push({ at: time + Math.max(0.001, attack), value: v(peak), kind: ramp });
  auto.push({ at: time + Math.max(0.002, attack + decay), value: v(hold), kind: ramp });
  auto.push({ at: held, value: v(hold), kind: 'set' });
  auto.push({ at: held + Math.max(0.005, release), value: v(from), kind: ramp });
}

/** A pitch's shape in semitones over one note (`pitch=lo..hi * &shape`): with no attack it starts at its peak, a drop. */
function pitchShape(track: ParamTrack, time: number, dur: number): Auto {
  const a = new Auto(0);
  if (track.kind === 'points') {
    track.points.forEach((x, i) => {
      if (finite(x.at) && finite(x.value)) a.push({ at: Math.max(time, x.at), value: x.value, kind: i > 0 && x.ramp ? 'lin' : 'set' });
    });
    return a;
  }
  const { from, peak, attack, decay, sustain, release } = track;
  const hold = from + (peak - from) * sustain;
  if (attack > 0) {
    a.push({ at: time, value: from, kind: 'set' });
    a.push({ at: time + attack, value: peak, kind: 'lin' });
  } else a.push({ at: time, value: peak, kind: 'set' });
  a.push({ at: time + Math.max(0.002, attack + decay), value: hold, kind: 'lin' });
  const end = time + Math.max(dur, attack + decay + 0.003);
  a.push({ at: end, value: hold, kind: 'set' });
  if (hold !== from) a.push({ at: end + Math.max(0.005, release), value: from, kind: 'lin' });
  return a;
}

/** The voices heard on a sound card: an output's voice, or a kit's members (decision 019: a MIDI card alone is sent, not heard). */
function heardVoices(result: CompileResult, muted: ReadonlySet<string>): Set<string> {
  const off = (name: string) => muted.has(cellId(name));
  return new Set(
    result.outputs
      .filter((o) => !o.silent && outputSounds(result, o, muted))
      .flatMap((o) => (o.kit ? [o.voice, ...[...(result.cells.get(o.voice)?.children.keys() ?? [])].filter((m) => !off(m))] : [o.voice])),
  );
}

/** A renderer for a compiled piece's voices (see the module's comment). */
export function createRenderer(result: CompileResult, shifts: Shifts, options: RenderOptions = {}): Renderer {
  const rate = options.sampleRate ?? DEFAULT_RATE;
  if (!(rate >= RATES.lowest && rate <= RATES.highest)) throw new RangeError(`a render's sample rate is ${RATES.lowest} to ${RATES.highest} Hz, not ${rate}`);
  const muted = options.muted ?? result.off;
  const tracks = options.tracks ?? 'mix';
  const heard = heardVoices(result, muted);
  // the sound card's master: postgain= on the (first) sound card, linear; below 0 it inverts what the card plays
  const card = [...result.cells.values()].find((c) => c.sink);
  const master = typeof card?.params.postgain === 'number' ? card.params.postgain : 1;
  const diagnostics: RenderDiagnostic[] = [];
  const said = new Set<string>();
  const say = (voice: string, param: string, message: string) => {
    const key = `${voice}\u0000${param}`;
    if (said.has(key)) return;
    said.add(key);
    diagnostics.push({ voice, param, message });
  };
  if (result.tapes.length) for (const t of result.tapes) say(t.name, 'write', `&${t.name} is a tape, which a render sounds from stage R3: left out`);

  const voices = new Map<string, Voice>();
  const voiceOf = (name: string): Voice | null => {
    const known = voices.get(name);
    if (known) return known;
    const c = result.cells.get(name);
    if (!c?.voice) return null;
    for (const k of Object.keys(c.params)) if (LATER[k]) say(name, k, `&${name}'s ${k}= is sounded from stage ${LATER[k]}: rendered without it`);
    for (const k of Object.keys(c.paramCells ?? {})) if (LATER[k]) say(name, k, `&${name}'s ${k}= is sounded from stage ${LATER[k]}: rendered without it`);
    const src = c.params.s !== undefined ? DOUGH_SOURCES[String(c.params.s)] : null;
    const isNoise = src === 'white' || src === 'pink' || src === 'brown';
    let wave: Wave | null = null;
    if (src && !isNoise) wave = builtinWave(src as 'sine' | 'triangle' | 'sawtooth' | 'square');
    else if (!src) {
      // the braid is the waveform
      const { real, imag } = harmonics(waveform(result, name, shifts));
      wave = waveOf(real, imag);
    }
    const moves = c.paramCells ?? {};
    const start = (k: string, d: number) => (typeof c.params[k] === 'number' ? (c.params[k] as number) : (moves[k]?.range?.[0] ?? d));
    const autos: Voice['autos'] = {};
    const has = { lpf: typeof c.params.lpf === 'number' || !!moves.lpf, hpf: typeof c.params.hpf === 'number' || !!moves.hpf };
    if (has.lpf) {
      autos.lpf = new Auto(start('lpf', 2000));
      autos.lpq = new Auto(start('lpq', 1));
    }
    if (has.hpf) {
      autos.hpf = new Auto(start('hpf', 200));
      autos.hpq = new Auto(start('hpq', 1));
    }
    const v: Voice = {
      name,
      seed: c.seed,
      wave,
      noise: isNoise ? noise(src, rate) : null,
      has,
      autos,
      chains: [],
    };
    voices.set(name, v);
    return v;
  };

  /** A voice's chain to a stem, made when a note first goes there. */
  const chainOf = (v: Voice, key: string): Chain => {
    let ch = v.chains.find((x) => x.key === key);
    if (!ch) {
      ch = { key, filters: {}, notes: [], dry: [new Float64Array(BLOCK), new Float64Array(BLOCK)] };
      if (v.has.lpf) ch.filters.lpf = new Biquad('lowpass');
      if (v.has.hpf) ch.filters.hpf = new Biquad('highpass');
      // (chains in the order of their stems, so a voice's chains are summed alike however its notes came)
      v.chains.push(ch);
      v.chains.sort((a, b) => (entryOrder.get(a.key) ?? -1) - (entryOrder.get(b.key) ?? -1));
    }
    return ch;
  };

  // the card's entries, by key (card, channel, place), in the card's order, each with its stem's name
  const sinks = [...result.cells.values()].filter((c) => c.sink).map((c) => c.name);
  const entries = new Map<string, { sink: string; channel: number; index: number; label: string }>();
  for (const o of result.outputs)
    if (heard.has(o.voice) || o.kit) for (const p of o.parts) if (p.entry) entries.set(`${p.sink}|${p.entry.channel}|${p.entry.index}`, { sink: p.sink, ...p.entry });
  const entryKeys = [...entries.keys()].sort((a, b) => {
    const x = entries.get(a)!;
    const y = entries.get(b)!;
    return sinks.indexOf(x.sink) - sinks.indexOf(y.sink) || x.channel - y.channel || x.index - y.index;
  });
  const entryOrder = new Map(entryKeys.map((k, i) => [k, i]));
  const entryName = new Map<string, string>();
  {
    const stereo = new Set([...entries.values()].filter((e) => e.channel > 0).map((e) => e.sink));
    const taken = new Map<string, number>();
    for (const k of entryKeys) {
      const e = entries.get(k)!;
      const base = `${e.label}${stereo.has(e.sink) ? (e.channel ? ':right' : ':left') : ''}`;
      const n = (taken.get(base) ?? 0) + 1;
      taken.set(base, n);
      entryName.set(k, n > 1 ? `${base}#${n}` : base);
    }
  }
  const outputsById = new Map(result.outputs.map((o) => [o.id, o]));
  /** A note's share of each entry it is heard through, per channel (`'entries'`); null where it names no output. */
  const sharesOf = (e: Played): { key: string; left: number; right: number }[] | null => {
    const o = e.output ? outputsById.get(e.output) : undefined;
    if (!o) return null;
    const by = new Map<string, [number, number]>();
    for (const p of o.parts) {
      if (!p.entry || muted.has(cellId(p.mix)) || muted.has(cellId(p.sink))) continue;
      const key = `${p.sink}|${p.entry.channel}|${p.entry.index}`;
      const g = by.get(key) ?? [0, 0];
      g[0] += p.gains[0];
      g[1] += p.gains[1];
      by.set(key, g);
    }
    const total = [...by.values()].reduce((t, g) => [t[0] + g[0], t[1] + g[1]], [0, 0]);
    return [...by].map(([key, g]) => ({ key, left: total[0] ? g[0] / total[0] : 0, right: total[1] ? g[1] / total[1] : 0 }));
  };
  const UNROUTED = 'unrouted';

  const stems =
    tracks === 'voices'
      ? [...result.cells.values()].filter((c) => c.voice && heard.has(c.name)).map((c) => c.name)
      : tracks === 'entries'
        ? entryKeys.map((k) => entryName.get(k)!)
        : [];
  let position = 0;

  const add = (events: readonly Played[]) => {
    const sorted = [...events].sort((a, b) => a.at - b.at || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0) || a.freq - b.freq || a.dur - b.dur);
    for (const e of sorted) {
      if (e.unheard || !heard.has(e.voice)) continue;
      if (!finite(e.at) || !finite(e.dur) || !finite(e.freq)) continue;
      const v = voiceOf(e.voice);
      if (!v) continue;
      const c = result.cells.get(e.voice)!;
      if (typeof c.params.body === 'string') continue;
      const [g0, g1] = e.gains;
      const size = Math.max(Math.abs(g0), Math.abs(g1));
      if (!(size > 0)) continue;
      const level = g0 + g1 < 0 ? -size : size;
      // its place, from the balance of its two gains, panned as Web Audio's stereo panner pans a mono note
      const pan = (4 / Math.PI) * Math.atan2(Math.abs(g1), Math.abs(g0)) - 1;
      const x = ((pan + 1) / 2) * (Math.PI / 2);
      const env = e.env ?? DEFAULT_ENV;
      const dur = Math.max(0.02, e.held ? e.dur : e.dur * ARTICULATION);
      const gateEnd = e.at + dur;
      const end = gateEnd + env.release * 4 + 0.05;
      const levels = e.levels.filter((l) => finite(l.at) && finite(l.level));
      // (made for each note it becomes: an Auto is read at times that only grow, so two chains can't share one)
      const lvl = (): Auto | null => {
        if (!(levels.length > 1 || (levels[0] && levels[0].level !== 1))) return null;
        const a = new Auto(1);
        a.push({ at: e.at, value: levels[0]?.level ?? 1, kind: 'set' });
        for (const l of levels.slice(1)) a.push(l.ramp ? { at: l.at, value: l.level, kind: 'lin' } : { at: l.at, value: l.level, kind: 'target', tau: 0.004 });
        return a;
      };
      const bends = e.bends.filter((b) => finite(b.at) && finite(b.cents));
      const cents = (): Auto | null => {
        if (!bends.length) return null;
        const a = new Auto(0);
        a.push({ at: e.at, value: 0, kind: 'set' });
        for (const b of bends) a.push({ at: b.at, value: b.cents, kind: b.ramp ? 'lin' : 'set' });
        return a;
      };
      const params = e.params ?? {};
      const semis = () => (params.pitch ? pitchShape(params.pitch, e.at, dur) : null);
      for (const k of FILTER) {
        const track = params[k];
        const auto = v.autos[k];
        if (track && auto) schedule(auto, k, track, e.at, dur);
      }
      for (const k of Object.keys(params)) if (LATER[k] || k === 'index') say(e.voice, k, `&${e.voice}'s moving ${k}= is sounded from stage R2: rendered without it`);
      let shares: { key: string; left: number; right: number }[] = [{ key: '', left: 1, right: 1 }];
      if (tracks === 'entries') {
        const found = sharesOf(e);
        if (!found) {
          say(e.voice, 'output', `a note of &${e.voice} names no output, so no entry of the card: it goes to the stem "${UNROUTED}" (render the events of eventsBetween(…, true))`);
          if (!stems.includes(UNROUTED)) stems.push(UNROUTED);
        }
        shares = found ?? [{ key: UNROUTED, left: 1, right: 1 }];
      }
      for (const share of shares) {
        if (!share.left && !share.right) continue;
        const note: Note = {
          start: Math.max(0, Math.ceil(e.at * rate - 1e-9)),
          at: e.at,
          end,
          gateEnd,
          peak: NOTE_PEAK * level * (v.noise ? NOISE_PEAK : 1),
          left: Math.cos(x) * share.left,
          right: Math.sin(x) * share.right,
          env,
          level: lvl(),
          freq: e.freq,
          semis: semis(),
          cents: cents(),
          grain: v.noise ? Math.floor(grainOffset(v.seed, e.voice, e.code ?? e.at, NOISE_SECONDS) * rate) : 0,
          phase: 0,
        };
        const chain = chainOf(v, share.key);
        let i = chain.notes.length;
        while (i > 0 && chain.notes[i - 1]!.at > note.at) i--;
        chain.notes.splice(i, 0, note);
      }
    }
  };

  /** One chain's dry sound for frames [from, to) of the block starting at `blockStart`. */
  const sound = (v: Voice, ch: Chain, from: number, to: number, blockStart: number) => {
    const [dl, dr] = ch.dry;
    dl.fill(0, from - blockStart, to - blockStart);
    dr.fill(0, from - blockStart, to - blockStart);
    for (const n of ch.notes) {
      if (n.start >= to) break;
      const lastFrame = Math.ceil(n.end * rate);
      const a = Math.max(from, n.start);
      const b = Math.min(to, lastFrame);
      for (let f = a; f < b; f++) {
        const t = f / rate;
        if (f === n.start) n.phase = 0;
        let s: number;
        if (v.noise) s = v.noise[(n.grain + (f - n.start)) % v.noise.length]!;
        else {
          let hz = n.freq;
          if (n.semis) hz *= Math.pow(2, n.semis.at(t) / 12);
          if (n.cents) hz *= Math.pow(2, n.cents.at(t) / 1200);
          const table = tableFor(v.wave!, hz, rate);
          if (table) {
            const p = n.phase * TABLE;
            const i = Math.floor(p);
            const frac = p - i;
            const s0 = table[i % TABLE]!;
            const s1 = table[(i + 1) % TABLE]!;
            s = s0 + (s1 - s0) * frac;
          } else s = 0;
          n.phase += hz / rate;
          n.phase -= Math.floor(n.phase);
        }
        let amp = envelopeAt(n, t);
        if (n.level) amp *= n.level.at(t);
        const y = s * amp;
        dl[f - blockStart]! += y * n.left;
        dr[f - blockStart]! += y * n.right;
      }
    }
    // the notes that have ended go
    const done = Math.ceil;
    ch.notes = ch.notes.filter((n) => done(n.end * rate) > to);
  };

  /** A chain's filters over the frames, their coefficients the voice's, from the block's first frame. */
  const filter = (v: Voice, ch: Chain, from: number, to: number, blockStart: number) => {
    const t = blockStart / rate;
    for (const k of ['lpf', 'hpf'] as const) {
      const bq = ch.filters[k];
      if (!bq) continue;
      const q = k === 'lpf' ? 'lpq' : 'hpq';
      bq.set(v.autos[k]!.at(t), v.autos[q]!.at(t), rate);
      for (let f = from; f < to; f++) {
        const i = f - blockStart;
        ch.dry[0][i] = bq.run(ch.dry[0][i]!, 0);
        ch.dry[1][i] = bq.run(ch.dry[1][i]!, 1);
      }
    }
  };

  const render = (frames: number): Rendered => {
    const n = Math.max(0, Math.floor(frames));
    const mix: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
    const stemOut = new Map<string, [Float32Array, Float32Array]>(stems.map((s) => [s, [new Float32Array(n), new Float32Array(n)]]));
    const stemOf = (ch: Chain, voice: string) =>
      tracks === 'voices' ? stemOut.get(voice) : tracks === 'entries' ? stemOut.get(ch.key === UNROUTED ? UNROUTED : (entryName.get(ch.key) ?? '')) : undefined;
    // (each voice's sum, in the text's order, so the mix is the stems added in that order)
    const order = [...result.cells.values()].filter((c) => c.voice && heard.has(c.name)).map((c) => c.name);
    const end = position + n;
    for (let from = position; from < end;) {
      const blockStart = Math.floor(from / BLOCK) * BLOCK;
      const to = Math.min(end, blockStart + BLOCK);
      for (const name of order) {
        const v = voices.get(name);
        if (!v) continue;
        for (const ch of v.chains) {
          if (!ch.notes.length && !ch.filters.lpf && !ch.filters.hpf) continue;
          sound(v, ch, from, to, blockStart);
          filter(v, ch, from, to, blockStart);
          const stem = stemOf(ch, name);
          for (let f = from; f < to; f++) {
            const i = f - blockStart;
            const l = ch.dry[0][i]! * VOICE_GAIN * master;
            const r = ch.dry[1][i]! * VOICE_GAIN * master;
            if (tracks === 'entries') {
              // (an entry's stem gathers its voices; the mix is the entries added below)
              if (stem) {
                stem[0][f - position]! += l;
                stem[1][f - position]! += r;
              }
            } else if (stem) {
              stem[0][f - position] = l;
              stem[1][f - position] = r;
              mix[0][f - position]! += stem[0][f - position]!;
              mix[1][f - position]! += stem[1][f - position]!;
            } else {
              mix[0][f - position]! += Math.fround(l);
              mix[1][f - position]! += Math.fround(r);
            }
          }
        }
      }
      from = to;
    }
    // the entries' stems added in the card's order: the mix
    if (tracks === 'entries')
      for (const s of stems) {
        const [l, r] = stemOut.get(s)!;
        for (let i = 0; i < n; i++) {
          mix[0][i]! += l[i]!;
          mix[1][i]! += r[i]!;
        }
      }
    position = end;
    return { mix, stems: stemOut };
  };

  return {
    sampleRate: rate,
    stems,
    get position() {
      return position;
    },
    diagnostics,
    add,
    render,
  };
}

/** A render's loudness: the RMS of its channels and its peak, in dB below full scale, and how many samples reached it. */
export function loudness(channels: readonly Float32Array[]): { rms: number; peak: number; clipped: number } {
  let sum = 0;
  let top = 0;
  let clipped = 0;
  let n = 0;
  for (const d of channels)
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]!);
      sum += v * v;
      if (v > top) top = v;
      if (v >= 0.999) clipped++;
      n++;
    }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { rms: db(Math.sqrt(sum / Math.max(1, n))), peak: db(top), clipped };
}
