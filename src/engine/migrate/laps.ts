/**
 * Migrate (decision 040, #75): a turning table's cycle= written when it counted steps, as the laps it counts now:
 * `&key step=cycle(&theme) stride=2 cycle=24` over the 12 → `cycle=2`, and cycle=12 on a 12 → none (one lap, the
 * default). Only a table stepped by a cell (a tapped one's cycle= counted its bars, then as now), whose cycle= is a whole
 * number of its own lengths, as the compiler's warning says. Exact by construction against the old meaning, which the
 * compiler no longer reads, so not checked by sound (`Rewrite.exact`); witnessed by `fixtures/migrations/laps/`.
 */
import { attrsOf, declLine, setAttr } from '../edit';
import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
import { parse } from '../parser';

/** Each table stepped by a cell whose cycle= is a whole number of its lengths: that many laps. */
export function laps(source: string, result: Result): Rewrite<'laps'>[] {
  const decls = new Map(parse(source).cells.map((d) => [d.name, d]));
  const out: Rewrite<'laps'>[] = [];
  for (const c of result.cells.values()) {
    const d = decls.get(c.name);
    const own = c.cycle;
    if (!d || d.step?.kind !== 'driven' || d.cycle === null || d.map || own < 2 || d.cycle < own || d.cycle % own !== 0) continue;
    if (attrsOf(source, c.name).get('cycle') !== String(d.cycle) || declLine(source, c.name) < 0) continue;
    const n = d.cycle / own;
    const apply = (s: string) => setAttr(s, c.name, 'cycle', n === 1 ? null : String(n));
    const at = declLine(source, c.name);
    out.push({
      id: `laps:${c.name}`,
      tool: 'migrate',
      rule: 'laps',
      title: `&${c.name}'s cycle=${d.cycle} counted steps: ${n === 1 ? 'one lap of its ' + own + ', the default' : `cycle=${n}, ${n} laps of its ${own}`} (decision 040)`,
      before: source.split('\n')[at]!.trim(),
      after: apply(source).split('\n')[at]!.trim(),
      apply,
      exact: true,
    });
  }
  return out;
}
