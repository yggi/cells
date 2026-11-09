/**
 * Forwarded: a `from` line of a fragment that only forwards, whose text is one `from` line of a collection and nothing
 * else, written as the line it forwards to (#196). A retired id is read so for a minor version (the seed library's
 * `RETIRED`: `* from "core kit"` is `&bd, &rim, … from gm_kit`), so a piece that names one is respelled to what took its
 * place. A line that names what it takes keeps its names, where the forwarded line gives them all; a forward of a
 * forward is followed a round at a time. The two expand to the same lines, so the respelling plays the same by
 * construction.
 */
import { splitComment } from '../edit';
import { isWordId, leftOf, readFrom, type FromForm } from '../parser/use';
import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';

/** A `from` line that takes from a collection by name: no head's attributes, no arguments. */
type Taking = Extract<FromForm, { kind: 'use' }>;
const taking = (code: string): Taking | null => {
  const f = readFrom(code.trim());
  return f?.kind === 'use' && !f.head.length && !f.args && f.main === null ? f : null;
};

/** The one `from` line a fragment's text is, or null where it is anything more (or less). */
function forwardOf(text: string): Taking | null {
  const lines = text
    .split('\n')
    .map((l) => splitComment(l)[0].trim())
    .filter(Boolean);
  const to = lines.length === 1 ? taking(lines[0]!) : null;
  // (a forward that renames is the fragment's own line, not a forward)
  return to && to.names?.every((n, i) => n === to.takes![i]) !== false ? to : null;
}

/** The names a line of a forwarding fragment takes: the names it asks for, from where the fragment forwards them. */
function forwarded(use: Taking, to: Taking): { names: readonly string[] | null; takes: readonly string[] | null } | undefined {
  if (!use.names) return { names: to.names, takes: to.takes };
  if (to.names && use.takes!.some((n) => !to.names!.includes(n))) return undefined;
  return { names: use.names, takes: use.takes };
}

const written = (id: string, { names, takes }: { names: readonly string[] | null; takes: readonly string[] | null }) =>
  `${leftOf(names, takes)} from ${isWordId(id) ? id : JSON.stringify(id)}`;

/** Each `from` line of a fragment that only forwards, written as the line it forwards to. */
export function forwardedUses(source: string, resolve: Resolve | undefined): Rewrite<'forwarded'>[] {
  if (!resolve) return [];
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const use = taking(code);
    if (!use) return [];
    const text = resolve(use.id);
    const to = text === null ? null : forwardOf(text);
    const names = to ? forwarded(use, to) : undefined;
    if (!to || names === undefined) return [];
    const before = code.trim();
    const after = written(to.id, names);
    return [
      {
        id: `forwarded:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'forwarded' as const,
        title: `${before} takes what ${JSON.stringify(use.id)} forwards: ${after}`,
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
