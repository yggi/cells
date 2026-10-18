/**
 * A migration (decision 047, #146, #196): a piece whose card says what the piece is in its text as a piece file, what
 * the card said in the frontmatter and the rest of the text byte for byte (`piecefile.ts`). The card is the first note
 * with a `title=` (`&piece title="…" tags="…" tier=n label="…"`, a text written the old way), else the note `&piece`
 * (a file's text whose frontmatter has no description yet): its title, tags and tier go to `title`, `tags` and `tier`,
 * its label, as plain text, to `description`, and the card's line goes (a comment on it stays). Unlike every other
 * suggestion, its rewrite is a file, not a text: a frontend that holds the text saves it as a file, one that holds a
 * file already takes `movedCard` and merges the frontmatter itself. Offered when the text left plays the same notes
 * (checked here; a note plays none).
 */
import { declLine, setAttr, splitComment } from '../edit';
import { CARD, parse, pieceMeta, plainLabel } from '../parser';
import { isNote } from '../ast';
import { isPieceFile, writePiece, type PieceFrontmatter } from '../piecefile';
import { soundsIdentical } from '../sameness';
import type { ShortenRewrite } from './harness';

/** The card a text says what the piece is on: the first note with a title=, else the note `&piece`; null for none. */
function cardOf(text: string): string | null {
  const meta = pieceMeta(text);
  if (meta?.cell) return meta.cell;
  return parse(text).cells.some((c) => c.name === CARD && isNote(c) && c.label) ? CARD : null;
}

/** What a text's card says of the piece, and the text without it; null for a text with no card, or a file. */
export function movedCard(text: string): { frontmatter: PieceFrontmatter; text: string } | null {
  const name = isPieceFile(text) ? null : cardOf(text);
  if (!name) return null;
  const meta = pieceMeta(text);
  let next = text;
  for (const key of ['title', 'tags', 'tier']) next = setAttr(next, name, key, null);
  // (its label and its links go too, and with them its line, a comment on it staying; a card that says more than that
  // is a note the graph draws, and keeps them)
  const bare = setAttr(setAttr(next, name, 'label', null), name, 'about', null);
  const at = declLine(bare, name);
  if (at < 0) return null;
  const lines = bare.split('\n');
  const [code, comment] = splitComment(lines[at]!);
  const goes = code.trim() === `&${name}`;
  if (!goes && !meta) return null;
  if (goes) comment ? (lines[at] = comment) : lines.splice(at, 1);
  const description = goes ? plainLabel(parse(text).cells.find((c) => c.name === name)?.label ?? '') : '';
  return {
    frontmatter: {
      ...(meta ? { title: meta.title } : {}),
      ...(meta?.tags.length ? { tags: meta.tags } : {}),
      ...(meta && meta.tier !== null ? { tier: meta.tier } : {}),
      ...(description ? { description } : {}),
    },
    text: goes ? lines.join('\n') : next,
  };
}

/** A card that says what the piece is: the piece as a file, its title, tags, tier and description in the frontmatter. */
export function card(source: string): ShortenRewrite[] {
  const moved = movedCard(source);
  const name = cardOf(source);
  if (!moved || !name || !soundsIdentical(source, moved.text)) return [];
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
      title: `&${name} says what the piece is: its title, tags, tier and label (its description) go in the file's frontmatter, the piece in its cells block (decision 047)`,
      before: source.split('\n')[at]!.trim(),
      after: moved.text.split('\n')[declLine(moved.text, name)]?.trim() ?? '',
      apply,
    },
  ];
}
