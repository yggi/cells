/**
 * The library's lines as a `from` (#196, decisions 059, 065): a line of the piece that is a fragment's line word for word,
 * its comment aside, is written `&name from <id>`, the fragment its home, so a piece says what it takes from the library
 * rather than writing it out again. A line reads a fragment's holes as the piece's (`&bar meter("4/4") step=&tempo`
 * with the piece's own `&tempo`), so a meter a piece names in the interface names (`names.ts`) is the `4/4` fragment's.
 *
 * - A line is taken from the first fragment, in the library's order, that holds it (the owner: a line has one home).
 * - The piece's lines taken from one fragment are one `from` line, written where the first of them was, its comment
 *   kept; a `from` line of that fragment the piece has already takes the names too.
 * - Nothing is taken where the line would not sound identical (S1: `rewriteAll`), as a line whose fragment also gives a
 *   helper the piece writes otherwise, which the compile refuses.
 *
 * The library comes with the call (`NormaliseOptions.library`), the fragments' ids read through the resolver: Normalise
 * holds no library of its own (cells resolves nothing itself, decision 054).
 */
import { attrsOf, declLine, declWords, spansLines, splitComment } from '../edit';
import { parse } from '../parser';
import { isWordId, leftOf, readFrom } from '../parser/use';

/** A line that takes names from a fragment by name: a `from` line with no argument (decision 065). */
function taking(code: string): { readonly id: string; readonly names: readonly string[] | null; readonly takes: readonly string[] | null } | null {
  const f = readFrom(code.trim());
  return f?.kind === 'use' && !f.args && f.main === null && !f.head.length ? { id: f.id, names: f.names, takes: f.takes } : null;
}

/** Such a line, written: `&a, &b from id` (`&kick=bd` where it renames), or `* from id` for every name. */
const writeTaking = (id: string, names: readonly string[] | null, takes: readonly string[] | null = names): string =>
  `${leftOf(names, takes)} from ${isWordId(id) ? id : JSON.stringify(id)}`;
import type { Rewrite } from '../rewrite';
import type { Resolve } from '../program';

/** A fragment as the library gives it: its id and its text. */
export interface LibraryFragment {
  readonly id: string;
  readonly text: string;
}

/** A line as the library and the piece are compared: its code, its whitespace collapsed. */
const codeOf = (line: string) => splitComment(line)[0].trim().replace(/\s+/g, ' ');

/** Each fragment's own lines (not its `from` lines), by the cell each declares: where each line's home is. */
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

/** Each fragment the piece writes lines of, word for word, its lines as one `from` line of it. */
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
    const already = lines.findIndex((l) => taking(splitComment(l)[0])?.id === id);
    const prior = already >= 0 ? taking(splitComment(lines[already]!)[0])! : null;
    const more = names.filter((n) => !prior?.names?.includes(n) && !prior?.takes?.includes(n));
    const use = prior && !prior.names ? writeTaking(id, null) : writeTaking(id, [...(prior?.names ?? []), ...more], [...(prior?.takes ?? []), ...more]);
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
 * cell by name (`pitch=&vibrato`) and a `from` line of it (#196): every place it is written, once; the line joins one of
 * that fragment already written, or goes after the piece's `from` lines (first, where it has none). Not where the piece
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
      const at = lines.findIndex((l) => taking(splitComment(l)[0])?.id === id);
      if (at >= 0) {
        const prior = taking(splitComment(lines[at]!)[0])!;
        if (prior.names && !prior.names.includes(`&${name}`))
          lines[at] = writeTaking(id, [...prior.names, `&${name}`], [...prior.takes!, `&${name}`]) + splitComment(lines[at]!)[1];
        return lines.join('\n');
      }
      // (after the piece's own `from` lines, or first)
      let last = -1;
      lines.forEach((l, i) => {
        if (readFrom(splitComment(l)[0].trim())?.kind === 'use') last = i;
      });
      lines.splice(last + 1, 0, writeTaking(id, [`&${name}`]));
      return lines.join('\n');
    },
  }));
}

/** A template as the library gives it: its head, its parameters (each with its default value, if any), its main one, and its head's line. */
interface Template {
  readonly id: string;
  readonly head: string;
  readonly params: ReadonlyMap<string, string | null>;
  readonly main: string | null;
  readonly attrs: ReadonlyMap<string, string>;
  readonly braid: string;
}

/** A value's kind: the generator it calls (`meter`, `scan`), a word, or anything else. */
const kindOf = (v: string): string => /^([a-z]\w*)\(/.exec(v)?.[1] ?? (/^[a-z]\w*$/.test(v) ? 'word' : 'other');

/** The library's templates: each fragment whose signature is `&head from (&p, …) &main`, with its head's own line. */
function templates(library: readonly LibraryFragment[], resolve?: Resolve): Template[] {
  const out: Template[] = [];
  // (the library lists a template's points, `diatonic(mode=dorian)`; the template itself, `diatonic`, is the resolver's)
  const bases = [...new Set(library.flatMap((f) => /^(\w+)\(/.exec(f.id)?.[1] ?? []))].filter((id) => !library.some((f) => f.id === id));
  const all = [
    ...library,
    ...bases.flatMap((id) => {
      const text = resolve?.(id);
      return typeof text === 'string' ? [{ id, text }] : [];
    }),
  ];
  for (const f of all) {
    if (!isWordId(f.id)) continue;
    const lines = f.text.split('\n').map((l) => codeOf(l));
    const sig = lines.map((l) => /^&(\w+) from (?:\(([^)]*)\)\s*)?(?:&(\w+))?$/.exec(l)).find(Boolean);
    if (!sig) continue;
    const head = sig[1]!;
    const declared = lines.find((l) => new RegExp(`^&${head}\\s`).test(l) && !readFrom(l));
    if (!declared) continue;
    const words = declWords(declared, head)!;
    const names = [...(sig[2] ?? '').matchAll(/&(\w+)/g)].map((m) => m[1]!);
    const params = new Map<string, string | null>();
    for (const p of names) {
      // (a default is its own line, `&p meter("4/4")` or `&p swing=8n:1/2`: its text, or the one value it sets)
      const line = lines.find((l) => new RegExp(`^&${p}\\s`).test(l));
      const rest = line ? line.slice(p.length + 2).trim() : null;
      const one = rest && /^(\w+)=(\S+)$/.exec(rest);
      params.set(p, one ? one[2]! : rest);
    }
    out.push({ id: f.id, head, params, main: sig[3] ?? null, attrs: attrsOf(declared, head), braid: words.braid.join(' ') });
  }
  return out;
}

/**
 * A line that is a template's head line with its parameters filled in, as a `from` line of the template with those
 * arguments (#524): `&bar meter("7/8") step=&tempo swing=8n:2/3` is `&bar from meter(grouping=meter("7/8"), swing=8n:2/3)
 * &tempo`, `&key scale(minor, &tonic)` is `&key from diatonic(mode=minor) &tonic`. The line's attributes are the
 * template's, by key, each binding the parameter the template writes there (`base=&p` binds the line's own braid, as a
 * copy of &p is &p's braid); its braid matches the template's, a parameter where the template has one; a parameter it
 * doesn't write is the default, and an argument equal to its default is left out. A line with anything the template
 * doesn't write (`motor=`, `label=`, `over=`) stays as it is. Each only where it sounds identical (S1, `rewriteAll`).
 */
export function libraryTemplates(source: string, library: readonly LibraryFragment[] | undefined, resolve?: Resolve): Rewrite<'library'>[] {
  if (!library?.length) return [];
  const out: Rewrite<'library'>[] = [];
  const lines = source.split('\n');
  for (const t of templates(library, resolve)) {
    const i = declLine(source, t.head);
    if (i < 0 || spansLines(source, t.head)) continue;
    const words = declWords(source, t.head)!;
    const attrs = attrsOf(source, t.head);
    const bound = new Map<string, string>();
    let fits = true;
    const bind = (p: string, v: string) => {
      // (a parameter takes a value of its default's kind, or a cell: a grouping that is a meter(…) isn't a bent scan(…),
      // which since decision 080 is a bend, and a mode that is a word isn't a list of steps)
      const d = t.params.get(p);
      if ((bound.has(p) && bound.get(p) !== v) || (d != null && !v.startsWith('&') && kindOf(v) !== kindOf(d))) fits = false;
      bound.set(p, v);
    };
    let braid = words.braid.join(' ');
    for (const [k, v] of t.attrs) {
      const p = /^&(\w+)$/.exec(v)?.[1];
      const isParam = p !== undefined && (t.params.has(p) || p === t.main);
      if (k === 'base' && isParam && !attrs.has('base')) {
        if (braid) [braid] = [(bind(p, braid), '')];
        continue;
      }
      if (!attrs.has(k)) {
        if (!isParam || p === t.main || t.params.get(p) == null) fits = false;
        continue;
      }
      if (isParam) bind(p, attrs.get(k)!);
      else if (attrs.get(k) !== v) fits = false;
    }
    if ([...attrs.keys()].some((k) => !t.attrs.has(k))) fits = false;
    if (t.braid) {
      // (a parameter the braid names twice is the same text both times: a back-reference)
      const seen = new Set<string>();
      const pattern = t.braid
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/&(\w+)/g, (_, p: string) => (!(t.params.has(p) || p === t.main) ? `&${p}` : seen.has(p) ? `\\k<${p}>` : (seen.add(p), `(?<${p}>.+?)`)));
      const m = new RegExp(`^${pattern}$`).exec(braid.replace(/\s+/g, ' '));
      if (!m) fits = false;
      else for (const [p, v] of Object.entries(m.groups ?? {})) bind(p, v.trim());
    } else if (braid) fits = false;
    if (!fits || (t.main && !bound.has(t.main))) continue;
    const args = [...t.params].flatMap(([p, d]) => (bound.has(p) && bound.get(p) !== d ? [`${p}=${bound.get(p)}`] : []));
    const use = `&${t.head} from ${isWordId(t.id) ? t.id : JSON.stringify(t.id)}${args.length ? `(${args.join(', ')})` : ''}${t.main ? ` ${bound.get(t.main)}` : ''}`;
    const before = codeOf(lines[i]!);
    if (out.some((r) => r.after === use)) continue;
    out.push({
      id: `template:${t.id}:${t.head}`,
      tool: 'normalise',
      rule: 'library',
      title: `&${t.head} is ${JSON.stringify(t.id)}'s, with ${args.length ? args.join(', ') : 'its defaults'}: ${use}`,
      before,
      after: use,
      apply: (src: string) => {
        const now = src.split('\n');
        const j = declLine(src, t.head);
        if (j < 0 || codeOf(now[j]!) !== before) return src;
        const [code, comment] = splitComment(now[j]!);
        const indent = /^\s*/.exec(code)![0];
        const pad = comment ? ' '.repeat(Math.max(1, code.length - indent.length - use.length)) : '';
        now[j] = `${indent}${use}${pad}${comment}`;
        return now.join('\n');
      },
    });
  }
  return out;
}
