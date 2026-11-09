/**
 * A meter found from onsets (#648, part of #15 and #35): the cycles a performance repeats, read as the meter cells writes,
 * a pulse grouped in twos and threes under a bar, a pair's swing a share of it (decision 071), the tempo a rate. It reads
 * only when notes start, how strongly, how long they last and how low they lie; it writes
 * `&bar from meter(grouping=…, swing=…) &tempo` (`meterText`), with a confidence for each choice. The steps:
 *
 *  1. `events`: notes struck together (within `TOGETHER`) are one event; its accent their weights, a long note more;
 *     its `low` the accent of its notes in the piece's lowest `LOW` (the bass, the kick: where a bar's line falls).
 *  2. `gridOf`: the tatum (Bilmes 1993), the coarsest grid nearly every event is on, straight or with its pairs leaning:
 *     the candidates are the gaps between events, their halves, thirds and quarters, and pairs of them, long and short.
 *     Read as written first (on the grid to 12 ms), as played where nothing holds so (to 45 ms; the autocorrelation's
 *     beat, `beatOf`, is then a candidate too, a played gap too loose to give the pulse to the ms).
 *  3. `barOf`: the bar over the grid: its length, the one whose lines take the most low accent and whose accents
 *     recur, under a prior on a bar's length (`BAR_PRIOR`); its beats, the groups whose starts take the most accent,
 *     equal or twos and threes, under a prior on a beat's length (`PREFERRED`) and on their count (`BEATS_PRIOR`).
 *  4. A bar of twos and threes that leans (`leaningGroups`): its pairs lean and its threes don't (decision 071), so no
 *     grid of pairs runs through it; it is read on a straight grid of eighths, the bar first, then each pair's lean.
 *
 * What it can't know is chosen by convention, and says so in its confidence: a strictly repeating bar is one bar or
 * two (the prior takes the bar nearest 2.4 s, so 4/4 over 2/4), and a tempo is one or its double (66 or 132 bpm).
 * Constant tempo: a performance whose tempo moves is read as one rate (its curve is #648's next rung). Measured on four
 * benches by `tools/cycles.ts`; `tools/cycles.test.ts` holds what each finds. Pure.
 */

/** A note struck: when (seconds), how strongly (0–1; 1 where unknown), how long, and how low (a MIDI key, if a pitch). */
export interface Onset {
  readonly at: number;
  readonly weight?: number;
  readonly dur?: number;
  readonly pitch?: number;
}

/** The share of a piece's notes, the lowest, whose accent marks a bar's line: the bass, the kick. */
export const LOW = 0.35;

/** Notes this close are struck together (a chord, a kick and a hat): one event. */
export const TOGETHER = 0.02;
/** The longest lag the autocorrelation reads: a slow bar's length. */
export const LONGEST = 8;
/** The autocorrelation's bins (seconds). */
const BIN = 0.005;
/** The beat's bounds (seconds): 240 to 40 bpm. */
export const BEAT = { shortest: 0.25, longest: 1.5 } as const;
/** The tempo a beat is likeliest at, and how widely (octaves) the prior spreads around it (Parncutt 1994; van Noorden & Moelants 1999). */
export const PREFERRED = { seconds: 0.55, octaves: 0.9 } as const;
/** How near a grid's place an event counts as on it, as a share of the beat. */
const NEAR = 0.035;

/** A struck moment: when, how strong (its notes' weights summed, longer and lower notes more), its lowest pitch. */
export interface Event {
  readonly at: number;
  readonly accent: number;
  /** The accent of its notes below the piece's middle pitch: where the bass and the kick fall, the bar's lines. */
  readonly low: number;
  readonly bass: number;
  readonly pitches: readonly number[];
  /** The longest of its notes (seconds): a long note begins on a strong beat more often than a short one. */
  readonly long: number;
}

/** Notes struck together as one event: its accent their weights, a long note and a low one weighing more. */
export function events(onsets: readonly Onset[]): Event[] {
  const sorted = [...onsets].sort((a, b) => a.at - b.at);
  const all = sorted.flatMap((o) => (o.pitch === undefined ? [] : [o.pitch])).sort((a, b) => a - b);
  const middle = all.length ? all[Math.floor(all.length * LOW)]! : -Infinity;
  const out: Event[] = [];
  let group: Onset[] = [];
  const weigh = (o: Onset) => (o.weight ?? 1) * (1 + Math.min(1, (o.dur ?? 0) / 0.5));
  const flush = () => {
    if (!group.length) return;
    const pitches = group.flatMap((o) => (o.pitch === undefined ? [] : [o.pitch]));
    const accent = group.reduce((s, o) => s + weigh(o), 0);
    const low = group.reduce((s, o) => s + (o.pitch !== undefined && o.pitch < middle ? weigh(o) : 0), 0);
    out.push({ at: group[0]!.at, accent, low, bass: pitches.length ? Math.min(...pitches) : 0, pitches, long: Math.max(0, ...group.map((o) => o.dur ?? 0)) });
    group = [];
  };
  for (const o of sorted) {
    if (group.length && o.at - group[0]!.at > TOGETHER) flush();
    group.push(o);
  }
  flush();
  return out;
}

/** The accent-weighted autocorrelation of the events, binned and smoothed: how much of the piece recurs after each lag. */
export function periodicity(es: readonly Event[], longest = LONGEST): Float64Array {
  const n = Math.ceil(longest / BIN) + 1;
  const raw = new Float64Array(n);
  for (let i = 0; i < es.length; i++)
    for (let j = i + 1; j < es.length; j++) {
      const lag = es[j]!.at - es[i]!.at;
      if (lag >= longest) break;
      const b = lag / BIN;
      const lo = Math.floor(b);
      // (split between the two bins it falls between)
      const w = es[i]!.accent * es[j]!.accent;
      raw[lo] = raw[lo]! + w * (1 - (b - lo));
      if (lo + 1 < n) raw[lo + 1] = raw[lo + 1]! + w * (b - lo);
    }
  // (smoothed by a Gaussian of 10 ms: a played onset is that loose; and as a share of the energy at lag 0)
  const out = new Float64Array(n);
  const sd = 2;
  for (let i = 0; i < n; i++) {
    let s = 0;
    let z = 0;
    for (let k = -3 * sd; k <= 3 * sd; k++) {
      const g = Math.exp(-(k * k) / (2 * sd * sd));
      z += g;
      if (i + k >= 0 && i + k < n) s += raw[i + k]! * g;
    }
    out[i] = s / z;
  }
  const zero = es.reduce((s, e) => s + e.accent * e.accent, 0) || 1;
  const span = Math.max(1e-9, (es.at(-1)?.at ?? 0) - (es[0]?.at ?? 0));
  // (fewer pairs reach a long lag: corrected by the share of the piece the lag leaves)
  for (let i = 0; i < n; i++) out[i] = out[i]! / zero / Math.max(0.25, 1 - (i * BIN) / span);
  return out;
}

const at = (h: Float64Array, seconds: number) => {
  const b = seconds / BIN;
  const lo = Math.floor(b);
  if (lo + 1 >= h.length) return 0;
  return h[lo]! * (1 - (b - lo)) + h[lo + 1]! * (b - lo);
};

/** How likely a beat of this length is, before the piece is heard. */
const prior = (seconds: number) => Math.exp(-0.5 * (Math.log2(seconds / PREFERRED.seconds) / PREFERRED.octaves) ** 2);

/** A grid of beats: its period and where one falls (seconds), and how sure. */
export interface Beat {
  readonly period: number;
  readonly phase: number;
  readonly confidence: number;
}

/** How much accent falls near a grid of `period` from `phase`, as a share of all of it. */
function onGrid(es: readonly Event[], period: number, phase: number, near = NEAR): number {
  let on = 0;
  let all = 0;
  for (const e of es) {
    const x = ((((e.at - phase) / period) % 1) + 1) % 1;
    const d = Math.min(x, 1 - x);
    all += e.accent;
    if (d <= near) on += e.accent;
  }
  return all ? on / all : 0;
}

/** The beat: the period whose multiples recur most, weighed by the prior; its phase, where the accents fall most. */
export function beatOf(es: readonly Event[], h = periodicity(es)): Beat | null {
  if (es.length < 8) return null;
  let best = { period: 0, score: -1 };
  const scores: { period: number; score: number }[] = [];
  for (let p = BEAT.shortest; p <= BEAT.longest; p += BIN / 2) {
    let s = 0;
    let k = 1;
    for (; k * p < LONGEST && k <= 8; k++) s += at(h, k * p);
    const score = (s / (k - 1)) * prior(p);
    scores.push({ period: p, score });
    if (score > best.score) best = { period: p, score };
  }
  if (best.score <= 0) return null;
  // (the phase, then the period refined against the events themselves: the least squares through those near the grid)
  let period = best.period;
  let phase = 0;
  for (let round = 0; round < 3; round++) {
    let top = -1;
    for (let i = 0; i < 64; i++) {
      const ph = es[0]!.at + (i / 64) * period;
      const s = onGrid(es, period, ph);
      if (s > top) [top, phase] = [s, ph];
    }
    const near = es.filter((e) => {
      const x = (e.at - phase) / period;
      return Math.abs(x - Math.round(x)) <= NEAR;
    });
    if (near.length < 4) break;
    // (t = phase + k·period, fitted)
    const ks = near.map((e) => Math.round((e.at - phase) / period));
    const n = near.length;
    const mk = ks.reduce((a, b) => a + b, 0) / n;
    const mt = near.reduce((a, e) => a + e.at, 0) / n;
    const sxx = ks.reduce((a, k) => a + (k - mk) ** 2, 0);
    if (sxx === 0) break;
    const sxy = ks.reduce((a, k, i) => a + (k - mk) * (near[i]!.at - mt), 0);
    period = sxy / sxx;
    phase = mt - period * mk;
  }
  const second = Math.max(0, ...scores.filter((s) => Math.abs(Math.log2(s.period / best.period)) > 0.2).map((s) => s.score));
  return { period, phase: phase - Math.floor((phase - es[0]!.at) / period) * period, confidence: 1 - second / best.score };
}

/** A bar: its pulse (seconds), its length in pulses and their groups (each a beat) from its start, its start (seconds), how sure. */
export interface Bar {
  readonly pulse: number;
  readonly groups: readonly number[];
  readonly start: number;
  readonly confidence: number;
}

/** Every way to write n as a sequence of 2s and 3s (2+2+3, 2+3+2 … each its own: the rotation is where the bar starts). */
function groupings(n: number): number[][] {
  if (n === 0) return [[]];
  if (n < 2) return [];
  return [...groupings(n - 2).map((g) => [2, ...g]), ...groupings(n - 3).map((g) => [3, ...g])];
}

/** The pulses' weights: per pulse of the grid, the accent of the events on it (`low`: of their low notes alone). */
function pulseAccents(es: readonly Event[], pulse: number, phase: number, places: (k: number) => number, low = false): Float64Array {
  const last = es.at(-1)!.at;
  const n = Math.max(1, Math.ceil((last - phase) / pulse) + 1);
  const acc = new Float64Array(n);
  for (const e of es) {
    const k = Math.round((e.at - phase) / pulse);
    if (k < 0 || k >= n) continue;
    if (Math.abs(e.at - (phase + places(k))) > pulse / 3) continue;
    acc[k] = acc[k]! + (low ? e.low : e.accent);
  }
  return acc;
}

/** How much each of the bar line's cues weighs, against the mean accent of a pulse (`lineCues`); chosen over the four benches. */
export const CUES = { harmony: 0.5, long: 0.5 } as const;

/**
 * A bar line's cues from the notes themselves, where nothing is louder (Temperley 2001, ch. 2: a strong beat prefers a
 * change of harmony and a long note): per pulse, the pitch classes that sound newly in about a beat from it against the
 * beat before it, as a share; and the longest note starting on it against the piece's median. Measured over the MIDI
 * library's 4/4 and 3/4 (`docs/notes/648-meter-finder.md`): in 3/4 both stand out on the bar's first beat (.67 new
 * against .52 and .57; 1.63 long against 1.33 and 1.39), in 4/4 beat 3 is nearly as strong as beat 1, so a bar of 4/4
 * and its half stay hard to tell apart. The bass, which moves on nearly every beat, tells nothing, and isn't a cue.
 */
function lineCues(es: readonly Event[], pulse: number, phase: number, places: (k: number) => number, n: number): Float64Array {
  const out = new Float64Array(n);
  if (!CUES.harmony && !CUES.long) return out;
  const on: (Event | undefined)[] = new Array(n);
  for (const e of es) {
    const k = Math.round((e.at - phase) / pulse);
    if (k >= 0 && k < n && Math.abs(e.at - (phase + places(k))) <= pulse / 3) on[k] = e;
  }
  const lengths = es
    .map((e) => e.long)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)]! : 0;
  // (about a beat: four pulses, a quarter on a sixteenth grid, at least .3 s and at most a second)
  const window = Math.min(1, Math.max(0.3, 4 * pulse));
  let j0 = 0;
  for (let k = 0; k < n; k++) {
    const t = phase + places(k);
    const e = on[k];
    if (CUES.harmony) {
      while (j0 < es.length && es[j0]!.at < t - window) j0++;
      const before = new Set<number>();
      const after = new Set<number>();
      for (let j = j0; j < es.length && es[j]!.at < t + window; j++) for (const p of es[j]!.pitches) (es[j]!.at < t - 1e-6 ? before : after).add(((Math.round(p) % 12) + 12) % 12);
      const fresh = [...after].filter((p) => !before.has(p)).length;
      out[k] = out[k]! + (CUES.harmony * fresh) / Math.max(1, after.size);
    }
    if (!e) continue;
    if (CUES.long && median) out[k] = out[k]! + CUES.long * Math.min(2, Math.log2(1 + e.long / median));
  }
  return out;
}

/** The bar's length a bar is likeliest at (seconds), and how widely (octaves): two to three seconds, a band's bar. */
export const BAR_PRIOR = { seconds: 2.4, octaves: 1 } as const;
/** How likely a bar of this many beats is, before it is heard: four and three as written most, two less, one least. */
const BEATS_PRIOR: Readonly<Record<number, number>> = { 1: 0.5, 2: 0.85, 3: 1, 4: 1, 5: 0.6, 6: 0.5, 7: 0.5, 8: 0.25 };

/**
 * The bar, over the pulses (`pulse` seconds apart from `phase`, pulse k at `places(k)`, a swung pulse late): its length,
 * the one whose bar lines take the most accent and recur, under a prior on a bar's length; then its beats, the groups
 * whose starts take the most accent, equal (2, 3 or 4 pulses each) or, on eighths, twos and threes (aksak).
 * The bar and its beats are chosen together: a bar whose beats are many and short is two bars.
 */
export function barOf(es: readonly Event[], pulse: number, phase: number, places: (k: number) => number, first = es[0]?.at ?? 0): Bar | null {
  const acc = pulseAccents(es, pulse, phase, places);
  if (acc.length < 16) return null;
  const mean = acc.reduce((a, b) => a + b, 0) / acc.length || 1;
  // (the bar's line is where the low notes fall, and a little where any do: a backbeat is often the loudest stroke)
  const lows = pulseAccents(es, pulse, phase, places, true);
  const cues = lineCues(es, pulse, phase, places, acc.length);
  // (a cue counts where it stands above its own mean: added evenly, it would only dull the contrast)
  const cueMean = cues.reduce((a, b) => a + b, 0) / (cues.length || 1);
  const line = acc.map((a, k) => Math.max(0, lows[k]! + 0.25 * a + (cues[k]! - cueMean) * mean));
  const lineMean = line.reduce((a, b) => a + b, 0) / line.length || 1;
  const recur = (n: number) => {
    let s = 0;
    let c = 0;
    for (let k = 0; k + n < line.length; k++) [s, c] = [s + line[k]! * line[k + n]!, c + 1];
    return c ? s / c / (lineMean * lineMean) : 0;
  };
  /** The mean weight of a bar line at pulses off, off + n, off + 2n …, over the mean. */
  const at = (n: number, off: number) => {
    let s = 0;
    let c = 0;
    for (let k = off; k < line.length; k += n) [s, c] = [s + line[k]!, c + 1];
    return c ? s / c / lineMean : 0;
  };
  // (the piece's first event is likelier a bar line than not: a pickup is the exception)
  const firstPulse = Math.round((first - phase) / pulse);
  const longest = Math.min(64, Math.floor(6 / pulse), Math.floor(acc.length / 3));
  /** Its beats: groups of the pulses from the bar line, the grouping whose starts take the most accent; and its score. */
  const beatsOf = (n: number, off: number): { groups: number[]; score: number } | null => {
    const candidates: number[][] = [];
    for (let size = 1; size <= n; size++) if (n % size === 0 && n / size <= 7) candidates.push(Array.from({ length: n / size }, () => size));
    // (aksak: twos and threes of a unit an eighth long, 100 to 400 ms)
    for (const unit of [1, 2, 4].filter((u) => u * pulse >= 0.1 && u * pulse <= 0.4 && n % u === 0 && n / u <= 12))
      for (const g of groupings(n / unit)) if (new Set(g).size > 1) candidates.push(g.map((x) => x * unit));
    let best: { groups: number[]; score: number } | null = null;
    for (const g of candidates) {
      const beatSeconds = (n * pulse) / g.length;
      if (beatSeconds < BEAT.shortest * 0.9 || beatSeconds > BEAT.longest * 1.4) continue;
      const starts = g.reduce<number[]>((s, x, i) => [...s, i ? s[i - 1]! + g[i - 1]! : 0], []);
      // (the accent at each beat but the bar line, against the pulses between)
      let on = 0;
      let offBeat = 0;
      let c = 0;
      for (let b = off; b + n <= acc.length; b += n, c++)
        for (let k = 1; k < n; k++) starts.includes(k) ? (on += acc[b + k]! / (starts.length - 1 || 1)) : (offBeat += acc[b + k]! / (n - starts.length || 1));
      if (!c) continue;
      // (beats a pulse long have no pulses between them to stand out from)
      const contrast = starts.length > 1 && starts.length < n ? (on + mean * 0.1) / (offBeat + mean * 0.1) : 1;
      const score = Math.sqrt(contrast) * prior(beatSeconds) * (BEATS_PRIOR[g.length] ?? 0.2) * (new Set(g).size > 1 ? 0.8 : 1);
      if (!best || score > best.score) best = { groups: g, score };
    }
    return best;
  };
  const bars: { n: number; off: number; score: number }[] = [];
  for (let n = 2; n <= longest; n++) {
    const r = Math.sqrt(Math.max(0, recur(n)));
    // (a bar of 5, 7, 10 … pulses is rarer than one of twos and threes: aksak is heard where it is plain, not by default)
    const smooth =
      [2, 3].reduce((m, f) => {
        while (m % f === 0) m /= f;
        return m;
      }, n) === 1;
    const p = Math.exp(-0.5 * (Math.log2((n * pulse) / BAR_PRIOR.seconds) / BAR_PRIOR.octaves) ** 2) * (smooth ? 1 : 0.7);
    for (let off = 0; off < n; off++) {
      const onFirst = (((firstPulse - off) % n) + n) % n === 0;
      bars.push({ n, off, score: at(n, off) * r * p * (onFirst ? 1.15 : 1) });
    }
  }
  bars.sort((a, b) => b.score - a.score);
  let best: { n: number; off: number; groups: number[]; score: number } | null = null;
  const totals: number[] = [];
  for (const b of bars.slice(0, 24)) {
    const beats = beatsOf(b.n, b.off);
    if (!beats) continue;
    const score = b.score * beats.score;
    totals.push(score);
    if (!best || score > best.score) best = { n: b.n, off: b.off, groups: beats.groups, score };
  }
  if (!best) return null;
  // (a bar whose halves are the same, its line as strong at each and as recurring, and whose half groups its beats in
  // twos and threes, is two bars of aksak: a doubled bar can't spell 2+3+3, and the prior on a bar's length would)
  if (best.n % 2 === 0 && best.n >= 8) {
    const h = best.n / 2;
    const off = best.off % h;
    const half = beatsOf(h, off);
    if (half && new Set(half.groups).size > 1 && at(h, off) >= 0.97 * at(best.n, best.off) && recur(h) >= 0.97 * recur(best.n))
      best = { n: h, off, groups: half.groups, score: best.score };
  }
  const others = totals.filter((x) => x < best!.score).sort((a, b) => b - a);
  return { pulse, groups: best.groups, start: phase + places(best.off), confidence: others.length ? 1 - others[0]! / best.score : 1 };
}

/** A meter found: its tempo (beats a minute, the beat as cells counts it), signature, grouping, swing and start. */
export interface Found {
  readonly bpm: number;
  /** The signature cells names it by (`4/4`, `6/8`, `7/8`), or its groups of eighths (`2+2+3`) where no signature is. */
  readonly signature: string;
  /** Its beats, each in eighths. */
  readonly groups: readonly number[];
  readonly swing: readonly { readonly level: '8n' | '16n'; readonly share: number }[];
  /** Where a bar starts (seconds). */
  readonly start: number;
  /** The bar's length (seconds). */
  readonly bar: number;
  readonly confidence: { readonly beat: number; readonly division: number; readonly bar: number };
}

/** The signatures cells names by rule (decision 072, `meter("sig")`), as their beats in eighths. */
const NAMED: Readonly<Record<string, string>> = {
  '2+2': '2/4',
  '2+2+2': '3/4',
  '2+2+2+2': '4/4',
  '2+2+2+2+2': '5/4',
  '3+3': '6/8',
  '3+3+3': '9/8',
  '3+3+3+3': '12/8',
  '3': '3/8',
  '4+4': '2/2',
  '4+4+4': '3/2',
  '3+2': '5/8',
  '3+2+2': '7/8',
  '3+2+3+2': '10/8',
};

/** The finest grid a performance plays on: a pulse (seconds) from a phase, and the share its pairs lean (.5 straight). */
export interface Grid {
  readonly pulse: number;
  readonly phase: number;
  /** The share of a pair of pulses at which its second falls: .5 an even grid, more a swung one (decision 071). */
  readonly share: number;
  /** The share of the accent on it. */
  readonly covered: number;
}

/** How near a grid's place an event counts as on it (seconds): a played note's looseness, and at most a share of the pulse. */
const tolerance = (pulse: number) => (played ? Math.min(0.045, Math.max(0.02, 0.2 * pulse)) : Math.min(0.03, Math.max(0.012, 0.08 * pulse)));

/**
 * Whether the onsets are read as played (a drummer's, a few tens of ms off the grid) or as written (on it to the ms):
 * `findMeter` reads them as written first, and as played where no grid holds them so. Set only inside `findMeter`.
 */
let played = false;

/** The share of the accent on a grid of pairs `2·pulse` long from `phase`, their seconds at `share` of the pair. */
function coverage(es: readonly Event[], pulse: number, phase: number, share = 0.5): number {
  const tol = tolerance(pulse);
  const pair = 2 * pulse;
  let on = 0;
  let all = 0;
  for (const e of es) {
    all += e.accent;
    const x = (((e.at - phase) % pair) + pair) % pair;
    const d = Math.min(x, pair - x, Math.abs(x - share * pair));
    if (d <= tol) on += e.accent;
  }
  return all ? on / all : 0;
}

/**
 * The tatum (Bilmes 1993): the coarsest grid nearly every event falls on, straight or with its pairs leaning. Its pulse
 * from 60 ms to 1 s; its phase one of the strongest events'; a lean tried where no straight grid holds the events.
 */
export function gridOf(es: readonly Event[], enough = 0.9): Grid | null {
  if (es.length < 8) return null;
  const strongest = [...es].sort((a, b) => b.accent - a.accent).slice(0, 12);
  const best = (pulse: number, share: number) => {
    let top = { phase: 0, covered: -1 };
    for (const e of strongest) {
      const c = coverage(es, pulse, e.at, share);
      if (c > top.covered) top = { phase: e.at, covered: c };
    }
    return top;
  };
  // (the candidates, from the gaps between events: each cluster of gaps and its halves, thirds and quarters; a swung pair
  // two clusters, long and short, its share the long one's)
  // (played, a gap is too loose to give the pulse to the ms: the beat the autocorrelation finds, fitted by least squares,
  // and its divisions too)
  const beat = played ? beatOf(es) : null;
  const clusters = [...gaps(es), ...(beat ? [beat.period, beat.period * 2] : [])];
  const straight = [...new Set(clusters.flatMap((c) => [1, 2, 3, 4, 6].map((k) => +(c / k).toFixed(6))))].filter((p) => p >= 0.06 && p <= 1).sort((x, y) => y - x);
  const leaning: { pulse: number; share: number }[] = [];
  for (const long of clusters)
    for (const short of clusters)
      if (long > short && long / (long + short) <= 0.8 && long / (long + short) >= 0.52) leaning.push({ pulse: (long + short) / 2, share: long / (long + short) });
  leaning.sort((x, y) => y.pulse - x.pulse);
  // (straight and leaning together, the coarsest first: a swung pair is coarser than the straight grid that would hold it,
  // five to a pair for a share of .6, three for 2/3; at one pulse, straight first)
  const all = [...straight.map((pulse) => ({ pulse, share: 0.5 })), ...leaning].sort((x, y) => y.pulse - x.pulse || Math.abs(x.share - 0.5) - Math.abs(y.share - 0.5));
  for (const need of [enough, enough - 0.1, enough - 0.2])
    for (const { pulse, share } of all) {
      const b = best(pulse, share);
      if (b.covered >= need) return refine(es, { pulse, phase: b.phase, share, covered: b.covered });
    }
  // (nothing holds 70 %: the candidate that holds most)
  let top: Grid | null = null;
  for (const p of straight) {
    const b = best(p, 0.5);
    if (!top || b.covered > top.covered * 1.05) top = { pulse: p, phase: b.phase, share: 0.5, covered: b.covered };
  }
  return top && refine(es, top);
}

/** The gaps between successive events, clustered (within 3 %): each cluster's mean, the commonest first, at most 8. */
function gaps(es: readonly Event[]): number[] {
  const ds = es
    .slice(1)
    .map((e, i) => e.at - es[i]!.at)
    .filter((d) => d >= 0.05 && d <= 2)
    .sort((a, b) => a - b);
  const out: { mean: number; n: number }[] = [];
  let run: number[] = [];
  const flush = () => run.length && out.push({ mean: run.reduce((a, b) => a + b, 0) / run.length, n: run.length });
  for (const d of ds) {
    if (run.length && d > run[0]! * 1.03) {
      flush();
      run = [];
    }
    run.push(d);
  }
  flush();
  return out
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
    .map((c) => c.mean);
}

/** A grid fitted to the events on it: the pulse and phase by least squares over the pair starts, the share by the mean. */
function refine(es: readonly Event[], g: Grid): Grid {
  const pair = 2 * g.pulse;
  const tol = tolerance(g.pulse);
  const starts: { k: number; at: number }[] = [];
  const seconds: number[] = [];
  for (const e of es) {
    const k = Math.round((e.at - g.phase) / pair);
    const x = e.at - g.phase - k * pair;
    if (Math.abs(x) <= tol) starts.push({ k, at: e.at });
    const k2 = Math.floor((e.at - g.phase) / pair);
    const y = (e.at - g.phase - k2 * pair) / pair;
    if (Math.abs(y - g.share) * pair <= tol) seconds.push(y);
  }
  if (starts.length < 4) return g;
  const n = starts.length;
  const mk = starts.reduce((a, s) => a + s.k, 0) / n;
  const mt = starts.reduce((a, s) => a + s.at, 0) / n;
  const sxx = starts.reduce((a, s) => a + (s.k - mk) ** 2, 0);
  if (!sxx) return g;
  const slope = starts.reduce((a, s) => a + (s.k - mk) * (s.at - mt), 0) / sxx;
  const share = g.share === 0.5 || !seconds.length ? g.share : seconds.reduce((a, b) => a + b, 0) / seconds.length;
  const phase = mt - slope * mk;
  return { pulse: slope / 2, phase: phase - Math.floor((phase - es[0]!.at) / slope) * slope, share, covered: coverage(es, slope / 2, phase, share) };
}

/**
 * A swing in a bar of twos and threes (decision 071: its pairs lean, its threes stay straight): no grid of pairs runs
 * through such a bar, so the finest grid is a fine straight one (five to a pair for a share of .6). Read instead: a
 * coarser straight grid that holds the bar's strokes on the eighths (`COARSE` of the accent or more), the bar and its
 * groups on it, then the place of each pair's second, its share; kept where that grid holds as much as the fine one.
 */
function leaningGroups(es: readonly Event[], fine: Grid): Found | null {
  const strongest = [...es].sort((a, b) => b.accent - a.accent).slice(0, 12);
  // (a fine grid that is straight is read again as the eighths: its pairs' seconds are what it misses)
  const loose = fine.share === 0.5;
  const tried = new Set<number>();
  for (const c of gaps(es)
    .flatMap((g) => [g, g / 2, g / 3])
    .sort((a, b) => b - a)) {
    if (c < (loose ? 0.97 : 1.8) * fine.pulse || c > 0.45 || [...tried].some((t) => Math.abs(t - c) < 0.01 * c)) continue;
    tried.add(c);
    let top = { phase: 0, covered: -1 };
    for (const e of strongest) {
      const cov = coverage(es, c, e.at);
      if (cov > top.covered) top = { phase: e.at, covered: cov };
    }
    if (top.covered < COARSE) continue;
    const found = leaningOn(es, fine, refine(es, { pulse: c, phase: top.phase, share: 0.5, covered: top.covered }));
    if (found) return found;
  }
  return null;
}

/** The bar on a straight grid of eighths, and its pairs' lean: null where its groups aren't twos and threes, or don't lean. */
function leaningOn(es: readonly Event[], fine: Grid, coarse: Grid): Found | null {
  const straight = (k: number) => k * coarse.pulse;
  const bar = barOf(es, coarse.pulse, coarse.phase, straight);
  if (!bar || !bar.groups.includes(2) || bar.groups.some((g) => g !== 2 && g !== 3)) return null;
  // (each pulse's place in the bar: its group, and its place in the group)
  const n = bar.groups.reduce((a, b) => a + b, 0);
  const starts = bar.groups.reduce<number[]>((s, x, i) => [...s, i ? s[i - 1]! + bar.groups[i - 1]! : 0], []);
  const pair = 2 * coarse.pulse;
  const seconds: number[] = [];
  for (const e of es) {
    const k = Math.floor((e.at - bar.start) / coarse.pulse + 1e-9);
    const inBar = ((k % n) + n) % n;
    const g = groupAt(starts, inBar);
    if (bar.groups[g] !== 2) continue;
    const x = (e.at - bar.start - (k - (inBar - starts[g]!)) * coarse.pulse) / pair;
    if (x > 0.3 && x < 0.85) seconds.push(x);
  }
  if (seconds.length < 4) return null;
  seconds.sort((a, b) => a - b);
  const share = seconds[Math.floor(seconds.length / 2)]!;
  if (Math.abs(share - 0.5) <= 0.02) return null;
  // (the grid it reads: each pair's second at the share, a three's pulses even)
  const places = (k: number) => {
    const inBar = ((k % n) + n) % n;
    const g = groupAt(starts, inBar);
    const at = k - (inBar - starts[g]!);
    return (at + (bar.groups[g] === 2 && inBar - starts[g]! === 1 ? 2 * share : inBar - starts[g]!)) * coarse.pulse;
  };
  let on = 0;
  let all = 0;
  const tol = tolerance(coarse.pulse);
  for (const e of es) {
    all += e.accent;
    const k = Math.round((e.at - bar.start) / coarse.pulse);
    if ([k - 1, k, k + 1].some((j) => Math.abs(e.at - bar.start - places(j)) <= tol)) on += e.accent;
  }
  if (!all || on / all < fine.covered - 0.02 || on / all < 0.85) return null;
  const key = bar.groups.join('+');
  const length = n * coarse.pulse;
  return {
    bpm: (60 * bar.groups.length) / length,
    signature: NAMED[key] ?? key,
    groups: bar.groups,
    swing: [{ level: '8n', share }],
    start: bar.start,
    bar: length,
    confidence: { beat: on / all, division: on / all, bar: bar.confidence },
  };
}

/** The group a pulse of the bar is in: the last whose start is at it or before it. */
function groupAt(starts: readonly number[], pulse: number): number {
  let g = 0;
  while (g + 1 < starts.length && starts[g + 1]! <= pulse) g++;
  return g;
}

/** The share of the accent a coarser straight grid must hold to be read as the eighths of a bar that leans by groups. */
const COARSE = 0.75;

/** A meter found from onsets: the finest grid, the bar over it, its beats; null where too little is heard to say. */
export function findMeter(onsets: readonly Onset[]): Found | null {
  const written = findOn(onsets, false);
  if (written && written.confidence.beat >= 0.85) return written;
  const loose = findOn(onsets, true);
  return loose && (!written || loose.confidence.beat > written.confidence.beat) ? loose : written;
}

/** A meter found with the onsets read as written or as played (`tolerance`). */
function findOn(onsets: readonly Onset[], asPlayed: boolean): Found | null {
  played = asPlayed;
  try {
    return findGrid(onsets);
  } finally {
    played = false;
  }
}

function findGrid(onsets: readonly Onset[]): Found | null {
  const es = events(onsets);
  const grid = gridOf(es);
  if (!grid) return null;
  const aksak = leaningGroups(es, grid);
  if (aksak) return aksak;
  const places = (k: number) => {
    const b = Math.floor(k / 2);
    return (b * 2 + (k - b * 2 ? 2 * grid.share : 0)) * grid.pulse;
  };
  const bar = barOf(es, grid.pulse, grid.phase, places);
  if (!bar) return null;
  // (the eighth: a beat of 2 or 3 pulses is in eighths, of 4 or 6 in sixteenths, of 8 or 12 in thirty-seconds; a beat of
  // one pulse, its pulses quarters)
  const b = Math.min(...bar.groups);
  const per = b <= 1 ? 0.5 : b <= 3 ? 1 : b <= 6 ? 2 : 4;
  let eighths = bar.groups.map((g) => g / per);
  let swing8 = per === 1 ? grid.share : 0.5;
  const swing16 = per === 2 ? grid.share : 0.5;
  // (a beat of three pulses whose middle is never played is a swung pair, two to a beat at 2/3: cells writes a beat so)
  if (per === 1 && bar.groups.every((g) => g === 3)) {
    const acc = pulseAccents(es, grid.pulse, grid.phase, places);
    let mid = 0;
    let last = 0;
    for (let k = 0; k < acc.length; k++) {
      const i = (((k - Math.round((bar.start - grid.phase) / grid.pulse)) % 3) + 3) % 3;
      if (i === 1) mid += acc[k]!;
      if (i === 2) last += acc[k]!;
    }
    if (mid <= 0.05 * last && last > 0) {
      eighths = bar.groups.map(() => 2);
      swing8 = 2 / 3;
    }
  }
  const whole = eighths.every((g) => Number.isInteger(g));
  const key = (whole ? eighths : bar.groups).join('+');
  const seconds = bar.pulse * bar.groups.reduce((a, c) => a + c, 0);
  const swing = [
    ...(Math.abs(swing8 - 0.5) > 0.02 ? [{ level: '8n' as const, share: swing8 }] : []),
    ...(Math.abs(swing16 - 0.5) > 0.02 ? [{ level: '16n' as const, share: swing16 }] : []),
  ];
  return {
    bpm: (60 * bar.groups.length) / seconds,
    signature: NAMED[key] ?? key,
    groups: whole ? eighths : bar.groups,
    swing,
    start: bar.start,
    bar: seconds,
    confidence: { beat: grid.covered, division: grid.covered, bar: bar.confidence },
  };
}

/** A found meter as cells writes it: the meter fragment taken with its grouping and swing, and the tempo a rate. */
export function meterText(f: Found): string {
  const sig = `meter("${f.signature}")`;
  const args = [
    ...(f.signature === '4/4' ? [] : [`grouping=${sig}`]),
    ...(f.swing.length ? [`swing=${f.swing.map((s) => `${s.level}:${String(+s.share.toFixed(2)).replace(/^0\./, '.')}`).join(',')}`] : []),
  ];
  return `&bar from meter${args.length ? `(${args.join(', ')})` : ''} &tempo\n&tempo step=${Math.round(f.bpm)}bpm`;
}
