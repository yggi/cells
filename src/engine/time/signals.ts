/**
 * A piece's notes as signals in time, for the scalogram (`wavelet.ts`; docs/notes/scalogram.md). What a note is worth
 * is the open question, so there are several, each hearing another kind of boundary:
 * - `impulses`: each note an impulse of its gain.
 * - `envelope`: each note held for its length at its gain: sound against silence, the breaks.
 * - `voices`: `impulses` per voice, their powers summed (no beating between voices that don't share a pulse): density.
 * - `change`: an impulse only where a voice moves to a new pitch, weighed by the interval (to an octave), or enters
 *   after a rest (an octave's worth): drops, entries.
 * - `harmony`: an impulse where a pitch class sounds that hasn't for `HARMONY_MEMORY` seconds: a key, a mode, a chord
 *   that changes under the same rhythm.
 */
import type { Played } from '../realize';
import { sum, transform, type Grid, type Scalogram } from './wavelet';

export const SIGNALS = ['impulses', 'envelope', 'voices', 'change', 'harmony'] as const;
export type Signal = (typeof SIGNALS)[number];

/** What a signal needs of a note. */
export type Onset = Pick<Played, 'at' | 'dur' | 'voice' | 'freq' | 'gains'>;

/** How long a pitch class is remembered (s): one heard again within it is nothing new. */
const HARMONY_MEMORY = 8;
/** A rest longer than this (s) and a voice's next note is an entry. */
const ENTRY = 0.5;
/** An impulse is put down as a Gaussian of this many samples, at its exact time: rounded onto a sparse grid, a pulse
 * faster than half the rate would come back as slow levels that aren't there (aliasing). */
const SIGMA = 1.2;

const gainOf = (e: Onset) => Math.max(e.gains[0], e.gains[1]);
const pitchClass = (freq: number) => (((Math.round(12 * Math.log2(freq / 440)) + 9) % 12) + 12) % 12;

/** The signals sampled on `g` (only those asked for), each a sample array. */
export function sampled(
  events: readonly Onset[],
  g: Grid,
  which: readonly Signal[] = SIGNALS,
): Partial<Record<Exclude<Signal, 'voices'>, Float64Array>> & { byVoice?: Float64Array[] } {
  const n = Math.max(1, Math.round(g.window * g.rate));
  const put = (x: Float64Array, t: number, w: number) => {
    const c = t * g.rate;
    for (let k = Math.max(0, Math.floor(c - 3 * SIGMA)); k <= Math.min(n - 1, Math.ceil(c + 3 * SIGMA)); k++)
      x[k] += (w * Math.exp(-(((k - c) / SIGMA) ** 2) / 2)) / (SIGMA * Math.sqrt(2 * Math.PI));
  };
  const want = new Set(which);
  const inside = events.filter((e) => e.at >= 0 && e.at < g.window).sort((a, b) => a.at - b.at);
  const out: Partial<Record<Exclude<Signal, 'voices'>, Float64Array>> & { byVoice?: Float64Array[] } = {};
  if (want.has('impulses')) {
    const x = new Float64Array(n);
    for (const e of inside) put(x, e.at, gainOf(e));
    out.impulses = x;
  }
  if (want.has('envelope')) {
    // (a held note: its start up and its end down, summed afterwards, so its edges are as smooth as an impulse)
    const edges = new Float64Array(n);
    for (const e of inside) {
      put(edges, e.at, gainOf(e));
      put(edges, Math.min(g.window, e.at + e.dur), -gainOf(e));
    }
    const x = new Float64Array(n);
    for (let i = 0, acc = 0; i < n; i++) x[i] = acc += edges[i];
    out.envelope = x;
  }
  if (want.has('voices') || want.has('change')) {
    const byVoice = new Map<string, Onset[]>();
    for (const e of inside) {
      const notes = byVoice.get(e.voice);
      if (notes) notes.push(e);
      else byVoice.set(e.voice, [e]);
    }
    const change = new Float64Array(n);
    const each: Float64Array[] = [];
    for (const notes of byVoice.values()) {
      const x = new Float64Array(n);
      let last: Onset | null = null;
      for (const e of notes) {
        put(x, e.at, gainOf(e));
        const entry = !last || e.at - (last.at + last.dur) > ENTRY;
        const w = entry ? 12 : Math.min(12, Math.abs(12 * Math.log2(e.freq / last!.freq)));
        if (w > 0.01) put(change, e.at, w * gainOf(e));
        last = e;
      }
      each.push(x);
    }
    if (want.has('change')) out.change = change;
    if (want.has('voices')) out.byVoice = each;
  }
  if (want.has('harmony')) {
    const x = new Float64Array(n);
    const heard = new Array<number>(12).fill(-Infinity);
    for (const e of inside) {
      if (!(e.freq > 0)) continue;
      const pc = pitchClass(e.freq);
      if (e.at - heard[pc] > HARMONY_MEMORY) put(x, e.at, gainOf(e));
      heard[pc] = e.at;
    }
    out.harmony = x;
  }
  return out;
}

/** The scalograms of the signals asked for (all by default), on grid `g`. */
export function scalograms(events: readonly Onset[], g: Grid, which: readonly Signal[] = SIGNALS): Partial<Record<Signal, Scalogram>> {
  const x = sampled(events, g, which);
  const out: Partial<Record<Signal, Scalogram>> = {};
  for (const s of which) {
    if (s === 'voices') {
      const each = x.byVoice ?? [];
      out.voices = each.length ? each.map((v) => transform(v, g)).reduce(sum) : transform(new Float64Array(Math.max(1, Math.round(g.window * g.rate))), g);
    } else out[s] = transform(x[s]!, g);
  }
  return out;
}
