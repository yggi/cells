/**
 * Aliases: Strudel's or dough's other name for a parameter (decision 027), where ours is shorter — cutoff=800 is
 * lpf=800, sound=saw s=saw. The parser reads the two as one, so the respelling plays the same by construction.
 * (Normalise, #244, will write ours everywhere; this offers only what saves characters.)
 */
import { PARAM_ALIASES } from '../attributes';
import { attrsOf, renameAttr } from '../edit';
import { measured, type Result, type Suggestion } from './harness';

export function aliases(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of result.cells.values()) {
    if (c.implicit || c.lambda) continue;
    for (const [key, value] of attrsOf(source, c.name)) {
      const ours = PARAM_ALIASES[key];
      if (!ours || ours.length >= key.length) continue;
      const s = measured(source, {
        id: `alias:${c.name}:${key}`,
        kind: 'alias',
        title: `&${c.name}: ${key}= is Strudel's or dough's name for ${ours}= — write ours`,
        before: `${key}=${value}`,
        after: `${ours}=${value}`,
        apply: (src) => renameAttr(src, c.name, key, ours),
      });
      if (s) out.push(s);
    }
  }
  return out;
}
