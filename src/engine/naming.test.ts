/**
 * Law L17 (decision 087, #740): naming a sub-product plays as its parentheses do. For every example, each product in a
 * mix whose factors with no sound (pitches, volumes, plain levels, each named bare, and its numbers: at least two, at least
 * one a pitch) are pulled out into a cell of their own, `&L17_k [&a * &b * .3]`, and the product reads `&L17_k * <the rest>`: the text plays
 * what it played, note for note. The one exception is decision 079's: one line of plain numbers (no table) times numbers,
 * named, is a weighted value, not notes; those groups are left as written, and counted.
 */
import { describe, expect, it } from 'vitest';
import type { Expr } from './ast';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { parse } from './parser';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';
import { expansion, hasFrom } from './use';
import { valueSumOf } from './valuesum';

/** Plain data to compare: numbers to 9 significant digits. */
const plain = (x: unknown): unknown =>
  typeof x === 'number'
    ? +x.toPrecision(9)
    : Array.isArray(x)
      ? x.map(plain)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]))
        : x;
const played = (text: string) => {
  const r = compileSource(text);
  return { r, events: r.ok ? plain(eventsBetween(plan(r, codeShifts(r)), 0, 40)) : null };
};

/** The text with every voiceless sub-product of its mixes named (law L17), and how many it named. */
function named(text: string, sortOf: (name: string) => string | undefined): { text: string; count: number; skipped: number } {
  let skipped = 0;
  const lines = text.split('\n');
  const edits = new Map<number, { col: number; len: number; with: string }[]>();
  const added: string[] = [];
  const visit = (e: Expr) => {
    if (e.k === 'sum') return e.items.forEach((it) => visit(it.e));
    if (e.k !== 'prod' || !e.factors.every((f) => f.k === 'ref' || f.k === 'num')) return;
    const refs = e.factors.filter((f): f is Extract<Expr, { k: 'ref' }> => f.k === 'ref');
    const bare = (f: Extract<Expr, { k: 'ref' }>) => !f.ref.pick && !f.ref.slot && !f.ref.shift && !f.ref.degree && !f.ref.transpose && f.level === undefined;
    const cells = refs.filter((f) => bare(f) && ['pitch', 'volume', 'plain'].includes(sortOf(f.ref.name) ?? ''));
    // (the group: its voiceless cells and its numbers, two at least, a pitch among them, and something left to sound it)
    const voiceless: Expr[] = [...cells, ...e.factors.filter((f) => f.k === 'num')];
    if (voiceless.length < 2 || !cells.some((f) => sortOf(f.ref.name) === 'pitch') || cells.length === refs.length) return;
    // (one line, as written: a product across lines is left alone)
    if (e.factors.some((f) => (f.k === 'ref' ? f.ref.span.line : f.span.line) !== e.span.line)) return;
    const name = `L17_${added.length}`;
    const line = lines[e.span.line - 1]!;
    // (one line of plain numbers times numbers is 079's weighted value, not notes: the law's one exception, counted)
    const probe = parse(`${text}\n&${name} [${voiceless.map((f) => (f.k === 'ref' ? `&${f.ref.name}` : f.k === 'num' ? String(f.value) : '')).join(' * ')}]`).cells;
    if (valueSumOf(name, new Map(probe.map((d) => [d.name, d]))) !== null) {
      skipped++;
      return;
    }
    const written = (f: Expr) => (f.k === 'ref' ? line.slice(f.ref.span.col - 1, f.ref.span.col - 1 + f.ref.span.len) : line.slice(f.span.col - 1, f.span.col - 1 + f.span.len));
    added.push(`&${name} [${voiceless.map(written).join(' * ')}]`);
    const rest = e.factors.filter((f) => !voiceless.includes(f));
    const list = edits.get(e.span.line) ?? [];
    list.push({ col: e.span.col, len: e.span.len, with: [`&${name}`, ...rest.map(written)].join(' * ') });
    edits.set(e.span.line, list);
  };
  // (a line of one chord: a card's two channels on one line are left as written, their spans the test's to read)
  for (const d of parse(text).cells)
    if (d.braid.kind === 'list' && d.braid.tokens.filter((t) => t.atom.kind === 'mix').length === 1)
      for (const t of d.braid.tokens) if (t.atom.kind === 'mix') for (const e of t.atom.exprs) visit(e);
  for (const [n, list] of edits) {
    let line = lines[n - 1]!;
    for (const x of [...list].sort((a, b) => b.col - a.col)) line = line.slice(0, x.col - 1) + x.with + line.slice(x.col - 1 + x.len);
    lines[n - 1] = line;
  }
  return { text: [...lines, ...added].join('\n'), count: added.length, skipped };
}

describe('law L17: naming a sub-product plays as its parentheses do (decision 087)', () => {
  // law L17
  it('every example, its voiceless sub-products named, plays what it played', () => {
    let count = 0;
    let skipped = 0;
    const rewritten: string[] = [];
    for (const [key, { source }] of Object.entries(EXAMPLES)) {
      const text = hasFrom(source) ? expansion(source, { resolve: resolveSeed }).text : source;
      const before = played(text);
      if (!before.r.ok) continue;
      const n = named(text, (name) => before.r.cells.get(name)?.sort);
      skipped += n.skipped;
      if (!n.count) continue;
      const after = played(n.text);
      expect(
        after.r.diagnostics.filter((d) => d.severity === 'error'),
        key,
      ).toEqual([]);
      expect(after.events, key).toEqual(before.events);
      count += n.count;
      rewritten.push(key);
    }
    // (how many it named, so a change that names none is seen: 0 would prove nothing)
    expect(count).toBeGreaterThan(0);
    expect({ count, examples: rewritten.length, skipped }).toMatchInlineSnapshot(`
      {
        "count": 11,
        "examples": 8,
        "skipped": 8,
      }
    `);
  });

  it('a named product with no voice is its product: by name, in parentheses and written flat, the same notes', () => {
    const head = '&notes step=4 0 2 4 7\n&level map=amp step=4 1 .5 .8 .4\n&glass s=tri loop=C4\n';
    const flat = played(head + '&out map=sample [&notes * &level * &glass * .3]').events;
    expect(played(head + '&out map=sample [(&notes * &level) * &glass * .3]').events).toEqual(flat);
    expect(played(head + '&cycle [&notes * &level]\n&out map=sample [&cycle * &glass * .3]').events).toEqual(flat);
    // (named in turn: a name of a name)
    expect(played(head + '&lv [&level * .5]\n&cycle [&notes * &level]\n&out map=sample [&cycle * &glass * .3]').events).toEqual(flat);
  });

  it('it says what it is where it is no sound and no value', () => {
    const head = '&notes step=4 0 2 4 7\n&level map=amp step=4 1 .5 .8 .4\n&glass s=tri loop=C4\n&cycle [&notes * &level]\n';
    const msgs = (s: string) =>
      compileSource(head + s)
        .diagnostics.map((d) => d.message)
        .join('\n');
    expect(msgs('&pad s=saw loop=C3 lpf=200..2000 * &cycle\n&out map=sample [&notes * &pad]')).toMatch(/&cycle is notes with their levels/);
    expect(msgs('&out map=sample [&cycle * .3]')).toMatch(/&cycle is notes with their levels: multiply them by a voice/);
    expect(msgs('&out map=sample [&cycle[<<] * &glass]')).toMatch(/&cycle is notes with their levels .*named whole/);
    // (a mix with a voice is an instrument, a sum of values is 079's: neither is notes)
    expect(msgs('&inst [&notes * &glass]\n&out map=sample [&inst * .3]')).toBe('');
  });
});
