// Laws L20 and L21 (#782): every cell has one kind, and its sort is its kind's. One ordered table, `KIND_RULES`: every cell of a compiled piece has exactly one
// kind, the first rule that holds; each rule's example is a cell of its kind; and `docs/language/kinds.md` lists the
// table as it is.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { KIND_RULES, KINDS, kindsOf, SORT_OF_KIND, type Kind } from './kinds';
import { resolveSeed } from '../repository/library';

const PAGE = readFileSync(join(resolve(import.meta.dirname, '../..'), 'docs/language/kinds.md'), 'utf8');
const headOf = (line: string) => /^&([A-Za-z_]\w*)/.exec(line)![1]!;

describe('what a cell is: one table of kinds (#782)', () => {
  it('has one rule a kind, in the order the kinds are listed, and the last holds for any cell', () => {
    expect(KIND_RULES.map((r) => r.kind)).toEqual([...KINDS]);
    expect(new Set(KINDS).size).toBe(KINDS.length);
    expect(KIND_RULES[KIND_RULES.length - 1]!.kind).toBe('steps');
  });

  it.each(KIND_RULES.map((r) => [r.kind, r] as const))('%s: its example compiles, and its last line is one', (kind, rule) => {
    const result = compileSource(rule.example.join('\n'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kindsOf(result)(headOf(rule.example[rule.example.length - 1]!))).toBe(kind);
  });

  // law L20
  it('every cell of every example has one kind; the count of each', () => {
    const count = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
    for (const [key, p] of Object.entries(EXAMPLES)) {
      const result = compileSource(p.source, undefined, { resolve: resolveSeed });
      const kind = kindsOf(result);
      for (const c of result.cells.values()) {
        if (c.implicit || c.name === result.builtinCard) continue;
        const k = kind(c.name);
        expect(k, `${key}: &${c.name}`).not.toBeNull();
        count[k!]++;
      }
    }
    // (what the examples hold, so a rule that starts taking another's cells is seen: a count that moves is looked at)
    expect(count).toMatchInlineSnapshot(`
      {
        "band": 3,
        "blank": 70,
        "card": 94,
        "envelope": 440,
        "fill": 10,
        "gate": 25,
        "grid": 12,
        "groove": 74,
        "head": 15,
        "kit": 8,
        "line": 386,
        "meter": 94,
        "midi card": 4,
        "mix": 31,
        "note": 208,
        "number": 15,
        "phrase": 3,
        "ramp": 51,
        "resonator": 15,
        "role": 21,
        "scope": 10,
        "sections": 13,
        "selector": 16,
        "steps": 233,
        "style": 4,
        "sum": 20,
        "table": 52,
        "tape": 6,
        "tempo": 80,
        "voice": 392,
        "volume": 53,
        "wave": 16,
      }
    `);
  });

  // law L21
  it('a cell’s sort is its kind’s: what it is in a mix follows from what it is, for every cell of every example', () => {
    const said = KINDS.filter((k) => SORT_OF_KIND[k] !== null);
    // (four kinds don't say: a read head is its tape's, a fill what its fragment's code writes, and a card and a meter are never a mix's factor)
    expect(KINDS.filter((k) => SORT_OF_KIND[k] === null)).toEqual(['card', 'midi card', 'fill', 'head', 'meter']);
    let checked = 0;
    for (const [key, p] of Object.entries(EXAMPLES)) {
      const result = compileSource(p.source, undefined, { resolve: resolveSeed });
      const kind = kindsOf(result);
      for (const c of result.cells.values()) {
        if (c.implicit || c.name === result.builtinCard) continue;
        const k = kind(c.name)!;
        if (!said.includes(k)) continue;
        expect([`${key}: &${c.name}`, k, c.sort]).toEqual([`${key}: &${c.name}`, k, SORT_OF_KIND[k]]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2000);
    // (and each rule's example: its last line is of the sort its kind says)
    for (const rule of KIND_RULES) {
      const want = SORT_OF_KIND[rule.kind];
      const result = compileSource(rule.example.join('\n'));
      if (want !== null) expect([rule.kind, result.cells.get(headOf(rule.example[rule.example.length - 1]!))?.sort]).toEqual([rule.kind, want]);
    }
  });

  it('a kind is the cell’s own: read through, declared a section or named a modulator, it is what it was', () => {
    const text = ['&bar meter("4/4") step=84bpm', '&major scan(2 2 1 2 2 2 1)', '&tune over=&major step=4n 0 2 4', '&op s=sine loop=C5', '&lead s=saw loop=C4 fm=&op index=2'].join(
      '\n',
    );
    const kind = kindsOf(compileSource(text));
    expect(['major', 'tune', 'op', 'lead', 'nope'].map(kind)).toEqual(['table', 'line', 'voice', 'voice', null]);
  });

  it('the page lists every kind with its rule’s sentence and its example’s line, in order', () => {
    const rows = PAGE.split('\n').filter((l) => /^\| `/.test(l));
    expect(rows).toEqual(KIND_RULES.map((r) => `| \`${r.kind}\` | ${r.is} | ${SORT_OF_KIND[r.kind] ?? '—'} | \`${r.example[r.example.length - 1]}\` |`));
  });
});
