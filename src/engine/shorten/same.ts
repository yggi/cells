/**
 * The same: two cells written exactly alike — one is enough, used by both names' users.
 */
import { declLine, deleteCell, spansLines } from '../edit';
import { saves, type Result, type ShortenRewrite } from './harness';

/** Cells written exactly alike: one is enough — its users read the other. */
export function sameCells(source: string, result: Result): ShortenRewrite[] {
  const out: ShortenRewrite[] = [];
  const byText = new Map<string, string[]>();
  for (const c of result.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.note || c.sink || spansLines(source, c.name)) continue;
    // (what a mix plays directly stays itself: merged, two outputs would become one at double gain)
    if (result.outputs.some((o) => o.cell === c.name)) continue;
    const line = source.split('\n')[declLine(source, c.name)] ?? '';
    const body = line
      .replace(/^&[A-Za-z_][A-Za-z0-9_]*\s*/, '')
      .replace(/\s+#.*$/, '')
      .trim();
    if (!body || /[?|]/.test(body)) continue; // (chance keys on names: merging would throw differently)
    byText.set(body, [...(byText.get(body) ?? []), c.name]);
  }
  for (const [body, names] of byText) {
    if (names.length < 2) continue;
    const [keep, ...gone] = names;
    const apply = (src: string) => {
      let next = src;
      for (const g of gone) {
        next = deleteCell(next, g);
        next = next.replace(new RegExp(`&${g}(?![A-Za-z0-9_])`, 'g'), `&${keep}`);
      }
      return next;
    };
    const s: ShortenRewrite = {
      id: `same:${names.join(',')}`,
      tool: 'shorten',
      rule: 'same',
      title: `${names.map((n) => `&${n}`).join(' and ')} are written exactly alike: keep &${keep}, and use it for both`,
      before: `${gone.map((g) => `&${g}`).join(' ')} ${body.length > 40 ? body.slice(0, 39) + '…' : body}`,
      after: `&${keep}`,
      apply,
    };
    if ((saves(source, s) ?? 0) > 0) out.push(s);
  }
  return out;
}
