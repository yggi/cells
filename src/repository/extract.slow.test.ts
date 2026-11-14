// #641's bound: over every example, every run of one or two consecutive declarations (not `from` lines) that defines a
// cell another line reads extracts and plays the same over 8 s, or says why it is no fragment yet. 1420 extract at the
// commit that built it; a later example adds more.
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../engine/examples';
import { extract } from './extract';
import { resolveSeed } from './library';
import { readFrom } from '../engine/parser/use';
import { splitComment } from '../engine/edit';

describe('every run of one or two declarations of every example, extracted (#641)', () => {
  it.each(Object.entries(EXAMPLES))('%s', (_, ex) => {
    const lines = ex.source.split('\n');
    // (a `from` line is no declaration to extract, its head's attributes before `from` or not: the parser's reading of it)
    const starts = lines.flatMap((l, i) => (/^\s*&\w/.test(l) && readFrom(splitComment(l)[0].trim()) === undefined ? [i + 1] : []));
    const runs = [...starts.map((s) => [s]), ...starts.flatMap((s, k) => (starts[k + 1] === s + 1 ? [[s, s + 1]] : []))];
    for (const run of runs) {
      const r = extract(ex.source, run, { id: 'extracted', resolve: resolveSeed, seconds: 8 });
      if (!('why' in r)) expect(r.same, `lines ${run.join(', ')}: ${r.line}`).toBe(true);
    }
  });
});
