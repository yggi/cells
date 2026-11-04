/**
 * Renamed: a `use` or `from` line that names a seed id that became a word (#387, `RENAMED_IDS`), written with the word:
 * `&key from "harmonic minor" D` → `&key from harmonic_minor D`, `use * from "4/4"` → `use * from meter_4_4`. Only where the
 * host's resolver gives the old id and the word the same text, so a host's own fragment of such a name is left alone; the
 * two then expand to the same lines, and the rewrite plays the same by construction.
 */
import { splitComment } from '../edit';
import { readFrom, readUse } from '../parser/use';
import type { Resolve } from '../program';
import { RENAMED_IDS } from '../renamed';
import type { Rewrite } from '../rewrite';

/** The id a `use` or `from` line names, or null where the line is neither (or a signature). */
function idOf(code: string): string | null {
  const use = readUse(code);
  if (use) return use.id;
  const from = readFrom(code);
  return from?.kind === 'use' ? from.id : null;
}

/** Each `use` or `from` line naming a renamed seed id, written with its word. */
export function renamedIds(source: string, resolve: Resolve | undefined): Rewrite<'renamed'>[] {
  if (!resolve) return [];
  return source.split('\n').flatMap((raw, i) => {
    const [code] = splitComment(raw);
    const id = idOf(code);
    const word = id === null ? undefined : RENAMED_IDS.get(id);
    if (word === undefined || resolve(id!) === null || resolve(id!) !== resolve(word)) return [];
    const quoted = JSON.stringify(id!);
    // (the old way `use "4/4 swung on 8n"` named it alone, quoted: it keeps its form, the word in quotes, for `uses.ts` to respell)
    if (/^\s*use\s+"/.test(code)) {
      const at = code.indexOf(quoted);
      if (at < 0) return [];
      return [rewrite(i, raw, code, `${code.slice(0, at)}${JSON.stringify(word)}${code.slice(at + quoted.length)}`, id!, word)];
    }
    // (after `from`, quoted or bare; a word taken with arguments, diatonic(mode=aeolian), joins those the line gives)
    const m = new RegExp(`(\\sfrom\\s+)(${escape(quoted)}|${escape(id!)})(?=[\\s(]|$)`).exec(code);
    if (!m) return [];
    const end = m.index + m[0].length;
    const joined = word.endsWith(')') && code[end] === '(' ? `${word.slice(0, -1)}, ${code.slice(end + 1)}` : `${word}${code.slice(end)}`;
    return [rewrite(i, raw, code, `${code.slice(0, m.index)}${m[1]}${joined}`, id!, word)];
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The rewrite of line `i`, its code written `after`, its comment kept. */
function rewrite(i: number, raw: string, code: string, after: string, id: string, word: string): Rewrite<'renamed'> {
  const before = code.trim();
  return {
    id: `renamed:${i + 1}`,
    tool: 'migrate' as const,
    rule: 'renamed' as const,
    title: `${JSON.stringify(id)} is ${word} now: ${after.trim()}`,
    before,
    after: after.trim(),
    apply: (src: string) =>
      src
        .split('\n')
        .map((line, j) => (j === i && line === raw ? `${after}${raw.slice(code.length)}` : line))
        .join('\n'),
  };
}
