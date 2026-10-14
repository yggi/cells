import { describe, expect, test } from 'vitest';
import { parse } from '../parser';
import { DEFAULT_ENV } from '../program';
import { context } from './context';
import { declare } from './declare';
import { SORT_RULES, sortOfCells } from './sorts';

describe('the sort rules', () => {
  test.each(SORT_RULES.map((r) => [r.sort, r.is, r] as const))('%s: %s — its example is one', (_, __, rule) => {
    const parsed = parse(rule.example.join('\n'));
    expect(parsed.diagnostics).toEqual([]);
    const ctx = context(parsed, DEFAULT_ENV);
    const { decls } = declare(ctx);
    const name = parsed.cells[parsed.cells.length - 1].name;
    // decided by this rule: the first that holds
    const seen = { decls, rateOf: ctx.rateOf };
    expect(SORT_RULES.find((r) => r.holds(decls.get(name)!, seen))).toBe(rule);
    expect(sortOfCells(ctx, decls)(name)).toBe(rule.sort);
  });
});
