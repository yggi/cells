/**
 * Recognition (decision 055, #224): given a heard text (a bar or a section the Muse wrote) and a library (the seed and a
 * learned layer's filed fragments), which fragments it is, by which of decision 052's operators, and how far: the
 * homeostat's sensor (yggi/jambot#237). A fragment's reading and its variations' are kept by text, so a recogniser warmed
 * on a library compiles only the heard text; the cache changes no answer. Stateless as the repository is (decision 048):
 * the share of bars recognised, and the ladder it drives, are the frontend's. Pure.
 */
import { PITCHED_OPERATORS, readVariations, RHYTHM_OPERATORS, type Operator, type Readings, type VaryOptions } from '../engine/vary';
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

/** One candidate: what a fragment plays by one path. */
interface Candidate {
  readonly path: readonly PathStep[];
  readonly notes: Notes;
  readonly size: number;
  /** Its notes sorted and joined: the exact match's key. */
  readonly signature: string;
}

const candidate = (path: readonly PathStep[], keys: readonly string[]): Candidate => ({
  path,
  notes: counted(keys),
  size: keys.length,
  signature: [...keys].sort().join('|'),
});

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
  const of = (fragment: Fragment, vary: VaryOptions, depth: number) => {
    const key = JSON.stringify([fragment.text, depth, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
    const known = candidates.get(key);
    if (known) return known;
    const out: Candidate[] = [];
    const source = read(fragment.text, vary);
    if (source.notes?.length) {
      out.push(candidate([], source.notes));
      const step = (v: Readings['variations'][number]['variation']): PathStep => ({ operator: v.rule, line: v.line, by: v.by });
      if (depth >= 1)
        for (const v of source.variations) {
          out.push(candidate([step(v.variation)], v.notes));
          if (depth >= 2) for (const w of read(v.variation.apply(fragment.text), vary).variations) out.push(candidate([step(v.variation), step(w.variation)], w.notes));
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
      const keys = readVariations(text, { ...vary, operators: [] }).notes;
      if (!keys?.length) return [];
      const heard = candidate([], keys);
      const out: Recognised[] = [];
      for (const fragment of library) {
        let best: Recognised | null = null;
        for (const c of of(fragment, vary, depth)) {
          if (Math.abs(c.size - heard.size) > tolerance) continue;
          const distance = c.signature === heard.signature ? 0 : tolerance === 0 ? Infinity : apart(c.notes, heard.notes, c.size, heard.size);
          if (distance > tolerance) continue;
          if (!best || distance < best.distance || (distance === best.distance && c.path.length < best.path.length)) best = { fragment, path: c.path, distance };
          if (distance === 0 && c.path.length === 0) break;
        }
        if (best) out.push(best);
      }
      return out
        .map((r, i) => [r, i] as const)
        .sort(([a, i], [b, j]) => a.distance - b.distance || a.path.length - b.path.length || i - j)
        .map(([r]) => r);
    },
  };
}
