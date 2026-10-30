/**
 * From (decision 065, rung 3: #387): a `use` line as the `from` line that plays the same, the Migrate step for the old
 * form. A collection's (a fragment with no signature): `use &bd, &sd from gm_kit` → `&bd, &sd from gm_kit`, `use * from
 * gm_kit` → `* from gm_kit`, `use &vibrato` → `&vibrato from vibrato`. A template's (one with a signature): the heads it
 * takes, and those the piece reads besides; each parameter the piece defines, which the old use read by name, bound to
 * the piece's cell (`use &bar, &swing from swung` with the piece's `&swing` → `&bar from swung(swing=&swing) &tempo`); and
 * the main argument the piece's cell, or, where that cell is read by nothing else and holds no slider, written in its
 * place and its line gone (`use &key from dorian` with `&tonic D` → `&key from dorian D`), as the template reads it
 * (`&tempo step=96bpm` → `96bpm`). A use it can't say so exactly (a name it took that the copy keeps to itself, a
 * parameter the piece doesn't give) is left as it is, and every rewrite is checked to play the same.
 */
import { splitComment } from '../edit';
import { isAttribute, isWordId, readFrom, readUse, topTokens, type UseForm } from '../parser/use';
import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
import { signatureOf } from '../use';

const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const idText = (id: string) => (isWordId(id) ? id : JSON.stringify(id));
const refersTo = (name: string) => new RegExp(`&${name}(?![A-Za-z0-9_])`);

/** The names a fragment's text takes from collections, by name: they reach the piece as they are, a copy or not. */
function sharedNames(text: string, resolve: Resolve): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split('\n')) {
    const f = readFrom(splitComment(raw)[0].trim());
    const u = f?.kind === 'use' ? f : readUse(splitComment(raw)[0]);
    if (!u) continue;
    const theirs = resolve(u.id);
    if (theirs === null || signatureOf(theirs)) continue;
    for (const n of u.names ?? theirs.split('\n').flatMap((l) => (HEAD.exec(splitComment(l)[0])?.[1] ? [`&${HEAD.exec(splitComment(l)[0])![1]}`] : []))) out.add(n);
  }
  return out;
}

/** What a template reads a parameter as, where it reads it through one attribute alone (`step=&tempo`): that attribute. */
function readAs(text: string, parameter: string): string | null {
  const keys = new Set<string>();
  for (const raw of text.split('\n')) {
    const code = splitComment(raw)[0];
    if (readFrom(code.trim()) !== undefined) continue;
    for (const t of topTokens(code).slice(1)) {
      if (!refersTo(parameter).test(t.text)) continue;
      const read = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${parameter}(?![A-Za-z0-9_])`).exec(t.text);
      if (!read) return null;
      keys.add(read[1]!);
    }
  }
  const [key] = keys;
  return keys.size === 1 && ['step', 'loop', 'swing'].includes(key!) ? key! : null;
}

/** The `from` line a `use` line says exactly, and the line of the piece it writes in, if any; null where there is none. */
function asFrom(source: string, line: number, use: UseForm, resolve: Resolve): { after: string; drop: number | null } | null {
  const text = resolve(use.id);
  if (text === null) return null;
  const lines = source.split('\n');
  const codes = lines.map((l) => splitComment(l)[0]);
  // (the piece's own cells, by the line that declares each)
  const defined = new Map<string, number>();
  codes.forEach((c, i) => {
    const name = HEAD.exec(c)?.[1];
    if (name && readFrom(c.trim()) === undefined && !defined.has(name)) defined.set(name, i);
  });
  // (and every name another use or from line gives it, which an argument can name as well)
  const given = new Set(
    codes.flatMap((c, i) => {
      if (i === line) return [];
      const f = readFrom(c.trim());
      const u = readUse(c) ?? (f?.kind === 'use' ? f : null);
      return u?.names ?? [];
    }),
  );
  const exists = (name: string) => defined.has(name.slice(1)) || given.has(name);
  const signature = signatureOf(text);
  if (!signature) return { after: `${use.names ? use.names.join(', ') : '*'} from ${idText(use.id)}`, drop: null };
  const heads = signature.names;
  const shared = sharedNames(text, resolve);
  const reads = (name: string) => codes.some((c, i) => i !== line && i !== defined.get(name.slice(1)) && refersTo(name.slice(1)).test(c));
  const asked = use.names ?? heads;
  // (every name the use asked for reaches the piece: a head, a parameter the piece gives, or a name shared by a collection)
  for (const n of asked) if (!heads.includes(n) && !shared.has(n) && !(signature.optional.includes(n) && exists(n))) return null;
  // (and every head the piece reads besides, as the old use's helper it was)
  const taken = heads.filter((h) => asked.includes(h) || reads(h));
  if (!taken.length) return null;
  const args = signature.optional.filter(exists).map((p) => `${p.slice(1)}=${p}`);
  let main = '';
  let drop: number | null = null;
  if (signature.main) {
    const m = signature.main.slice(1);
    if (!exists(signature.main)) return null;
    const at = defined.get(m);
    main = ` ${signature.main}`;
    // (written in its place where nothing else reads it and it reads nothing: no other line, no other use, no slider of its
    // own to keep by name, no cell it names: a tonic, a rate)
    const body =
      at === undefined
        ? ''
        : codes[at]!.trim()
            .slice(m.length + 1)
            .trim();
    const others = codes.some((c, i) => i !== at && i !== line && refersTo(m).test(c));
    const otherUses = codes.some((c, i) => {
      if (i === line) return false;
      const f = readFrom(c.trim());
      const u = readUse(c) ?? (f?.kind === 'use' ? f : null);
      const theirs = u ? resolve(u.id) : null;
      return theirs !== null && refersTo(m).test(theirs);
    });
    if (at !== undefined && body && !body.includes('&') && !others && !otherUses && !/free\(|label=|about=|title=|tags=/.test(body) && !lines[at]!.includes('#')) {
      const tokens = topTokens(body);
      const key = readAs(text, m);
      const alone = tokens.length === 1 && isAttribute(tokens[0]!.text) && key !== null && tokens[0]!.text.startsWith(`${key}=`);
      main = ` ${alone ? tokens[0]!.text.slice(key!.length + 1) : body}`;
      drop = at;
    }
  }
  return { after: `${taken.join(', ')} from ${idText(use.id)}${args.length ? `(${args.join(', ')})` : ''}${main}`, drop };
}

/** Each `use` line the piece can say as a `from` line, so said (Migrate, decision 065). */
export function fromUses(source: string, resolve?: Resolve): Rewrite<'from'>[] {
  if (!resolve) return [];
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    const use = readUse(code);
    if (!use) return [];
    const said = asFrom(source, i, use, resolve);
    if (!said) return [];
    const { after, drop } = said;
    const before = code.trim();
    const dropped = drop === null ? null : source.split('\n')[drop]!;
    return [
      {
        id: `from:${i + 1}`,
        tool: 'normalise' as const,
        rule: 'from' as const,
        title: `${before} is written ${after}${dropped ? `, its ${dropped.trim()} written in` : ''} (decision 065)`,
        before,
        after,
        apply: (src: string) =>
          src
            .split('\n')
            .flatMap((l, j) => {
              if (j === i && l === raw) return [`${/^\s*/.exec(code)![0]}${after}${comment ? `${/\s*$/.exec(code)![0]}${comment}` : ''}`];
              if (drop !== null && j === drop && l === dropped) return [];
              return [l];
            })
            .join('\n'),
      },
    ];
  });
}
