/**
 * Law L18 (decision 088, #754): naming a number plays as the number. For every example, each plain number written in a
 * mix of its own lines (a gain in a product, semitones in a pitch sum) is given a cell of its own, `&L18_k 0.8`, and the mix names it:
 * the text plays what it played, note for note. A cell that is one number and nothing else is plain, as the number is.
 * With it, a sum of values (decision 079) is plain too: a level in a product (#755).
 */
import { describe, expect, it } from 'vitest';
import type { Expr } from './ast';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { parse } from './parser';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';

/** Plain data to compare: numbers to 9 significant digits. */
const plain = (x: unknown): unknown =>
  typeof x === 'number'
    ? +x.toPrecision(9)
    : Array.isArray(x)
      ? x.map(plain)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]))
        : x;
const played = (text: string, until = 40) => {
  const r = compileSource(text, undefined, { resolve: resolveSeed });
  return { r, events: r.ok ? plain(eventsBetween(plan(r, codeShifts(r)), 0, until)) : null };
};
const errors = (text: string) =>
  compileSource(text, undefined, { resolve: resolveSeed })
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

/** The text with every plain number of its mixes named (law L18), and how many it named. */
function named(text: string): { text: string; count: number } {
  const lines = text.split('\n');
  const edits = new Map<number, { col: number; len: number; with: string }[]>();
  const added: string[] = [];
  const visit = (e: Expr) => {
    if (e.k === 'sum') return e.items.forEach((it) => visit(it.e));
    if (e.k === 'prod') return e.factors.forEach(visit);
    if (e.k !== 'num') return;
    // (a number as written, digits alone: a free(…) or a number spelled another way is left as it is)
    const written = lines[e.span.line - 1]!.slice(e.span.col - 1, e.span.col - 1 + e.span.len);
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(written) || Number(written) !== e.value) return;
    const name = `L18_${added.length}`;
    added.push(`&${name} ${written}`);
    const list = edits.get(e.span.line) ?? [];
    list.push({ col: e.span.col, len: e.span.len, with: `&${name}` });
    edits.set(e.span.line, list);
  };
  for (const d of parse(text).cells) if (d.braid.kind === 'list') for (const t of d.braid.tokens) if (t.atom.kind === 'mix') for (const e of t.atom.exprs) visit(e);
  for (const [n, list] of edits) {
    let line = lines[n - 1]!;
    for (const x of [...list].sort((a, b) => b.col - a.col)) line = line.slice(0, x.col - 1) + x.with + line.slice(x.col - 1 + x.len);
    lines[n - 1] = line;
  }
  return { text: [...lines, ...added].join('\n'), count: added.length };
}

const HEAD = '&lead s=saw loop=C4\n&t step=2 0 2 4 5\n';

describe('law L18: naming a number plays as the number (decision 088)', () => {
  // law L18
  it('every example, the plain numbers of its mixes named, plays what it played', () => {
    let count = 0;
    const rewritten: string[] = [];
    for (const [key, { source }] of Object.entries(EXAMPLES)) {
      // (as written: its `from` lines read through the seed library, the numbers of its own mixes named)
      const text = source;
      const before = played(text);
      expect(before.r.ok, key).toBe(true);
      const n = named(text);
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
    expect(count).toBeGreaterThan(100);
    expect(rewritten.length).toBeGreaterThan(60);
  });

  it('a named gain is the gain, a named interval the interval', () => {
    const half = played(HEAD + '&out map=sample [&t * .5 * &lead]', 4).events;
    expect(played(HEAD + '&vol .5\n&out map=sample [&t * &vol * &lead]', 4).events).toEqual(half);
    expect(played(HEAD + '&vol .5\n&out map=sample [&vol * &lead * &t]', 4).events).toEqual(half);
    const octave = played(HEAD + '&out map=sample [(&t + 12) * &lead]', 4).events;
    expect(played(HEAD + '&oct 12\n&out map=sample [(&t + &oct) * &lead]', 4).events).toEqual(octave);
    // (a negative gain inverts the phase, named or not)
    expect(played(HEAD + '&inv -1\n&out map=sample [&t * &inv * &lead]', 4).events).toEqual(played(HEAD + '&out map=sample [&t * -1 * &lead]', 4).events);
    // (a slider's value now, as the number left free in the mix)
    expect(played(HEAD + '&vol free(.8, 0..1)\n&out map=sample [&t * &vol * &lead]', 4).events).toEqual(played(HEAD + '&out map=sample [&t * .8 * &lead]', 4).events);
    // (a gate's level names it as a product does)
    expect(played(HEAD + '&vol .5\n&g play=&t level=&vol &lead\n&out map=sample [&g]', 4).events).toEqual(
      played(HEAD + '&g play=&t level=.5 &lead\n&out map=sample [&g]', 4).events,
    );
  });

  it('what is more than one number stays what it was: a note by name, a table, a stepped line', () => {
    const up = played(HEAD + '&out map=sample [(&t + 2) * &lead]', 4).events;
    // (a note by name is a pitch: D, two semitones above the voice's C)
    expect(played(HEAD + '&k D\n&out map=sample [&t * &k * &lead]', 4).events).toEqual(up);
    // (a line stepped is a line of notes, held under the finer one)
    expect(played(HEAD + '&k step=.5 2\n&out map=sample [&t * &k * &lead]', 4).events).toEqual(up);
    expect(compileSource(HEAD + '&k 0 4 7\n&out map=sample [&t * &k * &lead]').cells.get('k')?.sort).toBe('pitch');
    expect(compileSource(HEAD + '&k 12\n&out map=sample [&t * &k * &lead]').cells.get('k')?.sort).toBe('plain');
  });

  it('a sum of values is a level in a product, and says what it is in a pitch sum (#755)', () => {
    const sum = '&a map=amp step=1 1 .2\n&b map=amp step=2 1 0\n&d [&a * .7 + &b * .3]\n';
    const r = compileSource(HEAD + sum + '&out map=sample [&t * &d * &lead]');
    expect(r.diagnostics).toEqual([]);
    const levels = eventsBetween(plan(r, codeShifts(r)), 0, 2).map((e) => +e.levels[0]!.level.toFixed(2));
    expect(levels).toEqual([1, 0.7, 0.44, 0.14]);
    expect(errors(HEAD + sum + '&out map=sample [(&t + &d) * &lead]')).toEqual([expect.stringContaining('&d is a sum of values')]);
  });
});
