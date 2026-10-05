/**
 * A voice is a cell looped at audio rate: one turn of its braid is one cycle
 * of the waveform. Values hold for their step (no interpolation), then go
 * through map=:
 *   amp (default)  lerp the braid's own range onto −1…1   (`0 1` is a square)
 *   lin            as amp, but each value ramps to the next (`0 1` is a triangle)
 *   &table         look each value up in the table, then amp
 * With no braid a voice holds the identity of its grid, 0…11: a 12-step saw.
 * A sine is a braid too: sin(12).
 */
import { flatten, type StepEvent } from './realize';
import { lookup, type CompileResult, type Shifts } from './compile';

export function waveform(result: CompileResult, voice: string, shifts: Shifts, samples = 256): Float32Array {
  const c = result.cells.get(voice)!;
  const total = Math.max(1, c.steps);
  const events: StepEvent[] = flatten(result, voice, shifts);
  const map = c.map ?? { kind: 'amp' as const };
  const raw = (e: StepEvent) => (map.kind === 'table' ? lookup(result, map.table, e.value, shifts).value : e.value) + e.alter;

  // value at each sample: mean of the events sounding there (chords), null in rests —
  // or, with map=lin, ramping from each step's value to the next (round the cycle; rests are skipped)
  const points = [...new Set(events.map((e) => e.step))]
    .sort((a, b) => a - b)
    .map((step) => {
      const at = events.filter((e) => Math.abs(e.step - step) < 1e-9);
      return { step, value: at.reduce((a, e) => a + raw(e), 0) / at.length };
    });
  const ramped = (p: number) => {
    let i = points.length - 1;
    for (let k = 0; k < points.length; k++) if (points[k].step <= p + 1e-9) i = k;
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const from = a.step > p + 1e-9 ? a.step - total : a.step; // before the first point: from the last, a lap back
    const to = b.step <= from + 1e-9 ? b.step + total : b.step;
    return a.value + ((b.value - a.value) * (p - from)) / Math.max(1e-9, to - from);
  };
  const vals: (number | null)[] = Array.from({ length: samples }, (_, n) => {
    const p = (n / samples) * total;
    if (map.kind === 'lin' && points.length > 1) return ramped(p);
    const here = events.filter((e) => p >= e.step - 1e-9 && p < e.step + e.duration - 1e-9);
    return here.length ? here.reduce((a, e) => a + raw(e), 0) / here.length : null;
  });

  const out = new Float32Array(samples);
  const present = vals.filter((v): v is number => v !== null);
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  vals.forEach((v, n) => (out[n] = v === null || hi === lo ? 0 : ((v - lo) / (hi - lo)) * 2 - 1));
  return out;
}

/** Fourier series of one cycle, for a PeriodicWave: x ≈ Σ real[k]·cos(kθ) + imag[k]·sin(kθ). */
export function harmonics(x: Float32Array, count = 64): { real: Float32Array; imag: Float32Array } {
  const N = x.length;
  const real = new Float32Array(count + 1);
  const imag = new Float32Array(count + 1);
  for (let k = 1; k <= count; k++) {
    let a = 0;
    let b = 0;
    for (let n = 0; n < N; n++) {
      const th = (2 * Math.PI * k * n) / N;
      a += x[n] * Math.cos(th);
      b += x[n] * Math.sin(th);
    }
    real[k] = (2 * a) / N;
    imag[k] = (2 * b) / N;
  }
  return { real, imag };
}
