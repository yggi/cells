/**
 * The continuous wavelet transform of a signal sampled in time: a scalogram, its power at each period at each moment
 * (docs/notes/scalogram.md). A complex Morlet (ω0 = 6), 12 periods an octave, computed with FFTs: one of the signal,
 * one inverse a period. Pure; a day's piece takes about a minute, so the app runs it in a worker.
 */
import { fft, pow2 } from './fft';

/** Morlet's centre frequency, and its Fourier period per unit of scale (Torrence & Compo 1998, table 1). */
const W0 = 6;
const FOURIER = (4 * Math.PI) / (W0 + Math.sqrt(2 + W0 * W0));
export const PER_OCTAVE = 12;
/** Samples a second at most, and in all over a window (a day at 3 a second). */
export const MOST_RATE = 50;
const MOST_SAMPLES = 2 ** 18;
/** Points in time kept of each period: every sample, or this many across the window. */
const FINE = 4096;

/** How a window is sampled and which periods are looked at. */
export interface Grid {
  readonly window: number;
  readonly rate: number;
  /** Seconds, fastest first, 12 an octave. */
  readonly periods: readonly number[];
}

/** A scalogram: `rows[i][c]`, the power at `periods[i]` around the moment (c + ½)/columns × window. */
export interface Scalogram {
  readonly window: number;
  readonly periods: readonly number[];
  readonly rows: readonly Float32Array[];
}

/**
 * The grid for a window of `window` seconds: 50 samples a second, fewer for a long one (at most 2^18 in all); the
 * periods from 1/16 s (a long window: 8 samples, clear of the aliasing a few samples a second leave) to a third of the
 * window (beyond that the window's edges are all there is).
 */
export function grid(window: number, most = MOST_RATE): Grid {
  const rate = Math.min(most, MOST_SAMPLES / window);
  const periods: number[] = [];
  for (let p = rate < MOST_RATE ? 8 / rate : 1 / 16; p <= window / 3; p *= Math.pow(2, 1 / PER_OCTAVE)) periods.push(p);
  return { window, rate, periods };
}

/**
 * The scalogram of `x` (sampled on `g`): the power |W(s, t)|² at each period, normalised by scale (Liu et al. 2007) so
 * that an impulse train's levels compare across periods, at min(samples, 4096) moments. The signal's mean is taken
 * away first, so the window's edges aren't a step.
 */
export function transform(x: Float64Array, g: Grid): Scalogram {
  const n = pow2(x.length * 2);
  const xr = new Float64Array(n);
  const xi = new Float64Array(n);
  const mean = x.reduce((a, v) => a + v, 0) / (x.length || 1);
  for (let i = 0; i < x.length; i++) xr[i] = x[i] - mean;
  fft(xr, xi);
  const columns = Math.max(1, Math.min(x.length, FINE));
  const rows = g.periods.map((p) => {
    const s = p / FOURIER;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    // (the analytic Morlet's spectrum: positive frequencies only, ψ̂(sω) = π^-¼ e^{-(sω-ω0)²/2}, energy-normalised by √s)
    for (let k = 1; k < n / 2; k++) {
      const w = (2 * Math.PI * k * g.rate) / n;
      const h = Math.pow(Math.PI, -0.25) * Math.sqrt((2 * Math.PI * s * g.rate) / n) * Math.exp(-((s * w - W0) ** 2) / 2);
      re[k] = xr[k] * h;
      im[k] = xi[k] * h;
    }
    fft(re, im, true);
    const row = new Float32Array(columns);
    for (let c = 0; c < columns; c++) {
      const i = Math.floor(((c + 0.5) / columns) * x.length);
      row[c] = (re[i] ** 2 + im[i] ** 2) / n ** 2 / s;
    }
    return row;
  });
  return { window: g.window, periods: g.periods, rows };
}

/** Two scalograms of the same grid, added (the powers of signals that don't beat against each other). */
export const sum = (a: Scalogram, b: Scalogram): Scalogram => ({ ...a, rows: a.rows.map((r, i) => r.map((v, c) => v + b.rows[i][c])) });

/** How far the window's edges reach into a period's row, as a fraction of the window: `k` × the Morlet's e-folding time √2·s. */
export const reach = (period: number, window: number, k = 1) => Math.min(0.5, (k * Math.SQRT2 * (period / FOURIER)) / window);

/** Each row against its own mean over the moments the window's edges leave clear (twice their reach): 1 is the mean. */
export function byRow(s: Scalogram): Float32Array[] {
  return s.rows.map((r, i) => {
    const edge = Math.min(Math.floor(r.length * reach(s.periods[i], s.window, 2)), Math.floor(r.length / 2) - 1);
    let acc = 0;
    for (let c = edge; c < r.length - edge; c++) acc += r[c];
    const mean = acc / (r.length - 2 * edge) || 1;
    return r.map((v) => v / mean);
  });
}
