/**
 * Migrate (decision 068, #440): `oneshot`, the bare line word, as the voice's parameter it is, `oneshot=1`: `&bd oneshot
 * s=sine …` → `&bd oneshot=1 s=sine …`, in its place. The two read as one (`CellDecl.oneshot`), so the respelling plays
 * the same by construction; checked anyway. A word in a comment or a quoted text is left as it is.
 */
import { splitComment } from '../edit';
import type { Rewrite } from '../rewrite';

/** The bare word, at a word's edges, outside quotes. */
const BARE = /(^|\s)oneshot(?=\s|$)/;
const outsideQuotes = (code: string): string => code.replace(/"[^"]*"/g, (q) => ' '.repeat(q.length));

/** Each line that writes `oneshot` bare: written `oneshot=1`. */
export function oneshots(source: string): Rewrite<'oneshot'>[] {
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const m = BARE.exec(outsideQuotes(code));
    if (!m || !/^\s*&/.test(code)) return [];
    const at = m.index + m[1]!.length;
    const after = `${code.slice(0, at)}oneshot=1${code.slice(at + 'oneshot'.length)}`;
    const line = after + comment;
    return [
      {
        id: `oneshot:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'oneshot' as const,
        title: `oneshot is a voice's parameter: oneshot=1 (decision 068)`,
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
