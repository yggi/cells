/**
 * Motifs: the same short figure heard more than once, and at more than one time scale. A figure is `length` notes in
 * a voice, read as its intervals (semitones) and its rhythm relative to its first gap (so it is the same played twice
 * as slow): the shape a canon augments, a fugue's subject in long notes, a bass that plays the tune's outline. Found
 * in the notes heard (Played), so in a MIDI file as well as in a piece: a target for Shorten (one cell, played at two
 * rates) and for the multiscale view (a figure at two heights of the tower).
 */
import type { Played } from '../realize';

/** A figure heard: where (voice, from its first note to its last, its lowest and highest pitch, Hz) and its scale (its
 * first gap, s). */
interface Occurrence {
  readonly voice: string;
  readonly at: number;
  readonly to: number;
  readonly lo: number;
  readonly hi: number;
  readonly scale: number;
}

/** A motif: its shape (intervals; rhythm), every time it is heard, and the scales it is heard at (distinct, ascending). */
export interface Motif {
  readonly shape: string;
  readonly heard: readonly Occurrence[];
  readonly scales: readonly number[];
}

/** Two scales are one when within this ratio of each other. */
const SAME_SCALE = 1.06;

/**
 * Every figure of `length` notes heard at least `times` times (across voices and time), with its scales. A rhythm is
 * rounded to quarters of its first gap, an interval to the semitone; a figure that stays on a note for two steps or
 * more isn't one (every pulse would be), nor one that leaps an octave or more. Most heard first, then most scales.
 */
export function motifs(events: readonly Pick<Played, 'at' | 'voice' | 'freq'>[], { length = 5, times = 2 } = {}): Motif[] {
  const byVoice = new Map<string, Pick<Played, 'at' | 'voice' | 'freq'>[]>();
  for (const e of events) if (e.freq > 0) push(byVoice, e.voice, e);
  const found = new Map<string, Occurrence[]>();
  for (const [voice, notes] of byVoice) {
    // (one note an onset: a chord's top note, its first heard)
    const line = [...notes].sort((a, b) => a.at - b.at || b.freq - a.freq).filter((e, i, xs) => i === 0 || e.at - xs[i - 1].at > 1e-4);
    for (let i = 0; i + length <= line.length; i++) {
      const fig = line.slice(i, i + length);
      const first = fig[1].at - fig[0].at;
      if (!(first > 0)) continue;
      const steps = fig.slice(1).map((e, k) => Math.round(12 * Math.log2(e.freq / fig[k].freq)));
      if (steps.filter((s) => s === 0).length >= 2 || steps.some((s) => Math.abs(s) >= 12)) continue;
      const rhythm = fig.slice(1, -1).map((e, k) => Math.round((4 * (fig[k + 2].at - e.at)) / first) / 4);
      // (a gap under an eighth of the first: a grace, a chord spread; not a figure's rhythm)
      if (rhythm.some((r) => r === 0)) continue;
      const shape = `${steps.join(' ')} | 1 ${rhythm.join(' ')}`;
      const fs = fig.map((e) => e.freq);
      push(found, shape, { voice, at: fig[0].at, to: fig[fig.length - 1].at, lo: Math.min(...fs), hi: Math.max(...fs), scale: first });
    }
  }
  return [...found]
    .filter(([, heard]) => heard.length >= times)
    .map(([shape, heard]) => {
      const scales: number[] = [];
      for (const s of heard.map((h) => h.scale).sort((a, b) => a - b)) if (!scales.length || s / scales[scales.length - 1] > SAME_SCALE) scales.push(s);
      return { shape, heard, scales };
    })
    .sort((a, b) => b.heard.length - a.heard.length || b.scales.length - a.scales.length);
}

/** The motifs heard at time scales `ratio` or more apart (augmented, diminished: not a tempo that drifts), the widest first. */
export function multiscale(ms: readonly Motif[], ratio = 1.4): Motif[] {
  return ms
    .filter((m) => m.scales[m.scales.length - 1] / m.scales[0] >= ratio)
    .sort((a, b) => b.scales[b.scales.length - 1] / b.scales[0] - a.scales[a.scales.length - 1] / a.scales[0]);
}

/** Add `x` to the list kept under `key`. */
function push<K, V>(m: Map<K, V[]>, key: K, x: V): void {
  const xs = m.get(key);
  if (xs) xs.push(x);
  else m.set(key, [x]);
}
