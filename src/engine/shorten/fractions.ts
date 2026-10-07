/**
 * Fractions: every step's length shares a factor (4@2 2@2 0@4) — divide it out, and
 * slow the clock to match (4 2 0@2, step=&bar*2).
 */
import { attrsOf, setAttr, setBraid } from '../edit';
import { measured, type Candidate, type Result, type Suggestion } from './harness';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Fractions: every step held a multiple of some n — divide it out, and slow the clock instead. */
export function fractions(source: string, cells: readonly Candidate[], result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of cells) {
    // only what nothing else splices in, steps by, reads or is shaped by (they'd hear the lengths) — a mix
    // playing it is fine — and without chance (it keys on positions)
    const leaning = [...result.cells.values()].some(
      (x) =>
        x.name !== c.name &&
        (x.over === c.name ||
          x.step?.driver === c.name ||
          x.env === c.name ||
          x.pitch === c.name ||
          x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === c.name) ||
          Object.values(x.paramCells ?? {}).some((p) => p.factors.includes(c.name))),
    );
    if (leaning || result.outputs.some((o) => o.mods.some((m) => m.cell === c.name) || o.levels.some((l) => l.cell === c.name))) continue;
    if (c.tokens.some((t) => t.includes('&') || t.includes('?') || t.includes('|'))) continue;
    const cell = result.cells.get(c.name);
    const attrs = attrsOf(source, c.name);
    const step = attrs.get('step');
    if (!cell || !step || attrs.has('stride') || attrs.has('cycle') || cell.loops) continue;
    const held = c.tokens.map((t) => {
      const m = /@([0-9]+)/.exec(t);
      return m ? +m[1] : 1;
    });
    const g = held.reduce(gcd);
    if (g < 2) continue;
    // the clock, slowed by g: &x*n/d becomes &x*(n·g)/d, reduced; a plain rate divides
    let slower: string | null = null;
    const driven = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\*([0-9]+))?(?:\/([0-9]+))?$/.exec(step);
    if (driven) {
      let n = (driven[2] ? +driven[2] : 1) * g;
      let d = driven[3] ? +driven[3] : 1;
      const k = gcd(n, d);
      n /= k;
      d /= k;
      slower = `&${driven[1]}${n > 1 ? `*${n}` : ''}${d > 1 ? `/${d}` : ''}`;
    } else if (/^[0-9]*\.?[0-9]+$/.test(step)) slower = String(+(+step / g).toFixed(6));
    if (!slower) continue;
    const next = c.tokens.map((t, i) => t.replace(/@[0-9]+/, held[i] / g > 1 ? `@${held[i] / g}` : ''));
    const s = measured(source, {
      id: `fraction:${c.name}`,
      kind: 'fraction',
      title: `&${c.name}: every step is held ${g}× or more — divide by ${g}, and step ${g}× slower`,
      before: `step=${step}  ${c.tokens.slice(0, 5).join(' ')}${c.tokens.length > 5 ? ' …' : ''}`,
      after: `step=${slower}  ${next.slice(0, 5).join(' ')}${next.length > 5 ? ' …' : ''}`,
      apply: (src) => setAttr(setBraid(src, c.name, next), c.name, 'step', slower),
    });
    if (s) out.push(s);
  }
  return out;
}
