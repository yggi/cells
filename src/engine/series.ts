/**
 * Series: a cell read as a stream of values over time (a modulating term, a
 * volume stream, a voice's moving parameter), and how a stream is sampled over
 * one note. Tables are looked up as they stand at each moment (`pitchOf`).
 */
import { resolveIn, semitones } from './helix';
import { clocking, EPS, shiftsAt } from './clocking';
import type { StepEvent } from './flatten';
import type { Plan } from './realize';

export interface Series {
  readonly sign: 1 | -1;
  /** map=lin: values ramp from step to step instead of holding. */
  readonly lin: boolean;
  /** map=db: values are decibels (0 full, −6 about half). */
  readonly db: boolean;
  /** null: a static term (no clock) — it holds its first value. */
  readonly clock: string | null;
  readonly rate: number;
  /** The cell's length in its own steps. */
  readonly period: number;
  readonly events: readonly StepEvent[];
}

export interface VoiceParam {
  readonly range: readonly [number, number] | null;
  readonly series: readonly Series[];
  readonly env: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number } | null;
}

/**
 * A parameter over one note: points (held, or ramp: glide there), or an
 * envelope from `from` up to `peak` and down to its sustain, released after the note.
 */
export type ParamTrack =
  | { readonly kind: 'points'; readonly points: readonly { readonly at: number; readonly value: number; readonly ramp?: boolean }[] }
  | { readonly kind: 'env'; readonly from: number; readonly peak: number; readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number };

/** A voice's moving parameters over one note [at, at + dur). */
export function paramTracks(p: Plan, voice: string, at: number, dur: number): Record<string, ParamTrack> | undefined {
  const vp = p.voiceParams.get(voice);
  if (!vp || Object.keys(vp).length === 0) return undefined;
  const out: Record<string, ParamTrack> = {};
  for (const [key, prm] of Object.entries(vp)) {
    const series = prm.series.map((m) => levelSeries(p, m, at, at + dur));
    // the factors, multiplied, at a time
    const product = (time: number) => series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1);
    const scaled = (x: number) => (prm.range ? prm.range[0] + (prm.range[1] - prm.range[0]) * x : x);
    if (prm.env && prm.range) {
      // an envelope per note: from the bottom of the range to its top scaled by the other factors (an accent, a knob) at the start
      out[key] = { kind: 'env', from: prm.range[0], peak: scaled(product(at)), ...prm.env };
    } else {
      const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
      out[key] = {
        kind: 'points',
        points: (times.length ? times : [at]).map((time) => ({
          at: time,
          value: scaled(product(time)),
          ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
        })),
      };
    }
  }
  return out;
}

/** Pitch of a step event, in semitones, looking tables up as they stand at `at`. */
export function pitchOf(p: Plan, e: StepEvent, at: number): number {
  const found = resolveIn(p.result, e.table, e.tableShift, e.value, e.alter, shiftsAt(p.result, p.statics, at + EPS, p.played));
  const r = e.transpose ? { ...found, position: found.position + e.transpose } : found; // ^n: grid steps up
  return semitones(p.result, r.root, r.position);
}

/**
 * A modulating term over [from, to): its value at `from`, then each change
 * (hold between steps). Rests hold the previous value; a static term holds
 * its first.
 */
export function modulation(p: Plan, m: Series, from: number, to: number): { at: number; semis: number; ramp?: boolean }[] {
  if (m.events.length === 0) return [{ at: from, semis: 0 }];
  if (!m.clock) return [{ at: from, semis: m.sign * pitchOf(p, m.events[0], from) }];
  if (m.lin) return rampedSeries(p, m, from, to, (e, at) => m.sign * pitchOf(p, e, at)).map((x) => ({ at: x.at, semis: x.v, ramp: x.ramp }));
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { at: number; semis: number }[] = [];
  // the value in force at `from`: the last event starting at or before c0
  const lap0 = Math.floor(c0 / m.period);
  let last: StepEvent | null = null;
  for (const lap of [lap0, lap0 - 1]) {
    for (const e of m.events) if (lap * m.period + e.step <= c0 + EPS) last = e;
    if (last) break;
  }
  out.push({ at: from, semis: last ? m.sign * pitchOf(p, last, from) : 0 });
  for (let lap = lap0; lap * m.period < c1; lap++) {
    for (const e of m.events) {
      const s = lap * m.period + e.step;
      if (s <= c0 + EPS || s >= c1 - EPS) continue;
      const at = tm.q(s / m.rate);
      out.push({ at, semis: m.sign * pitchOf(p, e, at) });
    }
  }
  return out;
}

/**
 * A ramped series (map=lin) over [from, to): the value at `from`, a ramp to each
 * step's value as it starts, and to the value at `to`. Values ramp from one
 * step's start to the next; the last holds until the braid starts again (a
 * step). Chords use their first value.
 */
function rampedSeries(p: Plan, m: Series, from: number, to: number, valueOf: (e: StepEvent, at: number) => number) {
  const tm = clocking(p.result, p.statics).map(m.clock!);
  const starts = [...new Map(m.events.map((e) => [e.step, e])).values()].sort((a, b) => a.step - b.step);
  const at = (c: number) => tm.q(c / m.rate);
  // the value at step c: between the step before and the step after (laps wrap)
  const valueAt = (c: number) => {
    const lap = Math.floor(c / m.period);
    const local = c - lap * m.period;
    let i = starts.length - 1;
    for (let k = 0; k < starts.length; k++) if (starts[k].step <= local + EPS) i = k;
    const a = starts[i];
    const aStep = a.step > local + EPS ? a.step - m.period : a.step;
    const va = valueOf(a, at(lap * m.period + aStep));
    // the last value holds: a braid ramps through its values, and starting again is a step
    if (i === starts.length - 1 || aStep < 0) return va;
    const b = starts[i + 1];
    const vb = valueOf(b, at(lap * m.period + b.step));
    return va + ((vb - va) * (local - aStep)) / Math.max(EPS, b.step - aStep);
  };
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  const out: { at: number; v: number; ramp: boolean }[] = [{ at: from, v: valueAt(c0), ramp: false }];
  for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
    for (const e of starts) {
      const c = lap * m.period + e.step;
      if (c > c0 + EPS && c < c1 - EPS) out.push({ at: at(c), v: valueOf(e, at(c)), ramp: e !== starts[0] });
    }
  out.push({ at: to, v: valueAt(c1 - 1e-6), ramp: true }); // just before the end, not the next pass's start
  return out;
}

/**
 * A volume stream over [from, to): its level at `from`, then each change.
 * Levels are the values as written (map=amp: 1 full, 0 silent); a rest is
 * silence; a stream that doesn't move holds its first value.
 */
export function levelSeries(p: Plan, m: Series, from: number, to: number): { at: number; level: number; ramp?: boolean }[] {
  const val = (e: StepEvent) => (m.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter));
  if (m.events.length === 0) return [{ at: from, level: 0 }];
  if (!m.clock) return [{ at: from, level: val(m.events[0]) }];
  if (m.lin) return rampedSeries(p, m, from, to, (e) => val(e)).map((x) => ({ at: x.at, level: Math.max(0, x.v), ramp: x.ramp }));
  const tm = clocking(p.result, p.statics).map(m.clock);
  let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
  let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
  // (a clock gone wild: hold where it was — the series keeps its first value)
  if (!Number.isFinite(c0)) c0 = 0;
  if (!Number.isFinite(c1)) c1 = c0;
  // the level at a step: the event sounding there (chords: the loudest), else silence
  const levelAt = (c: number) => {
    const local = c - Math.floor(c / m.period) * m.period;
    let best = -1;
    for (const e of m.events) if (local >= e.step - EPS && local < e.step + e.duration - EPS) best = Math.max(best, val(e));
    return best < 0 ? 0 : best;
  };
  const out: { at: number; level: number }[] = [{ at: from, level: levelAt(c0) }];
  const edges = new Set<number>();
  for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
    for (const e of m.events)
      for (const s of [lap * m.period + e.step, lap * m.period + e.step + e.duration]) if (s > c0 + EPS && s < c1 - EPS) edges.add(s);
  for (const s of [...edges].sort((a, b) => a - b)) {
    const level = levelAt(s + EPS * 10);
    if (level !== out[out.length - 1].level) out.push({ at: tm.q(s / m.rate), level });
  }
  return out;
}

/**
 * A series' value at a time: held series hold their last point; ramped ones
 * (any point with ramp) are interpolated between the points around it.
 */
export function valueThen<T extends { at: number; ramp?: boolean }>(s: readonly T[], time: number, v: (x: T) => number): number {
  let i = 0;
  for (let k = 0; k < s.length; k++) if (s[k].at <= time + EPS) i = k;
  const next = s[i + 1];
  if (!next?.ramp || Math.abs(s[i].at - time) < EPS) return v(s[i]);
  return v(s[i]) + ((v(next) - v(s[i])) * (time - s[i].at)) / Math.max(EPS, next.at - s[i].at);
}
