/**
 * Folded lines as cells (docs/notes/fold.md): each symbol a cell of its own (its children at their offsets, a symbol
 * spliced `&name^$k`), each line a braid of its tokens; a run of one token `x!n`. And the cost model the β tool judges
 * by: what a symbol costs written once against what it saves where it is used. Pure: text out.
 */
import type { Folded, Rule, Tok } from './ir';
import { elementText, isElement, isLook } from './transpose';

/** A token as braid text at its base: an element, or a symbol or a figuration spliced (`&s3`, `&s3^$-5`; in degrees,
 * `caret` `^`: `&s3^2`). */
export function tokText(t: Tok, names: ReadonlyMap<string, string>, caret = '^$'): string {
  if (isElement(t.key)) return elementText(t.key, t.base);
  if (isLook(t.key)) return `&${names.get(t.key) ?? t.key}`;
  const name = names.get(t.key) ?? t.key;
  return t.base ? `&${name}${caret}${t.base}` : `&${name}`;
}

/** Texts as a braid, a run of one written `x!n`. */
function runs(texts: readonly string[]): string {
  const out: string[] = [];
  for (let i = 0; i < texts.length;) {
    let n = 1;
    while (i + n < texts.length && texts[i + n] === texts[i]) n++;
    out.push(n === 1 ? texts[i]! : `${texts[i]}!${n}`);
    i += n;
  }
  return out.join(' ');
}

/** Tokens as a braid: their texts, a run of one written `x!n`. */
const braid = (toks: readonly Tok[], names: ReadonlyMap<string, string>, caret = '^$'): string => runs(toks.map((t) => tokText(t, names, caret)));

/**
 * A variant as a copy of its phrase (decision 026): `base=&m1` (`^$n` where its own base sits elsewhere), then its steps
 * over the phrase's, `=` for each it keeps (`=!n`), the changed ones as they sound; nothing after the last change.
 */
function variantText(v: Rule, phrase: Rule, names: ReadonlyMap<string, string>, caret: string): string {
  const j = v.kids.findIndex((k, i) => !v.patched![i] && k.off !== null && phrase.kids[i]!.off !== null);
  const by = j < 0 ? 0 : v.kids[j]!.off! - phrase.kids[j]!.off!;
  const steps = v.kids.map((k, i) => (v.patched![i] ? tokText({ key: k.key, base: k.off }, names, caret) : '='));
  while (steps.length && steps[steps.length - 1] === '=') steps.pop();
  return `base=&${names.get(phrase.key) ?? phrase.key}${by ? `${caret}${by}` : ''} ${runs(steps)}`;
}

/** A symbol's children as tokens at their offsets (its base 0). */
export const kidsOf = (r: Rule): Tok[] => r.kids.map((k) => ({ key: k.key, base: k.off }));

/**
 * The folded lines as cells: the symbols in the order they are first used (each before the lines, named `prefix`1, 2 …
 * in that order), each figuration as its figure (one cell for figures alike), its table stepped a block at a time on
 * `clock` and the run reading it, and each line's braid and its clock (a step every k grid steps: `step=&tempo/k`).
 * `caret`: how a symbol moves, `^$` semitones (the grid) or `^` degrees (lines folded over a scale).
 */
export function printFolded(f: Folded, prefix = 'm', clock = '&tempo', caret = '^$'): { defs: string[]; lines: Map<string, string>; scales: Map<string, number> } {
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (toks: readonly Tok[]) => {
    for (const t of toks)
      if (!isElement(t.key) && !isLook(t.key) && !seen.has(t.key)) {
        seen.add(t.key);
        order.push(t.key);
        const r = f.rules.get(t.key)!;
        // (a variant names the phrase it copies)
        visit(r.of ? [{ key: r.of, base: null }] : kidsOf(r));
      }
  };
  for (const l of f.lines) visit(l.toks);
  const names = new Map(order.map((k, i) => [k, `${prefix}${i + 1}`]));
  const defs = order.map((k) => {
    const r = f.rules.get(k)!;
    return `&${names.get(k)} ${r.of ? variantText(r, f.rules.get(r.of)!, names, caret) : braid(kidsOf(r), names, caret)}`;
  });
  // the figurations: a figure cell for each figure, a table and a run for each
  const figures = new Map<string, string>();
  let n = 0;
  for (const [key, look] of f.looks ?? []) {
    n++;
    // (a figure that is a shorter one played k times is that one, played k times as often: two to a chord)
    let k = 1;
    for (let d = 2; d <= look.pattern.length; d++) {
      const p = look.pattern.length / d;
      if (Number.isInteger(p) && look.pattern.every((t, i) => t.key === look.pattern[i % p]!.key && t.base === look.pattern[i % p]!.base)) k = d;
    }
    const figure = braid(look.pattern.slice(0, look.pattern.length / k), names);
    if (!figures.has(figure)) {
      figures.set(figure, `figure${figures.size + 1}`);
      defs.push(`&${figures.get(figure)} ${figure}`);
    }
    const chord = (c: readonly number[]) => `[${c.join(',')}]`;
    // (the table steps from the piece's start: entries before the run, never read, are 0s)
    const pad = Math.round(look.start / look.dur);
    const chords = [...Array<string>(pad).fill('0'), ...look.chords.map(chord)];
    const table = `chords${n}`;
    // (each written out: a table counts entries, and `x!n` or `x@n` in one is one entry)
    defs.push(`&${table} step=${clock}/${look.dur * (look.scale ?? 1)} ${chords.join(' ')}`);
    names.set(key, `run${n}`);
    defs.push(`&run${n} over=&${table} &${figures.get(figure)}!${look.chords.length * k}`);
  }
  return { defs, lines: new Map(f.lines.map((l) => [l.name, braid(l.toks, names, caret)])), scales: new Map(f.lines.map((l) => [l.name, l.scale ?? 1])) };
}
