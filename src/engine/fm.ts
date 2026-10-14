/**
 * The spectrum of FM, exactly: a sine carrier at f, its phase swung by a modulator
 * (a sine at f·ratio, depth index), has lines at f + k·f·ratio for every whole k,
 * each J_k(index) strong — Bessel functions of the first kind. A modulator that is
 * modulated itself expands the same way, inside: e^{ikθ} = Σₙ Jₙ(k·I) e^{inθₘ} …
 * Negative frequencies fold back, their sign turned.
 */
import type { CompileResult } from './program';

/** J_n(x), Bessel's function of the first kind (the power series; accurate for the |x| FM uses, < ~25). */
export function besselJ(n: number, x: number): number {
  if (n < 0) return (n % 2 ? -1 : 1) * besselJ(-n, x);
  let term = Math.pow(x / 2, n);
  for (let k = 2; k <= n; k++) term /= k;
  let sum = term;
  for (let m = 1; m < 80; m++) {
    term *= -(x * x) / 4 / (m * (m + n));
    sum += term;
    if (Math.abs(term) < 1e-14 * Math.max(1, Math.abs(sum))) break;
  }
  return sum;
}

type Line = { f: number; a: number };

/** e^{i·k·θ(t)} for the phase θ of a voice at f (and its modulators): its lines. */
function lines(result: CompileResult, voice: string, f: number, k: number, peak: (v: string) => number, depth: number): Line[] {
  const c = result.cells.get(voice);
  const fm = c?.params.fm;
  const mod = typeof fm === 'string' ? result.cells.get(fm) : undefined;
  if (!mod || depth > 3 || k === 0) return [{ f: k * f, a: 1 }];
  const fmod = f * (typeof mod.params.ratio === 'number' ? mod.params.ratio : 1);
  const I = peak(voice);
  const out: Line[] = [];
  const reach = Math.ceil(Math.abs(k * I) + 6);
  for (let n = -reach; n <= reach; n++) {
    const w = besselJ(n, k * I);
    if (Math.abs(w) < 1e-5) continue;
    for (const l of lines(result, fm as string, fmod, n, peak, depth + 1)) out.push({ f: k * f + l.f, a: w * l.a });
  }
  return out;
}

/**
 * An FM voice's lines at its brightest (the index at the top of its range, if it moves):
 * frequency and strength (0…1, the strongest 1). Carriers and modulators as sines.
 */
export function fmLines(result: CompileResult, voice: string, f0: number): Line[] {
  const peak = (v: string) => {
    const c = result.cells.get(v)!;
    const moving = c.paramCells?.index;
    if (moving) return moving.range ? moving.range[1] : 1;
    return typeof c.params.index === 'number' ? c.params.index : 1;
  };
  // the output is the imaginary part of e^{iθ}: a line at −f is −a at f
  const merged = new Map<number, number>();
  for (const l of lines(result, voice, f0, 1, peak, 0)) {
    const at = Math.abs(l.f);
    const key = Math.round(at * 100) / 100;
    if (key === 0) continue;
    merged.set(key, (merged.get(key) ?? 0) + (l.f < 0 ? -l.a : l.a));
  }
  const all = [...merged].map(([f, a]) => ({ f, a: Math.abs(a) })).filter((l) => l.a > 1e-4);
  const top = Math.max(1e-9, ...all.map((l) => l.a));
  return all.map((l) => ({ f: l.f, a: l.a / top })).sort((p, q) => p.f - q.f);
}

/** An FM voice's wave over one cycle of its carrier, at its brightest: sin(θ), θ swung by its modulators. */
export function fmWave(result: CompileResult, voice: string, n: number): Float32Array {
  const peakOf = (v: string) => {
    const c = result.cells.get(v)!;
    const moving = c.paramCells?.index;
    if (moving) return moving.range ? moving.range[1] : 1;
    return typeof c.params.index === 'number' ? c.params.index : 1;
  };
  const phase = (v: string, ratio: number, t: number, depth: number): number => {
    const base = 2 * Math.PI * ratio * t;
    const fm = result.cells.get(v)?.params.fm;
    const mod = typeof fm === 'string' ? result.cells.get(fm) : undefined;
    if (!mod || depth > 3) return base;
    const r = typeof mod.params.ratio === 'number' ? mod.params.ratio : 1;
    return base + peakOf(v) * Math.sin(phase(fm as string, ratio * r, t, depth + 1));
  };
  return Float32Array.from({ length: n }, (_, i) => Math.sin(phase(voice, 1, i / (n - 1), 0)));
}
