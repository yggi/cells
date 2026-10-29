/**
 * The library's lines as a `use` (#196, decision 059): a line of the piece that is a fragment's line word for word, its
 * comment aside, is written `use &name from <id>`, the fragment its home, so a piece says what it takes from the library
 * rather than writing it out again. A line reads a fragment's holes as the piece's (`&bar meter("4/4") step=&tempo`
 * with the piece's own `&tempo`), so a meter a piece names in the interface names (`names.ts`) is the `4/4` fragment's.
 *
 * - A line is taken from the first fragment, in the library's order, that holds it (the owner: a line has one home).
 * - The piece's lines taken from one fragment are one `use`, written where the first of them was, its comment kept; a
 *   `use` of that fragment the piece has already takes the names too.
 * - Nothing is taken where the use would not sound identical (S1: `rewriteAll`), as a line whose fragment also gives a
 *   helper the piece writes otherwise, which the compile refuses.
 *
 * The library comes with the call (`NormaliseOptions.library`), the fragments' ids read through the resolver: Normalise
 * holds no library of its own (cells resolves nothing itself, decision 054).
 */
import { splitComment } from '../edit';
import { parse } from '../parser';
import { readUse, writeUse } from '../parser/use';
import type { Rewrite } from '../rewrite';

/** A fragment as the library gives it: its id and its text. */
export interface LibraryFragment {
  readonly id: string;
  readonly text: string;
}

/** A line as the library and the piece are compared: its code, its whitespace collapsed. */
const codeOf = (line: string) => splitComment(line)[0].trim().replace(/\s+/g, ' ');

/** Each fragment's own lines (not its `use` lines), by the cell each declares: where each line's home is. */
function homes(library: readonly LibraryFragment[]): Map<string, { id: string; name: string }> {
  const home = new Map<string, { id: string; name: string }>();
  for (const f of library)
    for (const raw of f.text.split('\n')) {
      const code = codeOf(raw);
      const name = /^&([A-Za-z_][A-Za-z0-9_]*)\s/.exec(code)?.[1];
      if (name && !home.has(code)) home.set(code, { id: f.id, name });
    }
  return home;
}

/** Each fragment the piece writes lines of, word for word, its lines as one `use` of it. */
export function libraryLines(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[] {
  if (!library?.length) return [];
  const home = homes(library);
  const lines = source.split('\n');
  // (a line of its own: a declaration that doesn't run on to the next)
  const runsOn = (i: number) => /[+*,[]\s*$/.test(splitComment(lines[i]!)[0]) || (i > 0 && /[+*,[]\s*$/.test(splitComment(lines[i - 1]!)[0]));
  const declared = new Set(parse(source).cells.map((d) => d.name));
  const byId = new Map<string, { at: number[]; names: string[] }>();
  lines.forEach((raw, i) => {
    const h = home.get(codeOf(raw));
    if (!h || runsOn(i) || !declared.has(h.name)) return;
    const taken = byId.get(h.id) ?? { at: [], names: [] };
    taken.at.push(i);
    taken.names.push(`&${h.name}`);
    byId.set(h.id, taken);
  });
  return [...byId].map(([id, { at, names }]) => {
    // (a use of the fragment already written takes the names too, where it names what it takes)
    const already = lines.findIndex((l) => readUse(splitComment(l)[0])?.id === id);
    const prior = already >= 0 ? readUse(splitComment(lines[already]!)[0])! : null;
    const use = writeUse({ id, names: prior && !prior.names ? null : [...(prior?.names ?? []), ...names.filter((n) => !prior?.names?.includes(n))] });
    const where = already >= 0 ? already : at[0]!;
    const comments = at.map((i) => splitComment(lines[i]!)[1].trim()).filter(Boolean);
    return {
      id: `library:${id}`,
      tool: 'normalise' as const,
      rule: 'library' as const,
      title: `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} ${JSON.stringify(id)}'s: ${use}`,
      before: at.map((i) => codeOf(lines[i]!)).join('; '),
      after: use,
      apply: (src: string) => {
        const now = src.split('\n');
        if (now.length !== lines.length || at.some((i) => now[i] !== lines[i])) return src;
        const indent = /^\s*/.exec(now[where]!)![0];
        const comment = already >= 0 ? splitComment(now[already]!)[1].trim() : comments.join(' ');
        now[where] = `${indent}${use}${comment ? `  ${comment.startsWith('#') || comment.startsWith('//') ? comment : `# ${comment}`}` : ''}`;
        return now.filter((_, i) => i === where || !at.includes(i)).join('\n');
      },
    };
  });
}

/**
 * Each fragment cell the piece writes inline, word for word (`pitch=&(map=lin loop=5 0 .1 0 -.1 0)`), as the fragment's
 * cell by name (`pitch=&vibrato`) and a `use` of it (#196): every place it is written, once; the `use` joins one of that
 * fragment already written, or goes after the piece's `use` lines (first, where it has none). Not where the piece
 * defines the name itself.
 */
export function libraryCells(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[] {
  if (!library?.length) return [];
  const bodies = new Map<string, { id: string; name: string }>();
  for (const [code, h] of homes(library)) {
    const body = code.slice(h.name.length + 2);
    if (body && !bodies.has(body)) bodies.set(body, h);
  }
  const declared = new Set(parse(source).cells.map((d) => d.name));
  const found = new Map<string, { id: string; name: string; inline: string[] }>();
  for (const m of source.matchAll(/&\(([^()]*)\)/g)) {
    const h = bodies.get(m[1]!.trim().replace(/\s+/g, ' '));
    if (!h || declared.has(h.name)) continue;
    const f = found.get(h.name) ?? { ...h, inline: [] };
    if (!f.inline.includes(m[0])) f.inline.push(m[0]);
    found.set(h.name, f);
  }
  return [...found.values()].map(({ id, name, inline }) => ({
    id: `library-cell:${name}`,
    tool: 'normalise' as const,
    rule: 'library' as const,
    title: `${inline[0]} is ${JSON.stringify(id)}'s &${name}: use it by name`,
    before: inline[0]!,
    after: `&${name}`,
    apply: (src: string) => {
      const lines = src.split('\n').map((l) => {
        const [code, comment] = splitComment(l);
        return inline.reduce((c, x) => c.split(x).join(`&${name}`), code) + comment;
      });
      const at = lines.findIndex((l) => readUse(splitComment(l)[0])?.id === id);
      if (at >= 0) {
        const prior = readUse(splitComment(lines[at]!)[0])!;
        if (prior.names && !prior.names.includes(`&${name}`)) lines[at] = writeUse({ id, names: [...prior.names, `&${name}`] }) + splitComment(lines[at]!)[1];
        return lines.join('\n');
      }
      // (after the piece's own `use` lines, or first)
      let last = -1;
      lines.forEach((l, i) => {
        if (readUse(splitComment(l)[0])) last = i;
      });
      lines.splice(last + 1, 0, writeUse({ id, names: [`&${name}`] }));
      return lines.join('\n');
    },
  }));
}
