/**
 * Hints (#158, decision 049): what Fold finds in the notes, as claims for Shorten. Fold doesn't know how to rewrite; it
 * finds what repeats, and says where and how, so Shorten knows where to look. This is the first kind, a **repeat**:
 * two or more spans of the lines alike, the same or moved (transposed by semitones, or degrees where the lines are in
 * degrees), or, read with `retrograde`, backwards. One finder for every tool that asks what repeats (Shorten's phrases,
 * the import, what is heard):
 *
 *  1. the folder's isometry names the shapes that come back (`pairs.ts`, Re-Pair over the lines' tokens);
 *  2. each shape is found at every place it stands, at any base, wherever Re-Pair's greedy pairing put it;
 *  3. its places are grown, all alike, as far as they agree at both ends (Re-Pair can stop a note short of a phrase's
 *     edge, or start a note late), so a repeat is maximal.
 *
 * Fold claims; it doesn't judge: the shapes are read as the finder makes them, not as the folder's printer keeps them (a
 * fold kept only when it prints shorter), since that judgement is Shorten's (decision 049). The variants, the stretches
 * and the figurations are hints of their own, later. A hint names events, not source: a line and a span of its steps on
 * the grid (`Line`, `ir.ts`), so it reads a MIDI file and a hand-written piece alike; `writtenHints` reads braids as
 * written, in token places.
 *
 * A repeat is exact as tokens (each place plays the same elements, moved alike), so its confidence is 1. Shorten checks
 * every rewrite it makes of a hint as of anything else (S1). Pure. */
import { pairs } from './pairs';
import { isElement, tokensOf } from './transpose';
import type { Folded, Line, Tok } from './ir';

/** A span of a line: its steps [from, to) on the grid, and the base the repeat is at there (null: no pitch, drums). */
export interface Span {
  readonly line: string;
  readonly from: number;
  readonly to: number;
  readonly base: number | null;
}

/**
 * How a span is its hint's first: the same, moved by `by` (semitones or degrees, as the lines are), or, read with
 * `retrograde`, the first backwards and moved by `by`.
 */
export type Transform = { readonly kind: 'same' } | { readonly kind: 'transposed'; readonly by: number } | { readonly kind: 'reversed'; readonly by: number };

/** What the lines are read for: their repeats forwards, and with `retrograde` backwards too. */
export interface HintOptions {
  readonly retrograde?: boolean;
}

/** A line read backwards, its name marked so (no name a piece writes holds a NUL). */
const BACK = '\u0000back';
const backwards = (l: Line): Line => ({ name: l.name + BACK, length: l.length, chords: l.chords.map((c) => ({ ...c, at: l.length - c.at - c.dur })) });

/** A repeat: spans alike, each with how it is the first (the first is `same`), and how sure Fold is. */
export interface RepeatHint {
  readonly kind: 'repeat';
  /** The folder's symbol for what repeats (`m3`): the same name for every span of one hint. */
  readonly symbol: string;
  readonly spans: readonly Span[];
  readonly transforms: readonly Transform[];
  /** 1: the folder's symbols are exact as tokens. */
  readonly confidence: number;
  /** Its length, in steps: every span's. */
  readonly length: number;
}

export type Hint = RepeatHint;

/** The fewest notes a repeat holds (chosen, #158): two notes moved alike are only an interval, which any line has. */
export const MIN_NOTES = 3;

/** A symbol's shape: its elements in order, each with its base above the symbol's (null: no pitch to move). */
type Shape = readonly { readonly key: string; readonly off: number | null }[];

/** The elements a symbol stands for, its children expanded, each with its base above the symbol's. */
function shapeOf(f: Folded, key: string, memo: Map<string, Shape>): Shape {
  if (isElement(key)) return [{ key, off: 0 }];
  const known = memo.get(key);
  if (known) return known;
  const shape = (f.rules.get(key)?.kids ?? []).flatMap((k) => shapeOf(f, k.key, memo).map((e) => ({ key: e.key, off: k.off === null || e.off === null ? null : k.off + e.off })));
  memo.set(key, shape);
  return shape;
}

/** A line as the scan reads it: its elements, and the step each starts on (and, last, its end). */
interface Read {
  readonly name: string;
  readonly toks: readonly Tok[];
  readonly at: readonly number[];
}

const stepsOf = (key: string) => Number(/^[rdn](\d+)/.exec(key)![1]);

/** A place in a line as read: its first element, how many, and the base it stands at (null: no pitch to move). */
interface Place {
  readonly line: Read;
  readonly i: number;
  readonly n: number;
  readonly base: number | null;
}

/** Every place the shape stands in the line, at any base, none overlapping the last: the same elements, each moved alike. */
function scan(shape: Shape, line: Read): Place[] {
  const out: Place[] = [];
  for (let i = 0; i + shape.length <= line.toks.length; i++) {
    if (out.length && out[out.length - 1]!.i + shape.length > i) continue;
    let base: number | undefined;
    const fits = shape.every((e, j) => {
      const t = line.toks[i + j]!;
      if (t.key !== e.key) return false;
      if (e.off === null || t.base === null) return e.off === null && t.base === null;
      base ??= t.base - e.off;
      return base === t.base - e.off;
    });
    if (fits) out.push({ line, i, n: shape.length, base: base ?? null });
  }
  return out;
}

/** Are these elements, one at each place (at offset `j` within it), alike: one key, each moved as its place is? */
function alike(ps: readonly Place[], j: (p: Place) => number): boolean {
  const ts = ps.map((p) => p.line.toks[j(p)]);
  if (ts.some((t) => !t || t.key !== ts[0]!.key)) return false;
  const offs = ts.map((t, k) => (t!.base === null ? null : ps[k]!.base === null ? NaN : t!.base - ps[k]!.base));
  return offs.every((o) => (o === null ? offs[0] === null : !Number.isNaN(o) && o === offs[0]));
}

/** A place in its line's own steps, as the line is written, whichever way it was read. */
function written({ line, i, n, base }: Place): Span {
  const from = line.at[i]!;
  const to = line.at[i + n]!;
  if (!line.name.endsWith(BACK)) return { line: line.name, from, to, base };
  const end = line.at[line.at.length - 1]!;
  return { line: line.name.slice(0, -BACK.length), from: end - to, to: end - from, base };
}

/** No two places overlap in the lines as written? */
const apart = (ps: readonly Place[]) => {
  const ss = ps.map(written);
  return ss.every((p, k) => ss.every((q, m) => m <= k || p.line !== q.line || p.to <= q.from || q.to <= p.from));
};

/**
 * The places grown, all alike, as far as they agree: the next element after each, then the one before each, while every
 * place's is the same moved as its place is, and no two places meet. Re-Pair's pairing is greedy, so a symbol can stop a
 * note short of a phrase's edge, or start a note late; the repeat is what all its places share (maximal at both ends).
 */
function grown(places: readonly Place[]): Place[] {
  let ps = [...places];
  const step = (next: Place[]) => (apart(next) ? ((ps = next), true) : false);
  while (alike(ps, (p) => p.i + p.n) && step(ps.map((p) => ({ ...p, n: p.n + 1 }))));
  while (ps.every((p) => p.i > 0) && alike(ps, (p) => p.i - 1) && step(ps.map((p) => ({ ...p, i: p.i - 1, n: p.n + 1 }))));
  return ps;
}

/** Does `inner` stand only inside `outer`, as many times: a part of it, not a repeat of its own (the repeats are maximal)? */
const within = (inner: RepeatHint, outer: RepeatHint) =>
  outer.length > inner.length &&
  outer.spans.length === inner.spans.length &&
  inner.spans.every((s) => outer.spans.some((o) => o.line === s.line && o.from <= s.from && s.to <= o.to));

/**
 * The repeats Fold finds in the lines: Re-Pair's symbols name the shapes that come back (`pairs.ts`), and each shape of
 * `MIN_NOTES` notes or more is a hint at every place it stands (two or more), wherever Re-Pair's greedy pairing put it,
 * but not one that stands only inside a longer repeat as often as it does; most covered first (its length times its
 * places), its places apart (none overlapping another). The lines' values may be semitones or degrees of a scale (`6#`): a transform is in what they are. With
 * `retrograde`, each line is read backwards as well, and a place found so is a `reversed` place of a hint that stands
 * forwards somewhere (one read only backwards is the forward reading's hint, said once).
 */
export function hints(lines: readonly Line[], { retrograde = false }: HintOptions = {}): Hint[] {
  const read = (retrograde ? [...lines, ...lines.map(backwards)] : lines).map((l): Read => {
    const toks = tokensOf(l);
    const at = [0];
    for (const t of toks) at.push(at[at.length - 1]! + stepsOf(t.key));
    return { name: l.name, toks, at };
  });
  const f = pairs({ lines: read.map((l) => ({ name: l.name, toks: l.toks })), rules: new Map() });
  const out: RepeatHint[] = [];
  const memo = new Map<string, Shape>();
  const seen = new Set<string>();
  for (const symbol of f?.rules.keys() ?? []) {
    const shape = shapeOf(f!, symbol, memo);
    if (shape.length < MIN_NOTES) continue;
    // (a place read backwards, in the line's own steps; one over a forward place of its own is a palindrome's, or near one)
    const found = read.flatMap((l) => scan(shape, l));
    if (found.length < 2) continue;
    const all = grown(found).map((p) => ({ s: written(p), back: p.line.name.endsWith(BACK) }));
    const at = (x: Span) => `${x.line}:${x.from}:${x.to}`;
    const forward = all.filter((x) => !x.back).map((x) => x.s);
    const overlaps = (x: Span) => forward.some((y) => y.line === x.line && y.from < x.to && x.from < y.to);
    // (places of one hint don't overlap: taken left to right, forwards first)
    const kept: typeof all = [];
    for (const x of all.filter((y) => !y.back || !overlaps(y.s)).sort((a, b) => +a.back - +b.back || a.s.line.localeCompare(b.s.line) || a.s.from - b.s.from))
      if (!kept.some((k) => k.s.line === x.s.line && k.s.from < x.s.to && x.s.from < k.s.to)) kept.push(x);
    if (kept.length < 2 || kept[0]!.back) continue;
    // (the same places read the other way round are one hint: its reversed reading is said once)
    const key = kept
      .map((x) => at(x.s))
      .sort()
      .join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const first = kept[0]!.s;
    const by = (s: Span) => (s.base === null || first.base === null ? 0 : s.base - first.base);
    const transforms = kept.map(({ s, back }): Transform => (back ? { kind: 'reversed', by: by(s) } : by(s) === 0 ? { kind: 'same' } : { kind: 'transposed', by: by(s) }));
    out.push({ kind: 'repeat', symbol, spans: kept.map((x) => x.s), transforms, confidence: 1, length: first.to - first.from });
  }
  // (most covered first; of two that cover as much, the one with more places: a period's shortest)
  return out
    .filter((h) => !out.some((g) => within(h, g)))
    .sort((a, b) => b.length * b.spans.length - a.length * a.spans.length || b.spans.length - a.spans.length || a.symbol.localeCompare(b.symbol));
}

/** A written step a repeat may move: a whole number, perhaps held (`7`, `-2@3`). */
const NOTE = /^(-?\d+)(?:@(\d+))?$/;

/**
 * The repeats in braids as written, each a list of its steps' tokens (Shorten's cells), in token places: one hint each,
 * its spans `[from, to)` indices of the tokens. A token is one step of its line, a held number (`7@2`) as long as it is
 * held, so a number moves and everything else (a rest, a chord, a reference, a degree with an accidental) is matched as
 * written. Shorten and the folder read one finder (#158).
 */
export function writtenHints(braids: readonly { readonly name: string; readonly tokens: readonly string[] }[]): Hint[] {
  const starts = new Map<string, Map<number, number>>();
  const ends = new Map<string, Map<number, number>>();
  const lines: Line[] = braids.map(({ name, tokens }) => {
    let at = 0;
    const from = new Map<number, number>();
    const to = new Map<number, number>();
    const chords = tokens.map((t, i) => {
      const m = NOTE.exec(t);
      const dur = m?.[2] ? Number(m[2]) : 1;
      from.set(at, i);
      const chord = { at, dur, values: [m ? m[1]! : `=${t}`] };
      at += dur;
      to.set(at, i + 1);
      return chord;
    });
    starts.set(name, from);
    ends.set(name, to);
    return { name, chords, length: at };
  });
  return hints(lines, { retrograde: true }).flatMap((h) => {
    const spans: Span[] = [];
    for (const s of h.spans) {
      const from = starts.get(s.line)!.get(s.from);
      const to = ends.get(s.line)!.get(s.to);
      // (a place that starts or ends inside a held note is no run of tokens)
      if (from === undefined || to === undefined) return [];
      spans.push({ ...s, from, to });
    }
    return [{ ...h, spans, length: spans[0]!.to - spans[0]!.from }];
  });
}
