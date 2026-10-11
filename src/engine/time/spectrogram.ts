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
