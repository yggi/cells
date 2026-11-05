/**
 * Migrate (decision 070, #15): `:pairs` after a swing's share, decision 053's word for a level's pairs leaning alone and
 * its groups of three straight, which every swing does now: `swing=8n:2/3:pairs` → `swing=8n:2/3`. The word is read and
 * says nothing, so dropping it plays the same by construction; checked anyway. A word in a comment or a quoted text is
 * left as it is.
 */
import { splitComment } from '../edit';
import type { Rewrite } from '../rewrite';

/** The word, after a level's share in a swing= (a decimal, a fraction or a free(…)). */
const WORD = /(swing=[^\s]*?[0-9)]):pairs(?=[,\s]|$)/g;
const outsideQuotes = (code: string): string => code.replace(/"[^"]*"/g, (q) => ' '.repeat(q.length));

/** Each line whose swing= writes `:pairs`: written without it. */
export function pairs(source: string): Rewrite<'pairs'>[] {
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    if (!/^\s*&/.test(code)) return [];
    const masked = outsideQuotes(code);
    let after = code;
    // (from the end, so each match's place holds: every level's word in one rewrite)
    const found = [...masked.matchAll(WORD)].reverse();
    if (!found.length) return [];
    for (const m of found) after = after.slice(0, m.index + m[1]!.length) + after.slice(m.index + m[0].length);
    const line = after + comment;
    return [
      {
        id: `pairs:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'pairs' as const,
        title: `a swing leans a level's pairs alone, its groups of three straight: :pairs says nothing more (decision 070)`,
        before: code.trim(),
        after: after.trim(),
        apply: (src: string) =>
          src
            .split('\n')
            .map((l, j) => (j === i && l === raw ? line : l))
            .join('\n'),
      },
    ];
  });
}
