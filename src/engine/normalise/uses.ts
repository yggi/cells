/**
 * Uses: a `use` line in its one spelling (decision 059): `use * from core_kit` for every line, `use &a, &b from core_kit`
 * for the names it takes, `use &aeolian` where it takes &aeolian from aeolian; an id bare where it is a word, in double
 * quotes where it isn't. So `use "core kit"`, the old way, is `use * from "core kit"`. The two read as one, so the
 * respelling plays the same by construction. A `use` written over more than one line is left as it is.
 */
import { splitComment } from '../edit';
import { readUse, writeUse } from '../parser/use';
import type { Rewrite } from '../rewrite';

/** Each `use` line not in its one spelling, respelled. */
export function uses(source: string): Rewrite<'use'>[] {
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const use = readUse(code);
    if (!use) return [];
    const before = code.trim();
    const after = writeUse(use);
    if (before === after) return [];
    return [
      {
        id: `use:${i + 1}`,
        tool: 'normalise' as const,
        rule: 'use' as const,
        title: `${before} is written ${after}`,
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
