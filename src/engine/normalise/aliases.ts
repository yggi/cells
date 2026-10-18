/**
 * Aliases: Strudel's or dough's other name for a parameter (decision 027), written as ours: cutoff=800 is lpf=800,
 * sound=saw s=saw, clip=.5 legato=.5 (#94: clip warns, Normalise rewrites it). The parser reads the two as one, so
 * the respelling plays the same by construction. Normalise writes every one; Shorten offers those where ours is shorter.
 */
import { PARAM_ALIASES } from '../attributes';
import { attrsOf, renameAttr } from '../edit';
import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';

/** Each parameter written with an alias, as ours; `only` keeps the ones a tool offers (ours shorter, for Shorten). */
export function aliases(source: string, result: CompileResult, only: (alias: string, ours: string) => boolean = () => true): Rewrite<'alias'>[] {
  const out: Rewrite<'alias'>[] = [];
  for (const c of result.cells.values()) {
    if (c.implicit || c.lambda) continue;
    const attrs = attrsOf(source, c.name);
    for (const [key, value] of attrs) {
      const ours = PARAM_ALIASES[key];
      // (an alias beside its own name is one parameter given twice, which the parser says: nothing to respell)
      if (!ours || attrs.has(ours) || !only(key, ours)) continue;
      out.push({
        id: `alias:${c.name}:${key}`,
        tool: 'normalise',
        rule: 'alias',
        title: `&${c.name}: ${key}= is Strudel's or dough's name for ${ours}= — write ours`,
        before: `${key}=${value}`,
        after: `${ours}=${value}`,
        apply: (src) => renameAttr(src, c.name, key, ours),
      });
    }
  }
  return out;
}
