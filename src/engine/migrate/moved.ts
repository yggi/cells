/**
 * Moved: a `from` line that takes a seed fragment that became a part of a piece (decision 082), written as a take of the
 * part from its document: `&twinkle from twinkle &key` → `&twinkle from kinderlied &key`, and a head named otherwise
 * takes it by its head, `&tw from twinkle &key` → `&tw=twinkle from kinderlied &key`. Breaking, with no release that
 * reads the old id (the owner, 2026-11-09): a compile refuses it, and Migrate reads it the old way (`MOVED`), so the
 * line is rewritten where its document gives the part, its arguments and main argument kept as written.
 */
import { splitComment } from '../edit';
import { leftOf, readFrom } from '../parser/use';
import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
import { MOVED } from '../renamed';
import { partsOf } from '../use';

/** Each `from` line that takes a moved fragment, written as a take of the part from its document. */
export function movedIds(source: string, resolve: Resolve | undefined): Rewrite<'moved'>[] {
  if (!resolve) return [];
  return source.split('\n').flatMap((raw, i) => {
    const [code] = splitComment(raw);
    const from = readFrom(code.trim());
    const moved = from?.kind === 'use' ? MOVED.get(from.id) : undefined;
    if (!from || from.kind !== 'use' || !moved || !from.names) return [];
    const document = resolve(moved.document);
    if (document === null || !partsOf(document).some((p) => p.includes(moved.head))) return [];
    // (the first name the line takes is the part's head, renamed where the line names it otherwise)
    const takes = from.names.map((n, k) => (k === 0 ? `&${moved.head}` : (from.takes?.[k] ?? n)));
    const at = new RegExp(`\\sfrom\\s+(?:"${from.id}"|${from.id})(?=[\\s(]|$)`).exec(code);
    if (!at) return [];
    const lead = code.slice(0, code.length - code.trimStart().length);
    const after = `${lead}${leftOf(from.names, takes)} from ${moved.document}${code.slice(at.index + at[0].length)}`.trimEnd();
    const before = code.trim();
    return [
      {
        id: `moved:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'moved' as const,
        title: `${JSON.stringify(from.id)} is a part of ${moved.document} now: ${after.trim()}`,
        before,
        after: after.trim(),
        apply: (src: string) =>
          src
            .split('\n')
            .map((line, j) => (j === i && line === raw ? `${after}${raw.slice(code.trimEnd().length)}` : line))
            .join('\n'),
      },
    ];
  });
}
