/**
 * Forwarded: a `use` of a fragment that only forwards, whose text is one `use` line and nothing else, written as the use
 * it forwards to (#196). A retired id is read so for a minor version (the seed library's `RETIRED`: `use * from "core
 * kit"` is `use &bd, &rim, … from gm_kit`), so a piece that names one is respelled to what took its place. A use that
 * names what it takes keeps its names, where the forwarded use gives them all; a forward of a forward is followed a
 * round at a time. The two expand to the same lines, so the respelling plays the same by construction.
 */
import { splitComment } from '../edit';
import { readUse, writeUse, type UseForm } from '../parser/use';
import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';

/** The one `use` a fragment's text is, or null where it is anything more (or less). */
function forwardOf(text: string): UseForm | null {
  const lines = text
    .split('\n')
    .map((l) => splitComment(l)[0].trim())
    .filter(Boolean);
  if (lines.length !== 1) return null;
  return readUse(lines[0]!) ?? null;
}

/** The use a use of a forwarding fragment is: the names it asks for, from where the fragment forwards them. */
function forwarded(use: UseForm, to: UseForm): UseForm | null {
  if (!use.names) return { id: to.id, names: to.names, form: to.names ? 'named' : 'all' };
  if (to.names && use.names.some((n) => !to.names!.includes(n))) return null;
  return { id: to.id, names: use.names, form: 'named' };
}

/** Each `use` of a fragment that only forwards, written as the use it forwards to. */
export function forwardedUses(source: string, resolve: Resolve | undefined): Rewrite<'forwarded'>[] {
  if (!resolve) return [];
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const use = readUse(code);
    if (!use) return [];
    const text = resolve(use.id);
    const to = text === null ? null : forwardOf(text);
    const now = to && forwarded(use, to);
    if (!now) return [];
    const before = code.trim();
    const after = writeUse(now);
    return [
      {
        id: `forwarded:${i + 1}`,
        tool: 'normalise' as const,
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
