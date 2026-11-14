/**
 * Migrate (decision 085 §2, rung 5 of #691): a law written `law=`, the old way, as the `from` line that takes it, its
 * clock the main argument. `&cycle law=fiveto12 over=&day step=84bpm label="…"` → `&cycle label="…" from five_to_twelve &day`:
 * the built-in's fragment file (`fragments/laws/01-five-to-twelve.md`, decision 090) holds its fills, which realize plays
 * as the law played (#792); checked. Its `step=` at the law's own rate (84bpm) goes;
 * another attribute stays the head's, before `from` (decision 065 §4). A law with no `over=` reads no clock and is left
 * as written: its `from` line needs one (a template's main argument is required).
 */
import { splitComment } from '../edit';
import { signatureHeads } from '../use';
import { BUILT_IN } from '../fills';
import type { Rewrite } from '../rewrite';

/** The words of a line's code, a quoted value whole (`label="the law: a day"`). */
const words = (code: string): string[] => code.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];

/** Each line that writes a built-in law with `law=` and `over=`: written as the `from` line that takes it. */
export function laws(source: string): Rewrite<'law'>[] {
  // (the law's own fragment, whose signature heads the line, defines it: it is no piece's old spelling)
  const defined = new Set(signatureHeads(source));
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const ws = words(code.trim());
    const head = ws[0];
    if (!head || !/^&[A-Za-z_][A-Za-z0-9_]*$/.test(head)) return [];
    const law = ws.find((w) => w.startsWith('law='))?.slice(4);
    const over = ws.find((w) => w.startsWith('over=&'))?.slice(5);
    const fragment = law ? BUILT_IN.get(law) : undefined;
    if (!law || !fragment || !over || ws.includes('from') || defined.has(head)) return [];
    // (its step=, the law's own rate, says nothing: the fragment's fills step at it)
    const own = `step=${+(60 / fragment.stepSeconds).toFixed(6)}bpm`;
    const rest = ws.slice(1).filter((w) => !w.startsWith('law=') && !w.startsWith('over=') && w !== own);
    const indent = /^\s*/.exec(code)![0];
    const after = `${indent}${[head, ...rest, 'from', fragment.fragment, over].join(' ')}`;
    const tail = comment ? `${/\s*$/.exec(code)![0] || ' '}${comment.trimStart()}` : '';
    const line = after + tail;
    return [
      {
        id: `law:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'law' as const,
        title: `law=${law} is the old way: the law is a fragment, taken from its clock (decision 085)`,
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
