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
import { filterModel } from './attributes';
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

/** Parameters of the later stages: rendered dry, and said (decision 062's stages R2 and R3). The echo is R2's, built (#452). */
const LATER: Readonly<Record<string, string>> = {
  body: 'R3',
  ring: 'R3',
  hard: 'R3',
  board: 'R3',
  couple: 'R3',
  coupling: 'R3',
  excite: 'R3',
};

/** A filter's parameters, which move per note on the voice's filter. */
const FILTER = ['lpf', 'lpq', 'hpf', 'hpq', 'bpf', 'bpq'] as const;
type FilterKey = (typeof FILTER)[number];
/**
 * A cell's filters, in the order its sound goes through them (decision 074, superdough's): each its cutoff's key, its
 * Q's, its Web Audio type, and where it sits when it has no cutoff written but moves (a low-pass from 2 kHz …).
 */
const FILTERS = [
  { key: 'lpf', q: 'lpq', type: 'lowpass', from: 2000 },
  { key: 'hpf', q: 'hpq', type: 'highpass', from: 200 },
  { key: 'bpf', q: 'bpq', type: 'bandpass', from: 1000 },
] as const;
type Filter = (typeof FILTERS)[number]['key'];
const QOF: Readonly<Record<Filter, 'lpq' | 'hpq' | 'bpq'>> = { lpf: 'lpq', hpf: 'hpq', bpf: 'bpq' };
/** A ladder's drive where `drive=` gives none: superdough's (decision 074 §5). */
const LADDER_DRIVE = 0.69;

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

type Builtin = 'sine' | 'triangle' | 'sawtooth' | 'square';

/** The built-in waveforms' harmonics, as Web Audio's oscillators define them (sine terms). */
function builtin(type: Builtin): Wave {
  return waveOf(new Float64Array(MOST_HARMONICS + 1), builtinTerms(type));
}

/** A built-in waveform's sine terms, by harmonic. */
function builtinTerms(type: Builtin): Float64Array {
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
  return imag;
}

const BUILTIN = new Map<string, Wave>();
const builtinWave = (type: 'sine' | 'triangle' | 'sawtooth' | 'square') => {
  let w = BUILTIN.get(type);
  if (!w) BUILTIN.set(type, (w = builtin(type)));
  return w;
};

/** How finely a blend's share is read: in hundredths, each share's wave made once. */
const BLEND_STEPS = 100;
const BLENDS = new Map<string, Wave>();

/**
 * A blend of two built-in waves (`s=tri..square * &x`, #411): their harmonics crossfaded, the share of the second `w`
 * (0 the first wave, 1 the second), heard at one peak as each wave alone is (`waveOf`). Read at each note's start.
 */
function blendWave(a: Builtin, b: Builtin, w: number): Wave {
  const share = Math.round(Math.min(1, Math.max(0, w)) * BLEND_STEPS);
  const key = `${a}|${b}|${share}`;
  let wave = BLENDS.get(key);
  if (!wave) {
    const x = builtinTerms(a);
    const y = builtinTerms(b);
    // (each at its own peak, then mixed: the first wave alone at 0, the second at 1)
    const [px, py] = [peakOf(a), peakOf(b)];
    const n = Math.max(x.length, y.length);
    const imag = new Float64Array(n);
    for (let k = 0; k < n; k++) imag[k] = ((1 - share / BLEND_STEPS) * (x[k] ?? 0)) / px + ((share / BLEND_STEPS) * (y[k] ?? 0)) / py;
    BLENDS.set(key, (wave = waveOf(new Float64Array(n), imag)));
  }
  return wave;
}

const PEAKS = new Map<Builtin, number>();
/** A built-in wave's peak, its sine terms summed over one cycle. */
const peakOf = (type: Builtin): number => {
  let p = PEAKS.get(type);
  if (p === undefined) PEAKS.set(type, (p = peakTerms(builtinTerms(type))));
  return p;
};

/** The peak of a wave its sine terms make, over one cycle. */
function peakTerms(imag: Float64Array): number {
  let peak = 0;
  for (let i = 0; i < TABLE; i++) {
    let v = 0;
    for (let k = 1; k < imag.length; k++) if (imag[k]) v += imag[k]! * SINES[(k * i) % TABLE]!;
    peak = Math.max(peak, Math.abs(v));
  }
  return peak || 1;
}

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
  constructor(private readonly type: 'lowpass' | 'highpass' | 'bandpass') {}
  set(freq: number, q: number, rate: number): void {
    const f = Math.min(Math.max(freq, 1), rate / 2 - 1);
    const w0 = (2 * Math.PI * f) / rate;
    const cos = Math.cos(w0);
    // (a low- or a high-pass reads its Q in dB, a band-pass linearly, as Web Audio's biquad does: the spec's formulas)
    const band = this.type === 'bandpass';
    const alpha = band ? Math.sin(w0) / (2 * Math.max(q, 1e-4)) : Math.sin(w0) / (2 * Math.pow(10, q / 20));
    const a0 = 1 + alpha;
    const low = this.type === 'lowpass';
    this.b0 = (band ? alpha : low ? (1 - cos) / 2 : (1 + cos) / 2) / a0;
    this.b1 = (band ? 0 : low ? 1 - cos : -(1 + cos)) / a0;
    this.b2 = band ? -this.b0 : this.b0;
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

// ---- a ladder, a low-pass of its own (decision 074 §5) ----

/** tanh, near enough and cheap, as the ladder's core has it. */
const fastTanh = (x: number) => {
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
};

/**
 * A ladder low-pass (decision 074 §5): four one-pole stages, each through a tanh, the last fed back by its resonance,
 * its output a blend of the last stage now and its three samples before. Its core is the MIT one superdough adapts:
 * Lifted from TheBouteillacBear/webaudioworklet-wasm src/moog/filterKernel.c @ 0632e13 (MIT), its `filter()` and
 * `fast_tanh`. Around it, superdough's numbers for the same three things (superdough 1.3.0, `worklets.mjs`, read, its
 * code not copied: it is AGPL, this package MIT), so it sounds as superdough's ladder does:
 * - the input driven by e^drive (`drive=`, .69 unless given), within .1 and 2000;
 * - the feedback k = min(8, 0.13 · resonance), the cell's `lpq=` read as superdough's resonance (not in dB);
 * - its output made up by min(1.75, 1 + k) over the drive.
 * Its cutoff and resonance are read once a block, as a filter's coefficients are (superdough reads them once a quantum).
 */
class Ladder {
  private cutoff = 0;
  private k = 0;
  private makeup = 1;
  private readonly drive: number;
  private readonly p = [new Float64Array(7), new Float64Array(7)];
  constructor(drive: number) {
    this.drive = Math.min(2000, Math.max(0.1, Math.exp(drive)));
  }
  set(freq: number, q: number, rate: number): void {
    this.cutoff = Math.min(1, (freq * 2 * Math.PI) / rate);
    this.k = Math.min(8, q * 0.13);
    this.makeup = (1 / this.drive) * Math.min(1.75, 1 + this.k);
  }
  run(x: number, ch: 0 | 1): number {
    // (p: the four stages, then the last stage's three samples before; as the core's p0 p1 p2 p3 p32 p33 p34)
    const p = this.p[ch];
    const out = p[3]! * 0.360891 + p[4]! * 0.41729 + p[5]! * 0.177896 + p[6]! * 0.0439725;
    p[6] = p[5]!;
    p[5] = p[4]!;
    p[4] = p[3]!;
    p[0]! += (fastTanh(x * this.drive - this.k * out) - fastTanh(p[0]!)) * this.cutoff;
    p[1]! += (fastTanh(p[0]!) - fastTanh(p[1]!)) * this.cutoff;
    p[2]! += (fastTanh(p[1]!) - fastTanh(p[2]!)) * this.cutoff;
    p[3]! += (fastTanh(p[2]!) - fastTanh(p[3]!)) * this.cutoff;
    return out * this.makeup;
  }
}

// ---- a voice and its notes ----

/**
 * The shared echo every voice with a `delay=` and no `delaytime=` of its own sends to, and a voice's own echo's
 * defaults: Cell studio's (`src/audio/voices.ts`, `voice/voice.ts` @ 420e9d6), so an example's `postgain=` keeps
 * its meaning, as R1's levels did (decision 062 §5).
 */
const SHARED_ECHO = { time: 0.375, feedback: 0.35 } as const;
/** A voice's send to its own echo where it gives `delaytime=` and no `delay=`. */
const OWN_ECHO_SEND = 0.3;
/** The shortest echo, in frames: a delay in a cycle is at least one render quantum in Web Audio, as Cell studio's are. */
const QUANTUM = 128;

/**
 * An echo (decision 062 R2, #452): a delay line on each channel whose output is fed back into it, heard wet only, as
 * Tone's FeedbackDelay at `wet: 1` (y[n] = z[n − D], z[n] = x[n] + feedback · y[n]), the delay read between two frames
 * where it falls between them, as Web Audio's DelayNode reads it.
 */
interface Return {
  /** Its return's stem. */
  readonly name: string;
  /** Its input this block, summed from the voices that send to it. */
  readonly input: [Float64Array, Float64Array];
  /** Frames [from, to) of the block starting at `blockStart`: what it gives back, written to `out`, its input cleared. */
  run(from: number, to: number, blockStart: number, out: [Float64Array, Float64Array]): void;
}

class Echo implements Return {
  /** Its input this block, summed from the voices that send to it. */
  readonly input: [Float64Array, Float64Array] = [new Float64Array(BLOCK), new Float64Array(BLOCK)];
  private readonly line: [Float64Array, Float64Array];
  private readonly whole: number;
  private readonly frac: number;
  private n = 0;
  constructor(
    /** Its return's stem: `echo`, the shared one, or `echo:<voice>`. */
    readonly name: string,
    time: number,
    private readonly feedback: number,
    rate: number,
  ) {
    const d = Math.max(QUANTUM, time * rate);
    this.whole = Math.floor(d);
    this.frac = d - this.whole;
    const size = this.whole + 2;
    this.line = [new Float64Array(size), new Float64Array(size)];
  }
  /** Frames [from, to) of the block starting at `blockStart`: what it gives back, written to `out`, its input cleared. */
  run(from: number, to: number, blockStart: number, out: [Float64Array, Float64Array]): void {
    const size = this.whole + 2;
    for (let f = from; f < to; f++) {
      const i = f - blockStart;
      const a = (this.n - this.whole + size * 2) % size;
      const b = (a - 1 + size) % size;
      for (const ch of [0, 1] as const) {
        const z = this.line[ch];
        const y = z[a]! * (1 - this.frac) + z[b]! * this.frac;
        z[this.n] = this.input[ch][i]! + this.feedback * y;
        out[ch][i] = y;
        this.input[ch][i] = 0;
      }
      this.n = (this.n + 1) % size;
    }
  }
}

/**
 * The reverb every voice with a `room=` sends to: Cell studio's (`src/audio/voices.ts` @ 420e9d6), Tone's Reverb at
 * `decay: 2.8, preDelay: .01, wet: 1`, a burst of noise its impulse: from 10 ms on, an amplitude falling with Tone's time
 * constant for a 2.8 s decay, ln(3.8) / ln(200) = 0.252 s, through a convolver that normalizes it as Chromium does
 * (to 10^(−58/20) over its RMS, times 44100 over the sample rate). Its noise is new each session in Cell studio, so
 * what it fixes is its loudness and its decay, not its samples: a wet energy of 2.81 · 44100² · 10^(−5.8) / rate a
 * channel (0.196 at 44.1 kHz), what that convolver gives, whatever its noise.
 */
const SHARED_ROOM = { preDelay: 0.01, tau: Math.log(2.8 + 1) / Math.log(200), seconds: 2.81 } as const;
/** The shortest delay lines of the reverb's network on each channel, in ms: mutually prime once in frames, the right a set of its own, so the two sides don't correlate. */
const ROOM_LINES: readonly (readonly number[])[] = [
  [29.7, 37.1, 41.1, 43.7, 53.3, 59.3, 61.7, 71.9],
  [31.3, 35.9, 39.7, 47.1, 51.7, 57.1, 67.3, 73.3],
];

/**
 * A reverb (decision 062 R2, #452) as a feedback delay network on each channel: eight lines, mixed by a Hadamard matrix
 * (orthogonal, so it keeps energy), each attenuated by e^(−length/τ) a pass, so its energy falls as the noise burst's
 * does; fed after the pre-delay, its output scaled once, by its own impulse's energy, to the convolver's wet energy. A
 * channel's sound stays on its channel, as a stereo convolver keeps it (left by the left impulse, right by the right).
 */
class Reverb implements Return {
  readonly input: [Float64Array, Float64Array] = [new Float64Array(BLOCK), new Float64Array(BLOCK)];
  private readonly sides: [Network, Network];
  private readonly pre: [Float64Array, Float64Array];
  private n = 0;
  constructor(
    readonly name: string,
    rate: number,
  ) {
    const size = Math.max(1, Math.round(SHARED_ROOM.preDelay * rate));
    this.pre = [new Float64Array(size), new Float64Array(size)];
    // (the convolver's wet energy a channel: its normalization over the impulse's own energy, 2.81 s of frames)
    const wet = SHARED_ROOM.seconds * rate * Math.pow(10, -5.8) * Math.pow(44100 / rate, 2);
    this.sides = [new Network(ROOM_LINES[0]!, SHARED_ROOM.tau, rate, wet), new Network(ROOM_LINES[1]!, SHARED_ROOM.tau, rate, wet)];
  }
  run(from: number, to: number, blockStart: number, out: [Float64Array, Float64Array]): void {
    const size = this.pre[0].length;
    for (let f = from; f < to; f++) {
      const i = f - blockStart;
      for (const ch of [0, 1] as const) {
        const x = this.pre[ch][this.n]!;
        this.pre[ch][this.n] = this.input[ch][i]!;
        this.input[ch][i] = 0;
        out[ch][i] = this.sides[ch].step(x);
      }
      this.n = (this.n + 1) % size;
    }
  }
}

/** A feedback delay network: its lines, each fed the input and the Hadamard mix of all their outputs, each attenuated a pass. */
class Network {
  private readonly lines: Float64Array[];
  private readonly at: number[];
  private readonly gains: number[];
  private readonly outs = new Float64Array(8);
  private readonly scale: number;
  constructor(ms: readonly number[], tau: number, rate: number, wet: number) {
    const lengths = ms.map((m) => Math.max(1, Math.round((m / 1000) * rate)));
    this.lines = lengths.map((l) => new Float64Array(l));
    this.at = lengths.map(() => 0);
    this.gains = lengths.map((l) => Math.exp(-l / (tau * rate)));
    this.scale = 1;
    // its own impulse's energy, measured once, then the scale that gives the convolver's (its tail past 30 τ is below 10⁻²⁶)
    let energy = 0;
    const frames = Math.ceil(30 * tau * rate);
    for (let f = 0; f < frames; f++) {
      const y = this.step(f === 0 ? 1 : 0);
      energy += y * y;
    }
    for (const l of this.lines) l.fill(0);
    this.at.fill(0);
    this.scale = Math.sqrt(wet / energy);
  }
  step(x: number): number {
    const o = this.outs;
    for (let k = 0; k < 8; k++) o[k] = this.lines[k]![this.at[k]!]! * this.gains[k]!;
    // (a fast Hadamard transform, 8 points, over √8: orthogonal)
    for (let h = 1; h < 8; h *= 2)
      for (let i = 0; i < 8; i += 2 * h)
        for (let j = i; j < i + h; j++) {
          const a = o[j]!;
          const b = o[j + h]!;
          o[j] = a + b;
          o[j + h] = a - b;
        }
    let y = 0;
    for (let k = 0; k < 8; k++) {
      const line = this.lines[k]!;
      const out = line[this.at[k]!]! * this.gains[k]!;
      y += k % 2 ? -out : out;
      line[this.at[k]!] = x + o[k]! / Math.SQRT2 / 2;
      this.at[k] = (this.at[k]! + 1) % line.length;
    }
    return y * this.scale;
  }
}

// ---- grit: a curve each sample goes through ----

/**
 * A wave shaper's curve, applied as Web Audio's WaveShaperNode applies one (the spec's): the input from −1 to 1 laid
 * across the curve's points and read between the two it falls between; past either end, that end's point.
 */
class Shaper {
  constructor(private readonly curve: Float32Array) {}
  run(x: number): number {
    const c = this.curve;
    const v = ((c.length - 1) / 2) * (x + 1);
    if (!(v > 0)) return c[0]!;
    if (v >= c.length - 1) return c[c.length - 1]!;
    const k = Math.floor(v);
    const f = v - k;
    return (1 - f) * c[k]! + f * c[k + 1]!;
  }
}

/**
 * `distort=`: Tone's Distortion, as Cell studio's voices play it (`voice/voice.ts` @ 420e9d6), its curve Tone's
 * (`setMap`, 1024 points): (3 + k) · x · 20° / (π + k · |x|), k = 100 · amount, and 0 within .001 of silence. Tone
 * oversamples it twice there; here it is read at the render's rate, which moves its loudness by less than its aliasing.
 */
function distortion(amount: number): Shaper {
  const k = amount * 100;
  const deg = Math.PI / 180;
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.abs(x) < 0.001 ? 0 : ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return new Shaper(curve);
}

/** `crush=`: fewer bits, as Cell studio's voices play it: each sample rounded to 2^(bits − 1) levels a side, a curve of 4096 points. */
function crusher(bits: number): Shaper {
  const levels = Math.pow(2, Math.round(bits) - 1);
  const curve = new Float32Array(4096);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.round(((i / (curve.length - 1)) * 2 - 1) * levels) / levels;
  return new Shaper(curve);
}

/** A cell's grit, in the order its sound goes through it (`keep` the parameters it plays itself): fewer bits, then distortion, as Cell studio's chain has them. */
function gritOf(params: Readonly<Record<string, number | string>>, keep: (k: string) => boolean): Shaper[] {
  const out: Shaper[] = [];
  const crush = params.crush;
  if (keep('crush') && typeof crush === 'number' && crush >= 1 && crush < 16) out.push(crusher(crush));
  const distort = params.distort;
  if (keep('distort') && typeof distort === 'number' && distort > 0) out.push(distortion(distort));
  return out;
}

// ---- FM: a modulator swinging its carrier's frequency ----

/**
 * A note's modulator (decision 062 R2, #452), as Cell studio's voices play one (`voice/voice.ts` @ 420e9d6): an
 * oscillator of the modulator voice's wave at the carrier's note frequency times its `ratio=` (1 unless given), started
 * with the note at phase 0, whose output times its own frequency times the carrier's `index=` (1 unless given; moving, as
 * the note moves it) is added to the carrier's frequency before its bends, as an oscillator's frequency input is added to
 * its value; and its own modulator swings it the same way, five deep at most.
 */
interface Mod {
  readonly wave: Wave;
  /** Its frequency (Hz): its carrier's note frequency times its ratio. */
  readonly freq: number;
  readonly index: number;
  /** The carrier's moving index=, over the note; its fixed index where absent. */
  readonly moving: Auto | null;
  readonly inner: Mod | null;
  phase: number;
}

/** How far a modulator swings its carrier now (Hz), its phase moved on a frame: its own modulator first. */
function swing(m: Mod, t: number, rate: number): number {
  const hz = m.freq + (m.inner ? swing(m.inner, t, rate) : 0);
  const table = tableFor(m.wave, Math.abs(hz), rate);
  let y = 0;
  if (table) {
    const p = m.phase * TABLE;
    const i = Math.floor(p);
    const frac = p - i;
    const s0 = table[((i % TABLE) + TABLE) % TABLE]!;
    const s1 = table[(((i + 1) % TABLE) + TABLE) % TABLE]!;
    y = s0 + (s1 - s0) * frac;
  }
  m.phase += hz / rate;
  m.phase -= Math.floor(m.phase);
  return y * m.freq * (m.moving ? m.moving.at(t) : m.index);
}

/** A send to a return (an echo, the reverb), at the level it moves to (`delay=`, `room=`). */
interface Send {
  readonly key: 'delay' | 'room';
  readonly to: Return;
  readonly level: Auto;
}

/** A cell's filters, from its parameters (`keep` the ones it plays itself): which it has, and their parameters' tracks. */
function filtersOf(
  c: { readonly params: Readonly<Record<string, number | string>>; readonly paramCells?: Readonly<Record<string, { readonly range: readonly [number, number] | null }>> },
  keep: (k: string) => boolean,
) {
  const moves = c.paramCells ?? {};
  const start = (k: string, d: number) => (!keep(k) ? d : typeof c.params[k] === 'number' ? (c.params[k] as number) : (moves[k]?.range?.[0] ?? d));
  const autos: Partial<Record<FilterKey, Auto>> = {};
  const has = Object.fromEntries(FILTERS.map(({ key }) => [key, keep(key) && (typeof c.params[key] === 'number' || !!moves[key])])) as Record<Filter, boolean>;
  for (const { key, q, from } of FILTERS)
    if (has[key]) {
      autos[key] = new Auto(start(key, from));
      autos[q] = new Auto(start(q, 1));
    }
  // (its model: 24db two stages; a ladder its low-pass, driven by drive=, its high- and band-pass biquads)
  const model = keep('ftype') ? filterModel(c.params.ftype) : '12db';
  const drive = keep('drive') && typeof c.params.drive === 'number' ? c.params.drive : LADDER_DRIVE;
  return { has, autos, stages: model === '24db' ? 2 : 1, ladder: model === 'ladder' && has.lpf ? drive : null };
}

/** The stem a chain goes to: its key's first part. */
const stemKey = (ch: { readonly key: string }) => ch.key.split('\u0000')[0]!;

interface Voice {
  readonly name: string;
  readonly seed: number;
  readonly wave: Wave | null;
  /** A blend of two built-in waves (`s=tri..square * &x`, #411): each note plays the share it starts on. */
  readonly blend: { readonly from: Builtin; readonly to: Builtin } | null;
  readonly noise: Float32Array | null;
  /** Its grit (`crush=`, `distort=`), on its notes' sum, before its filters. */
  readonly grit: readonly Shaper[];
  /** Which filters it has; their parameters move for all its chains alike. */
  readonly has: Readonly<Record<Filter, boolean>>;
  /** How many biquads each of its filters is: 1, or 2 under `ftype=24db` (decision 074). */
  readonly stages: number;
  /** Under `ftype=ladder`, its low-pass is a ladder at this drive (decision 074 §5); null otherwise. */
  readonly ladder: number | null;
  readonly autos: Partial<Record<FilterKey, Auto>>;
  /** Its sends to an echo (`delay=`) and the reverb (`room=`), after its filters, each at the level it moves to. */
  readonly sends: readonly Send[];
  /** Its sound on its way to each stem: one chain, or one for each entry of the card it is heard through. */
  readonly chains: Chain[];
}

/**
 * An instrument's filters (decision 067): a module after its voices, in series after each voice's own. Its parameters
 * move for every voice through it alike, each note through it scheduling them, as a voice's do for its notes; a stage
 * on each voice's chain is the stage on their sum, since a filter is linear, and keeps a voice's stem its own.
 */
interface Stage {
  readonly name: string;
  readonly has: Readonly<Record<Filter, boolean>>;
  /** How many biquads each of its filters is: 1, or 2 under `ftype=24db` (decision 074). */
  readonly stages: number;
  /** Under `ftype=ladder`, its low-pass is a ladder at this drive (decision 074 §5); null otherwise. */
  readonly ladder: number | null;
  readonly autos: Partial<Record<FilterKey, Auto>>;
  /** Its sends, for its voices' sum: each voice through it sends, as a filter of the sum is one on each (#452). */
  readonly sends: readonly Send[];
  /** Its grit, on its voices' sum (decision 067): not linear, so its voices' chains meet in a bus first. */
  readonly grit: readonly Shaper[];
}

/**
 * Where the voices through an instrument with grit meet (decision 067, #452): their chains up to it summed, at the level
 * they leave their voices, then its grit, its filters, the filters of the instruments around it, and the sends of each;
 * one a stem (an entry's, or by voice the instrument's own, which then holds what its voices play through it).
 */
interface Bus {
  readonly key: string;
  /** The stem it goes to: '' (the instrument's own) or an entry's key. */
  readonly stem: string;
  /** Its instrument, then those around it, each with its filters for this bus. */
  readonly stages: readonly { readonly stage: Stage; readonly filters: Partial<Record<Filter, (Biquad | Ladder)[]>> }[];
  readonly input: [Float64Array, Float64Array];
}

/** A voice's notes going to one stem, through filters of their own (so a stem by entry is filtered as the mix is). */
interface Chain {
  /** The stem it goes to: '' (the voice's own), or an entry's key; then the instruments it goes through. */
  readonly key: string;
  readonly filters: Partial<Record<Filter, (Biquad | Ladder)[]>>;
  /** The instruments' stages after its own filters, the innermost first, each with its filters for this chain. */
  readonly stages: readonly { readonly stage: Stage; readonly filters: Partial<Record<Filter, (Biquad | Ladder)[]>> }[];
  /** Its notes sounding or to come, in order of their start. */
  notes: Note[];
  /** Its sound before its filters, this block. */
  readonly dry: [Float64Array, Float64Array];
  /** The bus it plays into, where an instrument it goes through has grit: its stages are those inside that one. */
  readonly bus: Bus | null;
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
  /** Its own wave, a blend's at its start (#411); the voice's where absent. */
  readonly wave?: Wave;
  readonly level: Auto | null;
  /** Its pitch: Hz at the start, and what moves it (semitones from a shape, cents from bends), or none. */
  readonly freq: number;
  readonly semis: Auto | null;
  readonly cents: Auto | null;
  /** A noise note: where in the noise it starts (frames). */
  readonly grain: number;
  /** Its modulator (`fm=`), swinging its frequency, and the modulator's own, each started with the note; none without. */
  readonly fm: Mod | null;
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
function schedule(auto: Auto, key: FilterKey | Send['key'] | 'index', track: ParamTrack, time: number, dur: number): void {
  const freq = key === 'lpf' || key === 'hpf' || key === 'bpf';
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

/** The voices heard on a card, sound or MIDI (decision 064): an output's voice, or a kit's members. */
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
    const to = c.paramCells?.s?.to !== undefined ? DOUGH_SOURCES[c.paramCells.s.to] : undefined;
    const blend = src && !isNoise && to && to !== 'white' && to !== 'pink' && to !== 'brown' ? { from: src as Builtin, to } : null;
    if (src && !isNoise) wave = builtinWave(src as Builtin);
    else if (!src) {
      // the braid is the waveform
      const { real, imag } = harmonics(waveform(result, name, shifts));
      wave = waveOf(real, imag);
    }
    // (not what it takes from an instrument: that instrument's stage plays it, after the voice's own)
    const { has, autos, stages, ladder } = filtersOf(c, (k) => !c.inherited?.[k]);
    const sends = sendsOf(name, c, (k) => !c.inherited?.[k]);
    const v: Voice = {
      name,
      seed: c.seed,
      wave,
      blend,
      noise: isNoise ? noise(src, rate) : null,
      grit: gritOf(c.params, (k) => !c.inherited?.[k]),
      has,
      autos,
      stages,
      ladder,
      sends,
      chains: [],
    };
    voices.set(name, v);
    return v;
  };

  /**
   * A note's modulator chain: the modulator `of` names (fm=), at `carrier` Hz times its ratio=, swung by its own, five deep
   * at most; a modulator's wave its own (a noise one's, as an oscillator given none, a sine). `index`: the carrier's
   * moving index= over the note, the first modulator's only, as Cell studio schedules it.
   */
  const fmOf = (of: string, carrier: number, depth: number, index: ParamTrack | undefined, at: number, dur: number): Mod | null => {
    const c = result.cells.get(of);
    const name = c?.params.fm;
    if (typeof name !== 'string' || depth > 5) return null;
    const m = result.cells.get(name);
    if (!m?.voice) return null;
    const mv = voiceOf(name);
    const freq = carrier * (typeof m.params.ratio === 'number' ? m.params.ratio : 1);
    const fixed = typeof c!.params.index === 'number' ? c!.params.index : 1;
    let moving: Auto | null = null;
    if (index) {
      moving = new Auto(fixed);
      schedule(moving, 'index', index, at, dur);
    }
    return { wave: mv?.wave ?? builtinWave('sine'), freq, index: fixed, moving, inner: fmOf(name, freq, depth + 1, undefined, at, dur), phase: 0 };
  };

  // the returns (the echoes, the reverb), in the order they are first sent to; each a stem of its own (but in a mix alone)
  const returns = new Map<string, Return>();
  const returnOf = (name: string, make: () => Return): Return => {
    let e = returns.get(name);
    if (!e) {
      e = make();
      returns.set(name, e);
      if (tracks !== 'mix') stems.push(name);
    }
    return e;
  };
  const echoOf = (name: string, time: number, feedback: number) => returnOf(name, () => new Echo(name, time, feedback, rate));

  /**
   * A cell's sends (`keep` the parameters it plays itself): to its own echo where it gives delaytime=, else to the shared
   * one where it sends (delay=, fixed or moving); to the reverb where it gives room=, fixed or moving.
   */
  const sendsOf = (
    name: string,
    c: { readonly params: Readonly<Record<string, number | string>>; readonly paramCells?: Readonly<Record<string, { readonly range: readonly [number, number] | null }>> },
    keep: (k: string) => boolean,
  ): Send[] => {
    const out: Send[] = [];
    const start = (k: 'delay' | 'room') => (keep(k) && typeof c.params[k] === 'number' ? (c.params[k] as number) : keep(k) ? c.paramCells?.[k]?.range?.[0] : undefined);
    const own = typeof c.params.delaytime === 'number' && keep('delaytime');
    if (own || ((typeof c.params.delay === 'number' || !!c.paramCells?.delay) && keep('delay'))) {
      const feedback = typeof c.params.delayfeedback === 'number' && keep('delayfeedback') ? c.params.delayfeedback : SHARED_ECHO.feedback;
      const to = own ? echoOf(`echo:${name}`, c.params.delaytime as number, feedback) : echoOf('echo', SHARED_ECHO.time, SHARED_ECHO.feedback);
      out.push({ key: 'delay', to, level: new Auto(start('delay') ?? (own ? OWN_ECHO_SEND : 0)) });
    }
    if ((typeof c.params.room === 'number' || !!c.paramCells?.room) && keep('room'))
      out.push({ key: 'room', to: returnOf('reverb', () => new Reverb('reverb', rate)), level: new Auto(start('room') ?? 0) });
    return out;
  };

  const stages = new Map<string, Stage>();
  /** An instrument's stage, made when a note first plays through it: its filters (decision 067). */
  const stageOf = (name: string): Stage | null => {
    const known = stages.get(name);
    if (known) return known;
    const c = result.cells.get(name);
    if (!c) return null;
    for (const k of [...Object.keys(c.params), ...Object.keys(c.paramCells ?? {})])
      if (LATER[k]) say(name, k, `&${name}'s ${k}= is sounded from stage ${LATER[k]}: rendered without it`);
    const st: Stage = { name, ...filtersOf(c, () => true), sends: sendsOf(name, c, () => true), grit: gritOf(c.params, () => true) };
    stages.set(name, st);
    return st;
  };
  const biquads = (has: { readonly has: Voice['has']; readonly stages: number; readonly ladder: number | null }): Chain['filters'] => ({
    ...Object.fromEntries(
      FILTERS.filter(({ key }) => has.has[key]).map(({ key, type }) => [
        key,
        key === 'lpf' && has.ladder !== null ? [new Ladder(has.ladder)] : Array.from({ length: has.stages }, () => new Biquad(type)),
      ]),
    ),
  });

  /** A voice's chain to a stem through its instruments' stages, made when a note first goes there. */
  /** The buses, in the order they are first played into. */
  const buses = new Map<string, Bus>();
  const busOf = (stem: string, through: readonly Stage[]): Bus => {
    const key = [stem, ...through.map((st) => st.name)].join('\u0000');
    let b = buses.get(key);
    if (!b) {
      b = { key, stem, stages: through.map((stage) => ({ stage, filters: biquads(stage) })), input: [new Float64Array(BLOCK), new Float64Array(BLOCK)] };
      buses.set(key, b);
      if (tracks === 'voices' && !stems.includes(through[0]!.name)) stems.push(through[0]!.name);
    }
    return b;
  };
  const chainOf = (v: Voice, stem: string, through: readonly Stage[]): Chain => {
    const key = [stem, ...through.map((st) => st.name)].join('\u0000');
    let ch = v.chains.find((x) => x.key === key);
    if (!ch) {
      // (up to the first instrument with grit its own; from there on, a bus its voices share)
      const gritty = through.findIndex((st) => st.grit.length > 0 || st.ladder !== null);
      const inside = gritty < 0 ? through : through.slice(0, gritty);
      ch = {
        key,
        filters: biquads(v),
        stages: inside.map((stage) => ({ stage, filters: biquads(stage) })),
        notes: [],
        dry: [new Float64Array(BLOCK), new Float64Array(BLOCK)],
        bus: gritty < 0 ? null : busOf(stem, through.slice(gritty)),
      };
      // (chains in the order of their stems, so a voice's chains are summed alike however its notes came)
      v.chains.push(ch);
      v.chains.sort((a, b) => (entryOrder.get(stemKey(a)) ?? -1) - (entryOrder.get(stemKey(b)) ?? -1) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
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
  const sendLevels = new Map<Send, Float64Array>();
  const sendRead = new Map<Send, number>();

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
      // (a blend's share where the note starts: the wave it plays through)
      const shareOf = params.s?.kind === 'points' ? params.s.points[0]?.value : undefined;
      const blended = v.blend && shareOf !== undefined ? blendWave(v.blend.from, v.blend.to, shareOf) : undefined;
      for (const k of FILTER) {
        const track = params[k];
        const auto = v.autos[k];
        if (track && auto && !c.inherited?.[k]) schedule(auto, k, track, e.at, dur);
      }
      for (const sd of v.sends) if (params[sd.key] && !c.inherited?.[sd.key]) schedule(sd.level, sd.key, params[sd.key]!, e.at, dur);
      // the instruments it plays through, each a stage after the voice's own filters, its parameters moved by this note
      const through: Stage[] = [];
      for (const x of e.through ?? []) {
        const st = stageOf(x.instrument);
        if (!st || (!FILTERS.some(({ key }) => st.has[key]) && !st.sends.length && !st.grit.length)) continue;
        for (const k of FILTER) {
          const track = x.params?.[k];
          const auto = st.autos[k];
          if (track && auto) schedule(auto, k, track, e.at, dur);
        }
        for (const sd of st.sends) if (x.params?.[sd.key]) schedule(sd.level, sd.key, x.params[sd.key]!, e.at, dur);
        for (const k of Object.keys(x.params ?? {})) if (LATER[k]) say(x.instrument, k, `&${x.instrument}'s moving ${k}= is sounded from stage R2: rendered without it`);
        through.push(st);
      }
      for (const k of Object.keys(params)) if (LATER[k]) say(e.voice, k, `&${e.voice}'s moving ${k}= is sounded from stage R2: rendered without it`);
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
          ...(blended ? { wave: blended } : {}),
          level: lvl(),
          freq: e.freq,
          semis: semis(),
          cents: cents(),
          grain: v.noise ? Math.floor(grainOffset(v.seed, e.voice, e.code ?? e.at, NOISE_SECONDS) * rate) : 0,
          fm: v.noise ? null : fmOf(e.voice, e.freq, 0, params.index, e.at, end - e.at),
          phase: 0,
        };
        const chain = chainOf(v, share.key, through);
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
          if (n.fm) hz += swing(n.fm, t, rate);
          if (n.cents) hz *= Math.pow(2, n.cents.at(t) / 1200);
          const table = tableFor(n.wave ?? v.wave!, hz, rate);
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

  /** A chain's filters over the frames, their coefficients the voice's, then each stage's the instrument's, from the block's first frame. */
  const filter = (v: Voice, ch: Chain, from: number, to: number, blockStart: number) => {
    const t = blockStart / rate;
    for (const [filters, autos] of [[ch.filters, v.autos] as const, ...ch.stages.map((s) => [s.filters, s.stage.autos] as const)])
      for (const { key: k } of FILTERS) {
        const q = QOF[k];
        // (each stage of it in turn, at one cutoff and Q: two under ftype=24db, decision 074)
        for (const bq of filters[k] ?? []) {
          bq.set(autos[k]!.at(t), autos[q]!.at(t), rate);
          for (let f = from; f < to; f++) {
            const i = f - blockStart;
            ch.dry[0][i] = bq.run(ch.dry[0][i]!, 0);
            ch.dry[1][i] = bq.run(ch.dry[1][i]!, 1);
          }
        }
      }
  };

  const render = (frames: number): Rendered => {
    const n = Math.max(0, Math.floor(frames));
    const mix: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
    const stemOut = new Map<string, [Float32Array, Float32Array]>(stems.map((s) => [s, [new Float32Array(n), new Float32Array(n)]]));
    const stemOf = (ch: Chain, voice: string) =>
      tracks === 'voices' ? stemOut.get(voice) : tracks === 'entries' ? stemOut.get(stemKey(ch) === UNROUTED ? UNROUTED : (entryName.get(stemKey(ch)) ?? '')) : undefined;
    // (each voice's sum, in the text's order, so the mix is the stems added in that order)
    const order = [...result.cells.values()].filter((c) => c.voice && heard.has(c.name)).map((c) => c.name);
    const end = position + n;
    const wet: [Float64Array, Float64Array] = [new Float64Array(BLOCK), new Float64Array(BLOCK)];
    // (a send's level over a block, read once a block: its Auto is read at times that only grow)
    const levels = (send: Send, from: number, to: number, blockStart: number) => {
      // (keyed by the frame it starts on: a block's second part, in the next call, is read again)
      if (sendRead.get(send) === from) return;
      sendRead.set(send, from);
      let a = sendLevels.get(send);
      if (!a) sendLevels.set(send, (a = new Float64Array(BLOCK)));
      for (let f = from; f < to; f++) a[f - blockStart] = send.level.at(f / rate);
    };
    for (let from = position; from < end;) {
      const blockStart = Math.floor(from / BLOCK) * BLOCK;
      const to = Math.min(end, blockStart + BLOCK);
      for (const name of order) {
        const v = voices.get(name);
        if (!v) continue;
        // (its sends' levels over the block, and each instrument's it goes through: read once a block for all its chains)
        for (const sd of v.sends) levels(sd, from, to, blockStart);
        for (const ch of v.chains) {
          for (const { stage } of ch.stages) for (const sd of stage.sends) levels(sd, from, to, blockStart);
          if (!ch.notes.length && !FILTERS.some(({ key }) => ch.filters[key]?.length) && !ch.stages.length) continue;
          sound(v, ch, from, to, blockStart);
          for (const g of v.grit)
            for (let f = from; f < to; f++) {
              const i = f - blockStart;
              ch.dry[0][i] = g.run(ch.dry[0][i]!);
              ch.dry[1][i] = g.run(ch.dry[1][i]!);
            }
          filter(v, ch, from, to, blockStart);
          const stem = stemOf(ch, name);
          for (let f = from; f < to; f++) {
            const i = f - blockStart;
            const l = ch.dry[0][i]! * VOICE_GAIN * master;
            const r = ch.dry[1][i]! * VOICE_GAIN * master;
            if (ch.bus) {
              // (into the bus at the level it leaves its voice, the card's master after the bus's grit)
              ch.bus.input[0][i]! += ch.dry[0][i]! * VOICE_GAIN;
              ch.bus.input[1][i]! += ch.dry[1][i]! * VOICE_GAIN;
              for (const sd of v.sends) {
                const g = sendLevels.get(sd)![i]!;
                sd.to.input[0][i]! += l * g;
                sd.to.input[1][i]! += r * g;
              }
              for (const { stage } of ch.stages)
                for (const sd of stage.sends) {
                  const g = sendLevels.get(sd)![i]!;
                  sd.to.input[0][i]! += l * g;
                  sd.to.input[1][i]! += r * g;
                }
              continue;
            }
            for (const sd of v.sends) {
              const g = sendLevels.get(sd)![i]!;
              sd.to.input[0][i]! += l * g;
              sd.to.input[1][i]! += r * g;
            }
            for (const { stage } of ch.stages)
              for (const sd of stage.sends) {
                const g = sendLevels.get(sd)![i]!;
                sd.to.input[0][i]! += l * g;
                sd.to.input[1][i]! += r * g;
              }
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
      // the buses, after every voice: their instrument's grit on its voices' sum, then the filters and sends of each stage
      for (const b of buses.values()) {
        const t = blockStart / rate;
        for (const { stage } of b.stages) for (const sd of stage.sends) levels(sd, from, to, blockStart);
        const [x0, x1] = b.input;
        b.stages.forEach(({ stage, filters }, j) => {
          if (j === 0)
            for (const g of stage.grit)
              for (let f = from; f < to; f++) {
                const i = f - blockStart;
                x0[i] = g.run(x0[i]!);
                x1[i] = g.run(x1[i]!);
              }
          for (const { key: k } of FILTERS) {
            for (const bq of filters[k] ?? []) {
              bq.set(stage.autos[k]!.at(t), stage.autos[QOF[k]]!.at(t), rate);
              for (let f = from; f < to; f++) {
                const i = f - blockStart;
                x0[i] = bq.run(x0[i]!, 0);
                x1[i] = bq.run(x1[i]!, 1);
              }
            }
          }
        });
        const stem = tracks === 'voices' ? stemOut.get(b.stages[0]!.stage.name) : tracks === 'entries' ? stemOut.get(entryName.get(b.stem) ?? '') : undefined;
        for (let f = from; f < to; f++) {
          const i = f - blockStart;
          const l = x0[i]! * master;
          const r = x1[i]! * master;
          x0[i] = 0;
          x1[i] = 0;
          for (const { stage } of b.stages)
            for (const sd of stage.sends) {
              const g = sendLevels.get(sd)![i]!;
              sd.to.input[0][i]! += l * g;
              sd.to.input[1][i]! += r * g;
            }
          if (tracks === 'entries') {
            if (stem) {
              stem[0][f - position]! += l;
              stem[1][f - position]! += r;
            }
          } else if (stem) {
            stem[0][f - position]! += l;
            stem[1][f - position]! += r;
            mix[0][f - position]! += Math.fround(l);
            mix[1][f - position]! += Math.fround(r);
          } else {
            mix[0][f - position]! += Math.fround(l);
            mix[1][f - position]! += Math.fround(r);
          }
        }
      }
      // the returns, after every voice: each a stem of its own, added to the mix as a voice's is
      for (const ret of returns.values()) {
        ret.run(from, to, blockStart, wet);
        const stem = stemOut.get(ret.name);
        for (let f = from; f < to; f++) {
          const i = f - blockStart;
          if (tracks === 'entries') {
            stem![0][f - position] = wet[0][i]!;
            stem![1][f - position] = wet[1][i]!;
          } else if (stem) {
            stem[0][f - position] = wet[0][i]!;
            stem[1][f - position] = wet[1][i]!;
            mix[0][f - position]! += stem[0][f - position]!;
            mix[1][f - position]! += stem[1][f - position]!;
          } else {
            mix[0][f - position]! += Math.fround(wet[0][i]!);
            mix[1][f - position]! += Math.fround(wet[1][i]!);
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
