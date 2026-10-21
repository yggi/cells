/**
 * Recognition (decision 055, #224): given a heard text (a bar or a section the Muse wrote) and a library (the seed and a
 * learned layer's filed fragments), which fragments it is, by which of decision 052's operators, and how far: the
 * homeostat's sensor (yggi/jambot#237). A fragment's reading and its variations' are kept by text, so a recogniser warmed
 * on a library compiles only the heard text; the cache changes no answer. Stateless as the repository is (decision 048):
 * the share of bars recognised, and the ladder it drives, are the frontend's. Pure.
 */
import { PITCHED_OPERATORS, readVariations, RHYTHM_OPERATORS, type HeardNote, type Operator, type Readings, type VaryOptions } from '../engine/vary';
import type { Fragment } from './fragments';

/** Every operator, in decision 052's order: what recognition tries where a frontend names none. */
export const ALL_OPERATORS: readonly Operator[] = [...RHYTHM_OPERATORS, ...PITCHED_OPERATORS];

/** One step of a path: an operator on one line, as a variation's `by` names it (`drop &hat 6`). */
export interface PathStep {
  readonly operator: Operator;
  readonly line: string;
  readonly by: string;
}

/** A fragment the heard text is, by a path of operators (none: the fragment itself), and how far from what that path plays. */
export interface Recognised {
  readonly fragment: Fragment;
  /** The operators that map the fragment towards the heard text, first to last: none, one or two. */
  readonly path: readonly PathStep[];
  /**
   * The bar of the fragment's lap the heard text was matched from, 0 where the heard text is as long as the lap or
   * longer: a heard bar of a two-bar clave is matched against each of its bars, and the nearest is reported.
   */
  readonly bar: number;
  /** The notes that differ: those the heard text plays that the path doesn't, and those it plays that the heard text doesn't (S2, decision 050). */
  readonly distance: number;
}

/** What a recognition may say: the workbench both are read under, the tolerance, the depth, and Vary's options. */
export interface RecogniseOptions extends Omit<VaryOptions, 'operators'> {
  /** The operators a path may use, in this order; by default all six. */
  readonly operators?: readonly Operator[];
  /** The most notes that may differ, a whole number ≥ 0 (the licence's); by default 0, the notes exactly. */
  readonly tolerance?: number;
  /** The longest path: 0 (the fragments themselves), 1 (one operator, the default) or 2. */
  readonly depth?: 0 | 1 | 2;
}

/** A text's notes, as a multiset: each key, and how often it is played. */
type Notes = ReadonlyMap<string, number>;

const counted = (keys: readonly string[]): Notes => {
  const out = new Map<string, number>();
  for (const k of keys) out.set(k, (out.get(k) ?? 0) + 1);
  return out;
};

/** The notes two multisets don't share: the size of their symmetric difference. */
function apart(a: Notes, b: Notes, sizeA: number, sizeB: number): number {
  let shared = 0;
  for (const [k, n] of a) shared += Math.min(n, b.get(k) ?? 0);
  return sizeA + sizeB - 2 * shared;
}

/** One window of a candidate: the bar of its lap it starts on, and the notes it plays there. */
interface Window {
  readonly bar: number;
  readonly notes: Notes;
  readonly size: number;
  /** Its notes sorted and joined: the exact match's key. */
  readonly signature: string;
}

/** One candidate: what a fragment plays by one path, its lap and its bar, and its windows by the heard text's span. */
interface Candidate {
  readonly path: readonly PathStep[];
  readonly notes: readonly HeardNote[];
  readonly span: number | null;
  readonly bar: number | null;
  readonly windows: Map<number | null, readonly Window[]>;
}

/** An onset on the grid of 1/3840 of a whole note (every tap's), as a key writes it. */
const onset = (t: number) => (Math.round(t * 3840) / 3840).toFixed(6);

const windowOf = (bar: number, keys: readonly string[]): Window => ({ bar, notes: counted(keys), size: keys.length, signature: [...keys].sort().join('|') });

/**
 * A candidate's windows for a heard text of span `width` (whole notes): where the heard text is shorter than the
 * fragment's lap, one window of that width starting on each of its bars, the lap read round; else the lap repeated over
 * the width, from its start. Where either span is unknown (a grid none of the meter's), its notes as they are.
 */
function windowsOf(c: Candidate, width: number | null): readonly Window[] {
  const known = c.windows.get(width);
  if (known) return known;
  const { span, bar, notes } = c;
  let out: Window[];
  if (width === null || span === null || bar === null)
    out = [
      windowOf(
        0,
        notes.map((n) => (n.at === null ? n.key : `${onset(n.at)} ${n.key}`)),
      ),
    ];
  else {
    const eps = 1e-9;
    const starts = width < span - eps ? Array.from({ length: Math.ceil(span / bar - eps) }, (_, b) => b) : [0];
    out = starts.map((b) => {
      const keys: string[] = [];
      for (const n of notes) {
        if (n.at === null) keys.push(n.key);
        else for (let t = (((n.at - b * bar) % span) + span) % span; t < width - eps; t += span) keys.push(`${onset(t)} ${n.key}`);
      }
      return windowOf(b, keys);
    });
  }
  c.windows.set(width, out);
  return out;
}

const candidate = (path: readonly PathStep[], notes: readonly HeardNote[], r: Readings): Candidate => ({ path, notes, span: r.span, bar: r.bar, windows: new Map() });

export interface Recogniser {
  /**
   * The fragments of the library the heard text is within the tolerance, nearest first (by distance, then the shorter
   * path, then the library's order), each by its nearest path; none where nothing is within it. A fragment that plays
   * no notes Vary reads (a meter) is never recognised, nor is a heard text that plays none. Throws on a tolerance that
   * isn't a whole number ≥ 0, or a depth that isn't 0, 1 or 2.
   */
  recognise(text: string, library: readonly Fragment[], options?: RecogniseOptions): Recognised[];
}

/** A recogniser: it keeps each fragment's readings by its text and the options read under, which changes no answer. */
export function createRecogniser(): Recogniser {
  const readings = new Map<string, Readings>();
  const read = (text: string, vary: VaryOptions) => {
    const key = JSON.stringify([text, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
    let r = readings.get(key);
    if (!r) readings.set(key, (r = readVariations(text, vary)));
    return r;
  };
  const candidates = new Map<string, readonly Candidate[]>();
  /** A fragment's candidates' windows by their notes, for an exact match (tolerance 0): the nearest of each, by width. */
  const exact = new WeakMap<readonly Candidate[], Map<number | null, Map<string, { path: readonly PathStep[]; bar: number }>>>();
  const exactOf = (cs: readonly Candidate[], width: number | null) => {
    const byWidth = exact.get(cs) ?? new Map<number | null, Map<string, { path: readonly PathStep[]; bar: number }>>();
    exact.set(cs, byWidth);
    let index = byWidth.get(width);
    if (!index) {
      index = new Map();
      for (const c of cs)
        for (const w of windowsOf(c, width)) {
          const held = index.get(w.signature);
          if (!held || c.path.length < held.path.length) index.set(w.signature, { path: c.path, bar: w.bar });
        }
      byWidth.set(width, index);
    }
    return index;
  };
  const of = (fragment: Fragment, vary: VaryOptions, depth: number) => {
    const key = JSON.stringify([fragment.text, depth, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
    const known = candidates.get(key);
    if (known) return known;
    const out: Candidate[] = [];
    const source = read(fragment.text, vary);
    if (source.notes?.length) {
      out.push(candidate([], source.notes, source));
      const step = (v: Readings['variations'][number]['variation']): PathStep => ({ operator: v.rule, line: v.line, by: v.by });
      if (depth >= 1)
        for (const v of source.variations) {
          out.push(candidate([step(v.variation)], v.notes, source));
          if (depth >= 2) {
            const twice = read(v.variation.apply(fragment.text), vary);
            for (const w of twice.variations) out.push(candidate([step(v.variation), step(w.variation)], w.notes, twice));
          }
        }
    }
    candidates.set(key, out);
    return out;
  };

  return {
    recognise(text, library, options = {}) {
      const { tolerance = 0, depth = 1, operators = ALL_OPERATORS, ...rest } = options;
      if (!(Number.isInteger(tolerance) && tolerance >= 0)) throw new Error(`recognise: tolerance is ${String(tolerance)}, not a whole number ≥ 0`);
      if (depth !== 0 && depth !== 1 && depth !== 2) throw new Error(`recognise: depth is ${String(depth)}, not 0, 1 or 2`);
      const vary: VaryOptions = { ...rest, operators };
      const reading = readVariations(text, { ...vary, operators: [] });
      if (!reading.notes?.length) return [];
      const heard = windowsOf(candidate([], reading.notes, { ...reading, span: null }), null)[0]!;
      const out: Recognised[] = [];
      for (const fragment of library) {
        const cs = of(fragment, vary, depth);
        if (tolerance === 0) {
          const hit = exactOf(cs, reading.span).get(heard.signature);
          if (hit) out.push({ fragment, ...hit, distance: 0 });
          continue;
        }
        let best: Recognised | null = null;
        for (const c of cs)
          for (const w of windowsOf(c, reading.span)) {
            if (Math.abs(w.size - heard.size) > tolerance) continue;
            const distance = w.signature === heard.signature ? 0 : apart(w.notes, heard.notes, w.size, heard.size);
            if (distance > tolerance) continue;
            if (!best || distance < best.distance || (distance === best.distance && c.path.length < best.path.length)) best = { fragment, path: c.path, bar: w.bar, distance };
          }
        if (best) out.push(best);
      }
      return out
        .map((r, i) => [r, i] as const)
        .sort(([a, i], [b, j]) => a.distance - b.distance || a.path.length - b.path.length || a.bar - b.bar || i - j)
        .map(([r]) => r);
    },
  };
}
