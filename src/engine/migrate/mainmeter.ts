/**
 * Migrate (decision 089, #757): a tap that names no meter, in a piece with several meters with a tempo of their own,
 * read the first of them in the text. It is written with that meter's name, `step=4n` → `step=&minute:4n`: the meter it
 * read, checked by sound against the old way of reading it; witnessed by `fixtures/migrations/main-meter/`.
 */
import { attrsOf, declLine, setAttr } from '../edit';
import { parse } from '../parser';
import type { StepSpec } from '../ast';
import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';

/** Each bare tap of a piece with several meters: the tap of the first, named. */
export function mainMeters(source: string, result: Result): Rewrite<'main meter'>[] {
  const main = result.meters?.[0];
  if (!main) return [];
  const out: Rewrite<'main meter'>[] = [];
  for (const d of parse(source).cells) {
    if (d.lambda !== undefined || declLine(source, d.name) < 0) continue;
    // (its step=, and each time parameter that reads a tap: delaytime=8n, a tape's length=, a head's at=)
    const bare = (st: StepSpec | null | undefined) => st?.kind === 'tap' && !st.meter;
    const keys = [...(bare(d.step) ? ['step'] : []), ...Object.entries(d.paramClocks ?? {}).flatMap(([k, st]) => (bare(st) ? [k] : []))];
    for (const key of keys) {
      const written = attrsOf(source, d.name).get(key);
      if (written === undefined) continue;
      const at = declLine(source, d.name);
      const apply = (s: string) => setAttr(s, d.name, key, `&${main}:${written}`);
      out.push({
        id: `main meter:${d.name}:${key}`,
        tool: 'migrate',
        rule: 'main meter',
        title: `&${d.name}'s ${key}=${written} names no meter, and the piece has ${result.meters!.length}: ${key}=&${main}:${written}, the one it read (decision 089)`,
        before: source.split('\n')[at]!.trim(),
        after: apply(source).split('\n')[at]!.trim(),
        apply,
      });
    }
  }
  return out;
}
