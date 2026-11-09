/**
 * The narrowest `from` (#27's row, the owner on #157: "`* from foo` is just a shorthand for 'all from foo that are used
 * in this piece'"): a collection's `* from gm_kit` written as the cells of it the piece uses, `&bd, &hh from gm_kit`,
 * in the fragment's order; a named cell brings what it reads (decision 059), as `*` did. A list of names says the
 * same of the names in it: one the piece reads nothing of goes (`&bd, &rim, &hh` with &rim read by nothing is `&bd, &hh`),
 * the rest kept in the order written, which is the author's. A cell the piece defines
 * itself is the piece's (its lines win), so it isn't taken. A line the piece reads nothing of is left as it is (a band of
 * performers plays by itself), and every rewrite is checked to play the same (S1), so a `*` that brings lines which
 * sound on their own stays. A template's copy (`&key from dorian D`) names its heads already.
 */
import { splitComment } from '../edit';
import { isWordId, leftOf, readFrom } from '../parser/use';
import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
import { signatureOf } from '../use';

const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const refersTo = (name: string) => new RegExp(`&${name}(?![A-Za-z0-9_])`);

/** Each `* from` a collection, written as the cells of it the piece uses. */
export function narrowestFroms(source: string, resolve: Resolve | undefined): Rewrite<'narrowest'>[] {
  if (!resolve) return [];
  const lines = source.split('\n');
  const codes = lines.map((l) => splitComment(l)[0]);
  // (the piece's own cells: a name it defines is its own, not the fragment's)
  const own = new Set(codes.flatMap((c) => (readFrom(c.trim()) === undefined ? [HEAD.exec(c)?.[1] ?? ''] : [])).filter(Boolean));
  return lines.flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const f = readFrom(code.trim());
    if (!f || f.kind !== 'use' || f.args || f.main || f.head.length) return [];
    const text = resolve(f.id);
    if (text === null || signatureOf(text)) return [];
    const heads = [...new Set(text.split('\n').flatMap((l) => HEAD.exec(splitComment(l)[0])?.[1] ?? []))];
    // (each name the line binds, with the fragment's it takes: `&kick=bd` keeps its name, decision 075 §3a)
    const asked = f.names?.map((n, k) => [n, f.takes![k]!] as const) ?? heads.map((h) => [`&${h}`, `&${h}`] as const);
    const read = (h: string) => !own.has(h) && codes.some((c, j) => j !== i && refersTo(h).test(c));
    const used = asked.filter(([n]) => read(n.slice(1)));
    if (!used.length) return [];
    const before = code.trim();
    const after = `${leftOf(
      used.map(([n]) => n),
      used.map(([, t]) => t),
    )} from ${isWordId(f.id) ? f.id : JSON.stringify(f.id)}`;
    if (after === before) return [];
    return [
      {
        id: `narrowest:${i + 1}`,
        tool: 'normalise' as const,
        rule: 'narrowest' as const,
        title: `${before} is written ${after}: the cells of it the piece uses`,
        before,
        after,
        apply: (src: string) =>
          src
            .split('\n')
            .map((line, j) => (j === i && line === raw ? `${/^\s*/.exec(code)![0]}${after}${comment ? `${/\s*$/.exec(code)![0]}${comment}` : ''}` : line))
            .join('\n'),
      },
    ];
  });
}
