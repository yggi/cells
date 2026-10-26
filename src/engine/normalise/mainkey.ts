/**
 * The main key: `over=key`, the old way (#301, decision 060), is written `over=&key`, naming the cell it reads, the main
 * key (`CompileResult.mainKey`: the first cell in the text whose braid is `scale(…)`, always a named one). The two read the
 * same table, so the respelling plays the same by construction. A text with no main key is left as it is: its `over=key`
 * is an error, the author's to fix.
 */
import { parse } from '../parser';
import { MAIN_KEY, type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';

/** Each `over=key`, written as the cell it reads. */
export function mainKey(source: string, result: CompileResult): Rewrite<'main key'>[] {
  const key = result.mainKey;
  if (!key) return [];
  return parse(source).cells.flatMap((d) => {
    if (d.over?.name !== MAIN_KEY) return [];
    const { line, col } = d.over.span;
    const after = `over=&${key}`;
    return [
      {
        id: `main key:${line}:${col}`,
        tool: 'normalise' as const,
        rule: 'main key' as const,
        title: `over=key is written ${after}, the key it reads`,
        before: 'over=key',
        after,
        apply: (src: string) =>
          src
            .split('\n')
            .map((text, i) =>
              i === line - 1 && text.slice(col - 1 - 'over='.length, col - 1 + 3) === 'over=key' ? `${text.slice(0, col - 1)}&${key}${text.slice(col + 2)}` : text,
            )
            .join('\n'),
      },
    ];
  });
}
