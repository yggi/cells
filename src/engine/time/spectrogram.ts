/**
 * Sound in time, for the time view's top layers (docs/notes/scalogram.md): a waveform's peaks per column, and a
 * waterfall (a short-time spectrum) in bands spaced on the same logarithmic axis as the scalogram, so the scalogram's
 * slow periods and the spectrogram's audible ones are one tower. Pure: samples in, numbers out.
 */
import { fft } from './fft';

/** The lowest and highest band of the waterfall (Hz): the audible. */
const AUDIBLE: readonly [number, number] = [20, 20000];

/** The waveform's extent in each of `columns` stretches of `samples`: [min, max] pairs. */
export function peaks(samples: Float32Array, columns: number): Float32Array {
  const out = new Float32Array(2 * columns);
  for (let c = 0; c < columns; c++) {
    const from = Math.floor((c / columns) * samples.length);
    const to = Math.max(from + 1, Math.floor(((c + 1) / columns) * samples.length));
    let lo = 0;
    let hi = 0;
    for (let i = from; i < Math.min(to, samples.length); i++) {
      lo = Math.min(lo, samples[i]);
      hi = Math.max(hi, samples[i]);
    }
    out[2 * c] = lo;
    out[2 * c + 1] = hi;
  }
  return out;
}

/** A waterfall: `rows[band][frame]` in dB, band `b` centred at `freqs[b]` (Hz), frame `f` at `times[f]` (s). */
export interface Waterfall {
  readonly freqs: readonly number[];
  readonly times: readonly number[];
  readonly rows: readonly Float32Array[];
}

/**
 * The short-time spectrum of `samples` (at `rate` a second): `frames` Hann-windowed FFTs of `size` samples spread
 * evenly over them, each folded into `perOctave` bands an octave over the audible (the power of the bins within a
 * band summed, in dB; a band narrower than a bin takes the bin it falls in).
 */
export function waterfall(samples: Float32Array, rate: number, { frames = 512, size = 4096, perOctave = 12 } = {}): Waterfall {
  const freqs: number[] = [];
  for (let f = AUDIBLE[0]; f <= Math.min(AUDIBLE[1], rate / 2); f *= Math.pow(2, 1 / perOctave)) freqs.push(f);
  const edge = (b: number) => freqs[b] * Math.pow(2, -0.5 / perOctave);
  const rows = freqs.map(() => new Float32Array(frames));
  const times: number[] = [];
  const hann = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
  for (let f = 0; f < frames; f++) {
    const centre = Math.floor(((f + 0.5) / frames) * samples.length);
    times.push(centre / rate);
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = (samples[centre - size / 2 + i] ?? 0) * hann[i];
    fft(re, im);
    const bin = (hz: number) => (hz * size) / rate;
    for (let b = 0; b < freqs.length; b++) {
      const lo = bin(edge(b));
      const hi = bin(edge(b) * Math.pow(2, 1 / perOctave));
      let power = 0;
      if (Math.floor(hi) <= Math.ceil(lo)) power = re[Math.round(bin(freqs[b]))] ** 2 + im[Math.round(bin(freqs[b]))] ** 2;
      else for (let k = Math.ceil(lo); k < hi && k < size / 2; k++) power += re[k] ** 2 + im[k] ** 2;
      rows[b][f] = 10 * Math.log10(power / size + 1e-12);
    }
  }
  return { freqs, times, rows };
}

/** A note as the waterfall's owners need it: when, how long, at what pitch, by which voice, how loud. */
export interface Sounding {
  readonly at: number;
  readonly dur: number;
  readonly freq: number;
  readonly voice: string;
  readonly gains?: readonly [number, number];
}

/**
 * Whose each band of each frame of a waterfall is, as far as the notes say: `owner[band * frames + frame]`, the
 * index in `voices` + 1 of the voice whose note puts the most into that band then, 0 where no note does (a drum,
 * noise, an effect's tail). A note puts its harmonics k·f there, k = 1 to `harmonics` (a pulse wave's reach far up),
 * each weighed level/k, sounding a `tail` of seconds past its end (a release). Ties go to the earlier voice; at most
 * 254 voices are told apart.
 */
export function owners(w: Waterfall, notes: readonly Sounding[], voices: readonly string[], { harmonics = 32, tail = 0.15 } = {}): Uint8Array {
  const bands = w.freqs.length;
  const frames = w.times.length;
  const owner = new Uint8Array(bands * frames);
  if (!bands || !frames) return owner;
  const best = new Float32Array(bands * frames);
  const index = new Map(voices.slice(0, 254).map((v, i) => [v, i + 1]));
  const perOctave = Math.log(2) / Math.log(w.freqs[1] / w.freqs[0] || 2);
  /** The first frame at or after `t`. */
  const frameAt = (t: number) => {
    let lo = 0;
    let hi = frames;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (w.times[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const e of notes) {
    const who = index.get(e.voice);
    if (!who || !(e.freq > 0)) continue;
    const level = e.gains ? (e.gains[0] + e.gains[1]) / 2 || 1 : 1;
    const to = frameAt(e.at + e.dur + tail);
    for (let k = 1; k <= harmonics; k++) {
      const b = Math.round(Math.log2((k * e.freq) / w.freqs[0]) * perOctave);
      if (b < 0) continue;
      if (b >= bands) break;
      const weight = level / k;
      for (let f = frameAt(e.at); f < to; f++) {
        const at = b * frames + f;
        if (weight > best[at]) {
          best[at] = weight;
          owner[at] = who;
        }
      }
    }
  }
  return owner;
}
