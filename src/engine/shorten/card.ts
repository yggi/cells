/**
 * A migration (decision 047, #146): a piece whose card says what the piece is in its text (`&piece title="…" tags="…"
 * tier=n`) as a piece file, its title, tags and tier in the frontmatter and its text in the cells block, the same text
 * byte for byte but for those three attributes (`piecefile.ts`). Unlike every other suggestion, its rewrite is a file, not a
 * text: a frontend that holds the text saves it as a file, one that holds a file already takes `movedCard` and merges the
 * frontmatter itself. Offered when the text left plays the same notes (checked here; a note plays none).
 */
import { declLine, setAttr, splitComment } from '../edit';
import { pieceMeta } from '../parser';
import { isPieceFile, writePiece, type PieceFrontmatter } from '../piecefile';
import { samePiece } from '../sameness';
import type { ShortenRewrite } from './harness';

/** What a text's card says of the piece, and the text without it; null for a text whose card says nothing (or with no card). */
export function movedCard(text: string): { frontmatter: PieceFrontmatter; text: string } | null {
  const meta = isPieceFile(text) ? null : pieceMeta(text);
  if (!meta?.cell) return null;
  const name = meta.cell;
  let next = text;
  for (const key of ['title', 'tags', 'tier']) next = setAttr(next, name, key, null);
  // (a card that said nothing else: its line goes, a comment on it stays)
  const at = declLine(next, name);
  if (at < 0) return null;
  const lines = next.split('\n');
  const [code, comment] = splitComment(lines[at]!);
  if (code.trim() === `&${name}`) comment ? (lines[at] = comment) : lines.splice(at, 1);
  return {
    frontmatter: { title: meta.title, ...(meta.tags.length ? { tags: meta.tags } : {}), ...(meta.tier !== null ? { tier: meta.tier } : {}) },
    text: lines.join('\n'),
  };
}

/** A card that says what the piece is: the piece as a file, its title, tags and tier in the frontmatter. */
export function card(source: string): ShortenRewrite[] {
  const moved = movedCard(source);
  const name = pieceMeta(source)?.cell;
  if (!moved || !name || !samePiece(source, moved.text)) return [];
  const apply = (s: string) => {
    const m = movedCard(s);
    return m ? writePiece({ frontmatter: m.frontmatter, text: m.text, prose: '' }) : s;
  };
  const at = declLine(source, name);
  return [
    {
      id: `card:${name}`,
      tool: 'migrate',
      rule: 'card',
      title: `&${name} says what the piece is: its title, tags and tier go in the file's frontmatter, the piece in its cells block (decision 047)`,
      before: source.split('\n')[at]!.trim(),
      after: moved.text.split('\n')[declLine(moved.text, name)]?.trim() ?? '',
      apply,
    },
  ];
}
