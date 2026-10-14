/**
 * Progressions: a pitch that only transposes another, written loop=&x/N with the bars multiplied out
 * (&changes loop=&bar/48 and twelve entries), is step=&x/(N/k) — it holds under the finer stepped
 * melody beside it (#10 F2) — and then its runs and fractions can be seen.
 */
import { attrsOf, setAttr } from '../edit';
import { measured, samePiece, type Result, type Suggestion } from './harness';

export function progressions(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of result.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.map || !c.loops || !c.steps) continue;
    const loop = attrsOf(source, c.name).get('loop');
    const m = loop ? /^&([A-Za-z_][A-Za-z0-9_]*)\/([0-9]+)$/.exec(loop) : null;
    if (!m || +m[2] % c.steps !== 0) continue;
    const per = +m[2] / c.steps;
    const step = `&${m[1]}${per > 1 ? `/${per}` : ''}`;
    const s = measured(source, {
      id: `progression:${c.name}`,
      kind: 'progression',
      title: `&${c.name}: loop=${loop} over ${c.steps} steps is a step every ${per} — step=${step}, held under the melody it moves`,
      before: `loop=${loop}`,
      after: `step=${step}`,
      apply: (src) => setAttr(setAttr(src, c.name, 'loop', null), c.name, 'step', step),
    });
    if (s && samePiece(source, s.apply(source))) out.push(s);
  }
  return out;
}
