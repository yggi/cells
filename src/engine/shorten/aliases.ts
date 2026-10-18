/**
 * Aliases: Strudel's or dough's other name for a parameter (decision 027), offered where ours is shorter — cutoff=800 is
 * lpf=800, sound=saw s=saw. The rule is Normalise's (`../normalise/aliases.ts`), which writes every one; this offers
 * only what saves characters.
 */
import { aliases as written } from '../normalise/aliases';
import { saves, type Result, type ShortenRewrite } from './harness';

export function aliases(source: string, result: Result): ShortenRewrite[] {
  return written(source, result, (alias, ours) => ours.length < alias.length).filter((s) => (saves(source, s) ?? 0) > 0);
}
