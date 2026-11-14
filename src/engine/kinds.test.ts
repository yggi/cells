// What a cell is (#782, rung 1): one ordered table of kinds, `KIND_RULES`. Every cell of a compiled piece has exactly one
// kind, the first rule that holds; each rule's example is a cell of its kind; and `docs/language/kinds.md` lists the
// table as it is.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { KIND_RULES, KINDS, kindsOf, type Kind } from './kinds';
import { resolveSeed } from '../repository/library';

const PAGE = readFileSync(join(resolve(import.meta.dirname, '../..'), 'docs/language/kinds.md'), 'utf8');
const headOf = (line: string) => /^&([A-Za-z_]\w*)/.exec(line)![1]!;

describe('what a cell is: one table of kinds (#782)', () => {
  it('has one rule a kind, in the order the kinds are listed, and the last holds for any cell', () => {
    expect(KIND_RULES.map((r) => r.kind)).toEqual([...KINDS]);
    expect(new Set(KINDS).size).toBe(KINDS.length);
    expect(KIND_RULES[KIND_RULES.length - 1]!.kind).toBe('braid');
  });

  it.each(KIND_RULES.map((r) => [r.kind, r] as const))('%s: its example compiles, and its last line is one', (kind, rule) => {
    const result = compileSource(rule.example.join('\n'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(kindsOf(result)(headOf(rule.example[rule.example.length - 1]!))).toBe(kind);
  });

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
        "band": 1,
        "braid": 334,
        "card": 88,
        "envelope": 399,
        "gate": 20,
        "grid": 12,
        "head": 15,
        "instrument": 27,
        "kit": 7,
        "law": 2,
        "level": 92,
        "line": 419,
        "meter": 88,
        "midi card": 3,
        "note": 196,
        "notes": 0,
        "number": 11,
        "resonator": 15,
        "role": 16,
        "scope": 10,
        "sections": 12,
        "selector": 12,
        "style": 3,
        "sum": 2,
        "tape": 6,
        "tempo": 74,
        "voice": 368,
      }
    `);
  });

  it('a kind is the cell’s own: read as a table, declared a section or named a modulator, it is what it was', () => {
    const text = ['&bar meter("4/4") step=84bpm', '&major scan(2 2 1 2 2 2 1)', '&tune over=&major step=4n 0 2 4', '&op s=sine loop=C5', '&lead s=saw loop=C4 fm=&op index=2'].join(
      '\n',
    );
    const kind = kindsOf(compileSource(text));
    expect(['major', 'tune', 'op', 'lead', 'nope'].map(kind)).toEqual(['braid', 'line', 'voice', 'voice', null]);
  });

  it('the page lists every kind with its rule’s sentence and its example’s line, in order', () => {
    const rows = PAGE.split('\n').filter((l) => /^\| `/.test(l));
    expect(rows).toEqual(KIND_RULES.map((r) => `| \`${r.kind}\` | ${r.is} | \`${r.example[r.example.length - 1]}\` |`));
  });
});
