/**
 * Where a piece's form changes, heard in its scalograms (`wavelet.ts`, `signals.ts`; docs/notes/scalogram.md): three
 * finders of boundaries, and a score against the boundaries the code writes. Measured over the library, swells find
 * the most (about 60 % of the sections at 56–72 % precision, chance 19 %), cones are the most precise, novelty the least.
 */
import { PER_OCTAVE, byRow, reach, type Scalogram } from './wavelet';

/** A boundary found: when (s), the slowest and fastest periods that show it, its score, and its path down the periods. */
export interface Boundary {
  readonly at: number;
  readonly top: number;
  readonly bottom: number;
  readonly score: number;
  readonly path: readonly (readonly [number, number])[];
}

/** The local maxima of `curve` (each the highest within `near` either side), from `from` to `to`. */
function peaks(curve: ArrayLike<number>, near: number, from = 0, to = curve.length - 1): number[] {
  const out: number[] = [];
  for (let c = Math.max(0, from); c <= Math.min(curve.length - 1, to); c++) {
    let top = true;
    for (let k = Math.max(0, c - near); k <= Math.min(curve.length - 1, c + near) && top; k++) if (curve[k] > curve[c] || (curve[k] === curve[c] && k < c)) top = false;
    if (top) out.push(c);
  }
  return out;
}

/**
 * The cones in a scalogram: lines of maxima chained from slow periods down to fast ones, converging on a moment (Mallat
 * & Hwang 1992: a singularity, here a change of section, leaves a cone of maxima pointing at it).
 * - **A maximum**: at a period, a moment louder than `loud` × the row's mean and the loudest within a quarter period
 *   either side, clear of the window's edges.
 * - **A chain**: from each maximum not yet taken, slowest first, the nearest maximum one period faster within a quarter
 *   period (wider, a chain wanders from one cone into the next at the slow periods), down to `fastest` (a cone ends
 *   where the beat begins).
 * - **Kept**: a chain spanning at least `octaves` octaves; its score is its loudness in dB summed along the way; its
 *   apex is where it ends. Cones with apexes within `merge` seconds of each other are one, the best scored.
 */
export function cones(s: Scalogram, { fastest = 1, octaves = 1, merge = 1, loud = 1 } = {}): Boundary[] {
  const r = byRow(s);
  const { periods, window } = s;
  const cols = r[0]?.length ?? 0;
  const secondsOf = (c: number) => ((c + 0.5) / cols) * window;
  const maxima = r.map((row, i) => {
    if (periods[i] < fastest) return [];
    const edge = Math.ceil(cols * reach(periods[i], window));
    return peaks(row, Math.max(1, Math.round((0.25 * periods[i] * cols) / window)), edge, cols - edge - 1).filter((c) => row[c] >= loud);
  });
  const taken = maxima.map(() => new Set<number>());
  const found: Boundary[] = [];
  for (let i = r.length - 1; i >= 0; i--)
    for (const c0 of maxima[i]) {
      if (taken[i].has(c0)) continue;
      let c = c0;
      let score = 10 * Math.log10(r[i][c]);
      const path: [number, number][] = [[secondsOf(c), periods[i]]];
      let j = i;
      while (j > 0 && maxima[j - 1].length) {
        const within = (0.25 * periods[j] * cols) / window;
        let best = -1;
        for (const m of maxima[j - 1]) if (Math.abs(m - c) <= within && (best < 0 || Math.abs(m - c) < Math.abs(best - c))) best = m;
        if (best < 0) break;
        j--;
        c = best;
        taken[j].add(c);
        score += 10 * Math.log10(r[j][c]);
        if ((i - j) % 6 === 0) path.push([secondsOf(c), periods[j]]);
      }
      path.push([secondsOf(c), periods[j]]);
      if ((i - j) / PER_OCTAVE >= octaves) found.push({ at: secondsOf(c), top: periods[i], bottom: periods[j], score, path });
    }
  found.sort((a, b) => b.score - a.score);
  const kept: Boundary[] = [];
  for (const x of found) if (!kept.some((k) => Math.abs(k.at - x.at) <= merge)) kept.push(x);
  return kept;
}

/**
 * Swells at the scale of `span` seconds (a boundary between sections that long): each scalogram in dB against its
 * period's mean, averaged over the periods from `span`/8 to `span`/2 (every scalogram counted alike), and the peaks of
 * that curve in time, best first, one within `span`/4 of another. A boundary that doesn't reach down to the beat (a
 * cone cut short) still swells there.
 */
export function swells(ss: readonly Scalogram[], span: number): Boundary[] {
  const { window } = ss[0] ?? { window: 0 };
  const cols = ss[0]?.rows[0]?.length ?? 0;
  const curve = new Float64Array(cols);
  let n = 0;
  for (const s of ss)
    byRow(s).forEach((row, i) => {
      if (s.periods[i] < span / 8 || s.periods[i] > span / 2) return;
      n++;
      for (let c = 0; c < cols; c++) curve[c] += 10 * Math.log10(Math.max(1e-6, row[c]));
    });
  if (!n) return [];
  const edge = Math.ceil(cols * reach(span / 2, window));
  return peaks(curve, Math.max(1, Math.round((span / 4 / window) * cols)), edge, cols - edge - 1)
    .map((c) => {
      const at = ((c + 0.5) / cols) * window;
      return { at, top: span, bottom: span / 8, score: curve[c] / n, path: [[at, span]] as const };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Where the music changes at the scale of `span` seconds (Foote 2000's novelty, on the scalograms): at each moment, the
 * distance between the mean spectrum over `span`/2 before and over `span`/2 after (each period up to `span`/2 in dB
 * against its mean), and its peaks, best first. It finds a lasting change of texture, not a moment.
 */
export function novelty(ss: readonly Scalogram[], span: number): Boundary[] {
  const { window } = ss[0] ?? { window: 0 };
  const cols = ss[0]?.rows[0]?.length ?? 0;
  const half = Math.max(1, Math.round((span / 2 / window) * cols));
  // (each row summed along time, for a mean over any stretch)
  const sums: Float64Array[] = [];
  for (const s of ss)
    byRow(s).forEach((row, i) => {
      if (s.periods[i] > span / 2) return;
      const acc = new Float64Array(cols + 1);
      for (let c = 0; c < cols; c++) acc[c + 1] = acc[c] + 10 * Math.log10(Math.max(1e-6, row[c]));
      sums.push(acc);
    });
  const curve = new Float64Array(cols);
  for (let c = half; c <= cols - half; c++) {
    let acc = 0;
    for (const s of sums) acc += ((s[c + half] - s[c]) / half - (s[c] - s[c - half]) / half) ** 2;
    curve[c] = Math.sqrt(acc / Math.max(1, sums.length));
  }
  return peaks(curve, Math.max(1, Math.round(half / 2)), half, cols - half)
    .filter((c) => curve[c] > 0)
    .map((c) => {
      const at = ((c + 0.5) / cols) * window;
      return { at, top: span, bottom: span, score: curve[c], path: [[at, span]] as const };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Boundaries found against the ones written. Only those found that reach up to `tall` seconds count; of them the best
 * as many as are written: the share that lands within `tolerance` of a written one (precision), the share of written
 * ones one lands on (recall), and what chance would give (the share of the window within `tolerance` of a written one).
 */
export function score(found: readonly Boundary[], written: readonly number[], window: number, tolerance: number, tall = 0) {
  const best = found.filter((c) => c.top >= tall).slice(0, written.length);
  const near = (t: number) => written.some((b) => Math.abs(b - t) <= tolerance);
  const hits = new Set(best.filter((c) => near(c.at)));
  let covered = 0;
  for (let k = 0; k < 1000; k++) if (near(((k + 0.5) / 1000) * window)) covered++;
  return {
    precision: best.length ? hits.size / best.length : 0,
    recall: written.length ? written.filter((b) => best.some((c) => Math.abs(b - c.at) <= tolerance)).length / written.length : 0,
    chance: covered / 1000,
    hits,
  };
}

/** A piece's sections (`sections` in engine/duration.ts: one round of the selector's steps) repeated over a window: a
 * loop's cycle is several rounds, a round as long as its last section is guessed to be (as long as the one before). */
export function sectionsOver(one: readonly { at: number; label: string }[], window: number): { at: number; label: string }[] {
  if (one.length < 2) return [...one];
  const round = 2 * one[one.length - 1].at - one[one.length - 2].at - one[0].at;
  if (!(round > 0)) return [...one];
  const out: { at: number; label: string }[] = [];
  for (let k = 0; k * round < window; k++) for (const x of one) if (x.at + k * round < window) out.push({ at: x.at + k * round, label: x.label });
  return out;
}
