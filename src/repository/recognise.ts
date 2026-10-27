/**
 * Recognition (decision 055, #224): given a heard text (a bar or a section the Muse wrote) and a library (the seed and a
 * learned layer's filed fragments), which fragments it is, by which of decision 052's operators, and how far: the
 * homeostat's sensor (yggi/jambot#237). A fragment's reading and its variations' are kept by text, so a recogniser warmed
 * on a library compiles only the heard text; it keeps the 512 texts used last (#277), so a run of hours holds its memory
 * and its cost, and the cache changes no answer. Stateless as the repository is (decision 048):
 * the share of bars recognised, and the ladder it drives, are the frontend's. Pure.
 */
import { PITCHED_OPERATORS, readVariations, RHYTHM_OPERATORS, type HeardNote, type Operator, type Readings, type VaryOptions } from '../engine/vary';
import { declWords, splitComment } from '../engine/edit';
import { readUse } from '../engine/parser/use';
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
  /** The operators a path may use, in this order; by default all eight. */
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

/** A text's lines of code, a run of spaces one: what a reference's line is compared with. */
const codeLines = (text: string) => text.split('\n').map((l) => splitComment(l)[0].replace(/\s+/g, ' ').trim());

/** Whether `form` stands as an entry of a mix in `code`: `[&kick, &hat[<<]]`. */
function inMix(code: string, form: string): boolean {
  for (let at = code.indexOf(form); at >= 0; at = code.indexOf(form, at + 1)) {
    const before = code.slice(0, at).trimEnd().at(-1);
    const after = code.slice(at + form.length).trimStart()[0];
    if ((before === '[' || before === ',') && (after === ']' || after === ',' || after === '*')) return true;
  }
  return false;
}

export interface Recogniser {
  /**
   * The fragments of the library the heard text is within the tolerance, nearest first (by distance, then the shorter
   * path, then the library's order), each by its nearest path; none where nothing is within it. A fragment that plays
   * no notes Vary reads (a meter) is never recognised, nor is a heard text that plays none. Throws on a tolerance that
   * isn't a whole number ≥ 0, or a depth that isn't 0, 1 or 2.
   *
   * A heard text that writes a variation by its reference (#293: it uses the fragment, `use &hat from funk_drums`, and
   * writes a line as one of its variations' forms on it, `&hat2 base=&hat =!6 ~`, or a mix's entry, `&hat[<<]`) is
   * read as that path, with no search: the fragments it refers to so, in the library's order, each at distance 0, and
   * nothing else. Its notes aren't compared, nor is it compiled.
   */
  recognise(text: string, library: readonly Fragment[], options?: RecogniseOptions): Recognised[];
}

/** How many texts a recogniser keeps by default (#277): each a text read under one set of options. */
export const RECOGNISER_CAPACITY = 512;

/** How a recogniser keeps what it has read. */
export interface RecogniserOptions {
  /**
   * The most texts it keeps read, each under one set of options, a whole number ≥ 1 or `Infinity`; by default
   * `RECOGNISER_CAPACITY`. Past it, the text used longest ago is forgotten, and read again if it is met again.
   */
  readonly capacity?: number;
}

/** A recogniser that says how many texts it keeps. */
export interface KeepingRecogniser extends Recogniser {
  /** The texts it keeps read now, never more than its capacity. */
  readonly size: number;
}

/** What a recogniser keeps of one text read under one set of options: its readings, and its candidates by depth. */
interface Kept {
  readonly readings: Readings;
  readonly candidates: (readonly Candidate[] | undefined)[];
}

/**
 * A recogniser: it keeps the texts it reads, each fragment's readings and candidates by its text and the options read
 * under, the `capacity` used last (least recently used, #277), which changes no answer: a text forgotten is read again.
 * Throws on a capacity that isn't a whole number ≥ 1 or `Infinity`.
 */
export function createRecogniser({ capacity = RECOGNISER_CAPACITY }: RecogniserOptions = {}): KeepingRecogniser {
  if (!((Number.isInteger(capacity) || capacity === Infinity) && capacity >= 1))
    throw new Error(`createRecogniser: capacity is ${String(capacity)}, not a whole number ≥ 1 or Infinity`);
  // (a Map keeps its keys in the order set: one read is set again, last, and the first is the one used longest ago)
  const kept = new Map<string, Kept>();
  const keep = (text: string, vary: VaryOptions): Kept => {
    const key = JSON.stringify([text, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
    const known = kept.get(key);
    if (known) kept.delete(key);
    const k = known ?? { readings: readVariations(text, vary), candidates: [] };
    kept.set(key, k);
    if (kept.size > capacity) kept.delete(kept.keys().next().value!);
    return k;
  };
  const read = (text: string, vary: VaryOptions) => keep(text, vary).readings;
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
    const k = keep(fragment.text, vary);
    const known = k.candidates[depth];
    if (known) return known;
    const out: Candidate[] = [];
    const source = k.readings;
    if (source.notes?.length) {
      out.push(candidate([], source.notes, source));
      const step = (v: Readings['variations'][number]['variation']): PathStep => ({ operator: v.rule, line: v.line, by: v.by });
      if (depth >= 1)
        for (const v of source.variations) {
          out.push(candidate([step(v.variation)], v.notes, source));
          if (depth >= 2) {
            // (a variation's own reading is kept only in its fragment's candidates: kept apart, depth 2 would fill the capacity)
            const twice = readVariations(v.variation.apply(fragment.text), vary);
            for (const w of twice.variations) out.push(candidate([step(v.variation), step(w.variation)], w.notes, twice));
          }
        }
    }
    k.candidates[depth] = out;
    return out;
  };

  /** The library's fragments the text uses and writes a variation of by its reference, each by that one path. */
  const referencesIn = (text: string, library: readonly Fragment[], vary: VaryOptions): Recognised[] => {
    const code = codeLines(text);
    // (each id the text uses, and the names it takes from it: null, every line)
    const used = new Map<string, readonly string[] | null>();
    for (const l of code) {
      const u = readUse(l);
      if (!u) continue;
      const had = used.get(u.id);
      used.set(u.id, had === null || u.names === null ? null : [...(had ?? []), ...u.names]);
    }
    if (!used.size) return [];
    const out: Recognised[] = [];
    for (const fragment of library) {
      if (!used.has(fragment.id)) continue;
      const names = used.get(fragment.id);
      for (const { variation: v } of read(fragment.text, vary).variations) {
        const ref = v.reference;
        if (!ref || (names && !names.includes(v.line))) continue;
        const written = code.some((l) => {
          // (a line whose braid is the form, its own clock and table aside: `&late step=8n &gypsy^-2`, `&hat2 base=&hat =!6 ~`;
          // a pick, rotate's, may stand in a mix as it is)
          const name = /^&([A-Za-z_][A-Za-z0-9_]*)\s/.exec(l)?.[1];
          const w = name ? declWords(l, name) : null;
          return (w && [...w.attrs.filter((a) => a.startsWith('base=')), ...w.braid].join(' ') === ref.form) || (ref.line('r').startsWith('&r [') && inMix(l, ref.form));
        });
        if (written) {
          out.push({ fragment, path: [{ operator: v.rule, line: v.line, by: v.by }], bar: 0, distance: 0 });
          break;
        }
      }
    }
    return out;
  };

  return {
    get size() {
      return kept.size;
    },
    recognise(text, library, options = {}) {
      const { tolerance = 0, depth = 1, operators = ALL_OPERATORS, ...rest } = options;
      if (!(Number.isInteger(tolerance) && tolerance >= 0)) throw new Error(`recognise: tolerance is ${String(tolerance)}, not a whole number ≥ 0`);
      if (depth !== 0 && depth !== 1 && depth !== 2) throw new Error(`recognise: depth is ${String(depth)}, not 0, 1 or 2`);
      const vary: VaryOptions = { ...rest, operators };
      const referred = referencesIn(text, library, vary);
      if (referred.length) return referred;
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
