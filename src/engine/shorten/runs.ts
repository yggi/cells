/**
 * Runs: the same step written again and again, counted — `0 0 0 0` → `0!4`.
 */
import { setBraid } from '../edit';
import { measured, type Candidate, type Suggestion } from './harness';

/** Runs: the same step written again and again. */
export function runs(source: string, cells: readonly Candidate[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of cells) {
    const next: string[] = [];
    const shown: string[] = [];
    for (let i = 0; i < c.tokens.length;) {
      let k = 1;
      while (i + k < c.tokens.length && c.tokens[i + k] === c.tokens[i]) k++;
      const t = c.tokens[i];
      if (k >= 2 && !t.includes('!')) {
        next.push(`${t}!${k}`);
        if (shown.length < 2) shown.push(`${Array(Math.min(k, 4)).fill(t).join(' ')}${k > 4 ? ' …' : ''} → ${t}!${k}`);
      } else for (let j = 0; j < k; j++) next.push(t);
      i += k;
    }
    if (next.length === c.tokens.length) continue;
    const s = measured(source, {
      id: `run:${c.name}`,
      kind: 'run',
      title: `Runs in &${c.name}: the same step again and again, counted`,
      before: shown.map((x) => x.split(' → ')[0]).join('   '),
      after: shown.map((x) => x.split(' → ')[1]).join('   '),
      apply: (src) => setBraid(src, c.name, next),
    });
    if (s) out.push(s);
  }
  return out;
}
