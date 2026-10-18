/**
 * Fractions: every step's length shares a factor (4@2 2@2 0@4) — divide it out, and
 * slow the clock to match (4 2 0@2, step=&bar/2).
 */
import { attrsOf, setAttr, setBraid } from '../edit';
import { tapOfRaw } from './taps';
import { saves, type Candidate, type Result, type ShortenRewrite } from './harness';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Fractions: every step held a multiple of some n — divide it out, and slow the clock instead. */
export function fractions(source: string, cells: readonly Candidate[], result: Result): ShortenRewrite[] {
  const out: ShortenRewrite[] = [];
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
    // (a step's own hold: after its bracket, if it is one — a hold inside a subsequence is its own business)
    const cut = (t: string) => t.lastIndexOf(']') + 1;
    const held = c.tokens.map((t) => {
      const m = /@([0-9]+)/.exec(t.slice(cut(t)));
      return m ? +m[1] : 1;
    });
    const g = held.reduce(gcd);
    if (g < 2) continue;
    // the clock, slowed by g: &x*n/d becomes &x*n/(d·g), reduced; a plain rate divides
    let slower: string | null = null;
    const driven = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\*([0-9]+))?(?:\/([0-9]+))?$/.exec(step);
    if (driven) {
      let n = driven[2] ? +driven[2] : 1;
      let d = (driven[3] ? +driven[3] : 1) * g;
      const k = gcd(n, d);
      n /= k;
      d /= k;
      slower = `&${driven[1]}${n > 1 ? `*${n}` : ''}${d > 1 ? `/${d}` : ''}`;
    } else if (/^[0-9]*\.?[0-9]+$/.test(step)) slower = String(+(+step / g).toFixed(6));
    // a meter's own steps (the old spelling) say the tap that says it, slowed; a tap is slowed as written
    if (driven && tapOfRaw(result, c.name) !== null) slower = tapOfRaw(result, c.name, g);
    else slower = slowerTap(step, g) ?? slower;
    if (!slower) continue;
    const next = c.tokens.map((t, i) => t.slice(0, cut(t)) + t.slice(cut(t)).replace(/@[0-9]+/, held[i] / g > 1 ? `@${held[i] / g}` : ''));
    const s: ShortenRewrite = {
      id: `fraction:${c.name}`,
      tool: 'shorten',
      rule: 'fraction',
      title: `&${c.name}: every step is held ${g}× or more — divide by ${g}, and step ${g}× slower`,
      before: `step=${step}  ${c.tokens.slice(0, 5).join(' ')}${c.tokens.length > 5 ? ' …' : ''}`,
      after: `step=${slower}  ${next.slice(0, 5).join(' ')}${next.length > 5 ? ' …' : ''}`,
      apply: (src) => setAttr(setBraid(src, c.name, next), c.name, 'step', slower),
    };
    if ((saves(source, s) ?? 0) > 0) out.push(s);
  }
  return out;
}

/** A tap (decision 040), written `step=`'s way and slowed g times, or null when it has no such tap: 8n → 4n, 8t → 4t, pulse*4 → pulse*2, 1m/2 → 1m/4. */
function slowerTap(step: string, g: number): string | null {
  const m = /^((?:&[A-Za-z_][A-Za-z0-9_]*:)?)(?:([0-9]+)(n\.?|t)|(pulse|beat)(?:\*([0-9]+))?|1m(?:\/([0-9]+))?)$/.exec(step);
  if (!m) return null;
  const [, of = '', count, unit, word, times, bars] = m;
  if (count !== undefined) return +count % g === 0 ? `${of}${+count / g}${unit}` : null;
  if (word !== undefined) {
    const k = times === undefined ? 1 : +times;
    return k % g === 0 ? `${of}${word}${k / g > 1 ? `*${k / g}` : ''}` : null;
  }
  const d = (bars === undefined ? 1 : +bars) * g;
  return `${of}${d > 1 ? `1m/${d}` : '1m'}`;
}
