/**
 * Hints (#158, decision 049): what Fold finds in the notes, as claims for Shorten. Fold doesn't know how to rewrite; it
 * finds what repeats, and says where and how, so Shorten knows where to look. This is the first kind, a **repeat**:
 * two or more spans of the lines alike, the same or moved (transposed by semitones, or degrees where the lines are in
 * degrees), read off the symbols the folder's isometry makes (`pairs.ts`, Re-Pair over the lines' tokens), each
 * symbol's every place, nested ones too, at every scale. Fold claims; it doesn't judge: the symbols are read as the finder
 * makes them, not as the folder's printer keeps them (a fold kept only when it prints shorter), since that judgement is
 * Shorten's (decision 049). Re-Pair is greedy, so a symbol can run a note past a phrase's edge where the next note comes
 * back too, and a motif's places taken into a longer symbol are that symbol's: the variants, the stretches and the
 * figurations are hints of their own, later. A hint names events, not source: a line and a span of its steps on the grid
 * (`Line`, `ir.ts`), so it reads a MIDI file and a hand-written piece alike.
 *
 * A symbol is exact as tokens (each place plays its children at its base), so a repeat's confidence is 1. Shorten checks
 * every rewrite it makes of a hint as of anything else (S1). Pure.
 */
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

/** How a span is its hint's first: the same, or moved by `by` (semitones or degrees, as the lines are). */
export type Transform = { readonly kind: 'same' } | { readonly kind: 'transposed'; readonly by: number };

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

/** A symbol's notes, its children expanded. */
function notesOf(f: Folded, key: string, memo: Map<string, number>): number {
  if (isElement(key)) return 1;
  const known = memo.get(key);
  if (known !== undefined) return known;
  const n = f.rules.get(key)?.kids.reduce((m, k) => m + notesOf(f, k.key, memo), 0) ?? 1;
  memo.set(key, n);
  return n;
}

/** Does `inner` stand only inside `outer`, as many times: a part of it, not a repeat of its own (the repeats are maximal)? */
const within = (inner: RepeatHint, outer: RepeatHint) =>
  outer.length > inner.length &&
  outer.spans.length === inner.spans.length &&
  inner.spans.every((s) => outer.spans.some((o) => o.line === s.line && o.from <= s.from && s.to <= o.to));

/** A token's length in the grid's steps, its symbols expanded. */
function lengthOf(f: Folded, t: Tok, memo: Map<string, number>): number {
  if (isElement(t.key)) return Number(/^[rdn](\d+)/.exec(t.key)![1]);
  const look = f.looks?.get(t.key);
  if (look) return look.chords.length * look.dur;
  const known = memo.get(t.key);
  const one = known ?? f.rules.get(t.key)?.kids.reduce((n, k) => n + lengthOf(f, { key: k.key, base: null, ...(k.stretch ? { stretch: k.stretch } : {}) }, memo), 0) ?? 0;
  if (known === undefined) memo.set(t.key, one);
  return one * (t.stretch ?? 1);
}

/** Every place a symbol stands: its line, its steps and its base, its children's places within it too. */
function places(f: Folded): Map<string, Span[]> {
  const out = new Map<string, Span[]>();
  const memo = new Map<string, number>();
  const walk = (line: string, t: Tok, from: number, base: number | null, scale: number) => {
    const length = lengthOf(f, t, memo) * scale;
    const rule = f.rules.get(t.key);
    if (!rule) return length;
    const spans = out.get(t.key) ?? [];
    spans.push({ line, from, to: from + length, base });
    out.set(t.key, spans);
    let at = from;
    const inner = scale * (t.stretch ?? 1);
    for (const k of rule.kids)
      at += walk(line, { key: k.key, base: null, ...(k.stretch ? { stretch: k.stretch } : {}) }, at, base === null || k.off === null ? null : base + k.off, inner);
    return length;
  };
  for (const line of f.lines) {
    let at = 0;
    for (const t of line.toks) at += walk(line.name, t, at, t.base, line.scale ?? 1);
  }
  return out;
}

/**
 * The repeats Fold finds in the lines: one hint a symbol Re-Pair makes of `MIN_NOTES` notes or more, each of its places
 * (two or more), and not one that stands only inside a longer repeat as often as it does; most covered first (its length
 * times its places). The lines' values may be semitones or degrees of a scale (`6#`): a transform is
 * in what they are.
 */
export function hints(lines: readonly Line[]): Hint[] {
  const start: Folded = { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() };
  const f = pairs(start) ?? start;
  const out: RepeatHint[] = [];
  const memo = new Map<string, number>();
  for (const [symbol, found] of places(f)) {
    if (found.length < 2 || notesOf(f, symbol, memo) < MIN_NOTES) continue;
    const spans = [...found].sort((a, b) => a.line.localeCompare(b.line) || a.from - b.from);
    const first = spans[0]!;
    const transforms = spans.map((s): Transform =>
      s.base === null || first.base === null || s.base === first.base ? { kind: 'same' } : { kind: 'transposed', by: s.base - first.base },
    );
    out.push({ kind: 'repeat', symbol, spans, transforms, confidence: 1, length: first.to - first.from });
  }
  return out.filter((h) => !out.some((g) => within(h, g))).sort((a, b) => b.length * b.spans.length - a.length * a.spans.length || a.symbol.localeCompare(b.symbol));
}
