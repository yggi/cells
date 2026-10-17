/**
 * A migration (#18): a bare `swing=.67` on a meter, which leans the meter cell's own steps, written with the level it leans
 * (`swing=8n:.67`): the spelling the compiler's warning names, a note value of the meter's and not its cell's steps, so
 * that changing the meter's subdivision doesn't change what the swing means (decision 040). Offered when it plays the
 * same notes (checked here).
 */
import { attrsOf, declLine, setAttr } from '../edit';
import { bareSwingLevel } from '../meter';
import { samePiece, size, type Result, type Suggestion } from './harness';

/** Each meter with a bare swing=: the same swing with its level named, if it plays the same notes. */
export function swings(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of result.cells.values()) {
    const m = c.meter;
    // (the share as written, free(…) and all; one with its level named already is left alone)
    const written = m && typeof c.params.swing === 'number' ? attrsOf(source, c.name).get('swing') : undefined;
    if (!m || !written || /^[1-9][0-9]*(?:n\.?|t):/.test(written) || declLine(source, c.name) < 0) continue;
    const level = bareSwingLevel(m);
    if (!level) continue;
    const apply = (s: string) => setAttr(s, c.name, 'swing', `${level}:${written}`);
    const next = apply(source);
    if (next === source || !samePiece(source, next)) continue;
    const at = declLine(source, c.name);
    out.push({
      id: `swing:${c.name}`,
      kind: 'swing',
      title: `&${c.name}'s swing= leans the meter cell's own steps: name the level, swing=${level}:${written} (#18)`,
      before: source.split('\n')[at].trim(),
      after: next.split('\n')[at].trim(),
      saving: size(source) - size(next),
      apply,
    });
  }
  return out;
}
