/**
 * Migrate (decision 093, #778): a second meter with a tempo of its own, derived from the piece's root meter, the first
 * in the text: its `step=` written as the tap of the root that steps it as its tempo did (`&waltz meter("3/4")
 * step=60bpm` under a 4/4 at 120 → `step=pulse/2`). Offered where the two rates are in a ratio of whole numbers, and
 * taken where it plays the same, read the old way (a second meter with a swing of its own, or a slider, does not: its
 * error stays, the author's). A clock of the wall (`loop=1d`) is no meter of the piece's, and is left. Witnessed by
 * `fixtures/migrations/one-root/`.
 */
import { attrsOf, declLine, setAttr } from '../edit';
import { derivedTap } from '../compiler/clocks';
import { parse } from '../parser';
import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';

/** Each second meter with a tempo of its own: the tap of the root that says its tempo. */
export function oneRoot(source: string, result: Result): Rewrite<'one root'>[] {
  const decls = new Map(parse(source).cells.map((d) => [d.name, d]));
  const roots = (result.meters ?? []).filter((m) => decls.has(m) && !decls.get(m)!.step?.whole);
  const root = roots[0] === result.mainMeter ? result.cells.get(roots[0]!) : undefined;
  if (!root?.meter || !result.clocks.has(root.name)) return [];
  const out: Rewrite<'one root'>[] = [];
  for (const name of roots.slice(1)) {
    const c = result.cells.get(name);
    const written = attrsOf(source, name).get('step');
    const at = declLine(source, name);
    if (!c || written === undefined || at < 0 || /free\(/.test(written) || !result.clocks.has(name)) continue;
    const tap = derivedTap(
      { meter: root.meter, perSecond: result.clocks.get(root.name)!.perSecond },
      { beat: c.beat, scan: !!c.scan, perSecond: result.clocks.get(name)!.perSecond },
    );
    if (!tap) continue;
    const apply = (s: string) => setAttr(s, name, 'step', tap);
    out.push({
      id: `one root:${name}`,
      tool: 'migrate',
      rule: 'one root',
      title: `&${name} is a second meter with a tempo of its own (step=${written}): derived from &${root.name}, step=${tap} (decision 093)`,
      before: source.split('\n')[at]!.trim(),
      after: apply(source).split('\n')[at]!.trim(),
      apply,
    });
  }
  return out;
}
