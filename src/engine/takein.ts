/**
 * A given cell taken into the piece (#639, rung C2 of yggi/cell-studio#621): before a frontend edits a cell a `from` line
 * gave, the cell's line has to be the piece's own, written where an edit can reach it. What that means depends on how
 * the cell was given (decision 065):
 *  - **the piece's own cell, or the head of a `from` line that takes one head:** nothing to write; an edit reaches it as
 *    it is (an attribute of a head goes before `from`, 065 §4: `setAttr` and `setShift` write it there);
 *  - **a collection's cell** (`&bd, &sd from gm_kit`, `* from gm_kit`): its line, as the expansion writes it, becomes the
 *    piece's, and a line that named it stops asking for it (the piece's own line wins over a collection's, 059);
 *  - **a template's head that `*` takes** (`* from band(…)`): its line becomes the piece's, which `*` leaves to the piece,
 *    and what the line reads of the copy stays given (#636);
 *  - **a head among several that one line takes, or a cell a copy keeps to itself** (`&bar_grouping`): no line of the
 *    piece's can stand for it without changing what the copy reads, so it says why instead.
 * It replaces Cell studio's `withUsedLine` (cell-studio#610). Pure.
 */
import { compileSource } from './compile';
import { declLine, splitComment } from './edit';
import { readFrom } from './parser/use';
import type { CompileOptions } from './program';
import { expansion, signatureOf } from './use';

/** A given cell taken into the piece: the text with its line written in, or why it can't be. */
export type TakenIn = { readonly text: string } | { readonly why: string };

/** The text with `name`'s line (bare) the piece's own, where an edit can reach it (see the module's comment). */
export function takeIn(text: string, name: string, options: CompileOptions = {}): TakenIn {
  if (declLine(text, name) >= 0) return { text };
  const lines = text.split('\n');
  // (a head of the piece's own from line: one head is edited on that line; several can't each carry their attributes)
  for (const raw of lines) {
    const f = readFrom(splitComment(raw)[0].trim());
    if (f?.kind !== 'use' || !f.names?.includes(`&${name}`)) continue;
    const theirs = options.resolve?.(f.id) ?? null;
    if (theirs !== null && signatureOf(theirs) !== null) {
      if (f.names.length === 1) return { text };
      return {
        why: `&${name} is one of ${f.names.join(', ')}, which one line takes from ${f.id}: an attribute before from is one head's, so write it on a line of the head's own`,
      };
    }
  }
  const x = expansion(text, options);
  const origin = x.origins.get(name);
  if (!origin?.length) return { why: `&${name} is not a cell this piece is given by a from line` };
  const at = origin[0]!.line - 1;
  const take = readFrom(splitComment(lines[at] ?? '')[0].trim());
  if (take?.kind !== 'use') return { why: `&${name} came through no from line of the piece's` };
  const theirs = options.resolve?.(take.id) ?? null;
  const template = theirs !== null && signatureOf(theirs) !== null;
  if (template && take.names !== null) return { why: `&${name} is ${take.id}'s copy's own: change it through the from line's arguments` };
  // (its line as the expansion wrote it, its physical lines with it)
  const added = x.text.split('\n');
  const own = added.findIndex((l, i) => i >= lines.length && new RegExp(`^\\s*&${name}(?![A-Za-z0-9_])`).test(l));
  if (own < 0) return { why: `&${name} has no line of its own in the expansion` };
  let end = own;
  while (end + 1 < added.length && /[+*,[]\s*$/.test(splitComment(added[end]!)[0])) end++;
  const written = added.slice(own, end + 1);
  // (a line that named it stops asking for it; one that named it alone goes)
  const out = lines.flatMap((raw, i) => {
    if (i !== at || take.names === null) return [raw];
    const left = take.names.filter((n) => n !== `&${name}`);
    if (!left.length) return [];
    const [code, comment] = splitComment(raw);
    return [code.replace(/^(\s*)[^]*?(?=\s+from\s)/, `$1${left.join(', ')}`) + comment];
  });
  const after = at + (out.length < lines.length ? 0 : 1);
  const result = [...out.slice(0, after), ...written, ...out.slice(after)].join('\n');
  const errors = (t: string) => compileSource(t, undefined, options).diagnostics.flatMap((d) => (d.severity === 'error' ? [d.message] : []));
  const before = new Set(errors(text));
  const now = errors(result).filter((m) => !before.has(m));
  return now.length ? { why: `&${name}'s line, written into the piece, doesn't compile there: ${now[0]}` } : { text: result };
}
