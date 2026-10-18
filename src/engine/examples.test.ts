// The language's half of yggi/cell-studio src/engine/examples.test.ts @ e168c8d: every example is listed, compiles, and
// says what it is; the library's index and miniatures stay with the workbench. Each is a piece file (piecefile.ts,
// decision 047): its title, description, tags and tier in the frontmatter, the piece in a cells block, with no card (#196).
import { describe, expect, test } from 'vitest';
import { readdirSync } from 'node:fs';
import { PRESETS } from './presets';
import { compileSource } from './compile';
import { pieceMeta } from './parser';
import { readPiece, writePiece } from './piecefile';
import { movedCard } from './shorten/card';
import { canonicalTag, parseTag, VOCABULARY } from './tags';

/** An example's text written the old way: what its frontmatter says, on its card (`&piece title="…" tags="…" tier=n label="…"`), its first line. */
function oldForm(file: string): string {
  const piece = readPiece(file);
  if ('problems' in piece) throw new Error(piece.problems[0]!.message);
  const { title, tags, tier, description } = piece.frontmatter;
  const card = `&piece title="${title}" tags="${(tags as string[]).join(', ')}"${tier === undefined ? '' : ` tier=${tier}`} label="${description}"`;
  return `${card}\n${piece.text}`;
}

describe('examples/*.md', () => {
  test('every file is listed, and every listed piece has a file', () => {
    const files = readdirSync('examples')
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3));
    expect(
      readdirSync('examples').filter((f) => !f.endsWith('.md')),
      'a file that is no piece file',
    ).toEqual([]);
    expect(Object.keys(PRESETS).sort()).toEqual(files.sort());
  });
  for (const [key, p] of Object.entries(PRESETS)) {
    test(`${key}: compiles without diagnostics, has a title, a description, tags, and its card's postgain= or the built-in card`, () => {
      const r = compileSource(p.source);
      expect(r.diagnostics).toEqual([]);
      const m = pieceMeta(p.file);
      expect(m?.title, 'title:').toBeTruthy();
      const piece = readPiece(p.file);
      expect('frontmatter' in piece && typeof piece.frontmatter.description === 'string' && piece.frontmatter.description, 'description:').toBeTruthy();
      expect(m?.tags.length, 'tags:').toBeGreaterThan(0);
      // tags are the vocabulary's, written with their kind (genre:jazz, artist:Bach; a topic bare)
      for (const t of m?.tags ?? []) {
        const { kind, name } = parseTag(t);
        expect(VOCABULARY[kind], `tag ${t}: not in the vocabulary (src/engine/tags.ts)`).toContain(name);
        expect(canonicalTag(t), `tag ${t}: written ${canonicalTag(t)}`).toBe(t);
      }
      // its level: a card written with its postgain= (linear, from the loudness check: display.md; left out where that
      // found 1, the default), or no card written and the built-in card's .8 (decision 028)
      const cards = [...r.cells.values()].filter((c) => c.sink && !c.implicit);
      expect(cards.length, 'sound cards').toBeLessThanOrEqual(1);
      for (const c of cards) if (c.params.postgain !== undefined) expect(c.params.postgain, `&${c.name} postgain=`).toBeGreaterThan(0);
      if (!cards.length) expect(r.builtinCard, 'no card written: the built-in card').toBeDefined();
    });
  }

  for (const [key, p] of Object.entries(PRESETS)) {
    test(`${key}: no card (the frontmatter says what the piece is), and its notes are named …Note`, () => {
      const r = compileSource(p.source);
      expect(r.cells.has('piece'), 'a card, &piece: its label is the description').toBe(false);
      for (const c of r.cells.values()) if (c.note) expect(c.name, `note &${c.name}`).toMatch(/Note$/);
    });
  }

  for (const [key, p] of Object.entries(PRESETS)) {
    test(`${key}: reads the same from its frontmatter as written the old way, and the migration writes its file byte for byte`, () => {
      const old = oldForm(p.file);
      // (the same card, but on no note: the file's frontmatter says it all)
      expect(pieceMeta(p.file)).toEqual({ ...pieceMeta(old), cell: null });
      expect(compileSource(old).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/frontmatter now .*Shorten moves them there/)]);
      const moved = movedCard(old)!;
      expect(moved.text).toBe(p.source);
      expect(writePiece({ ...moved, prose: '' })).toBe(p.file);
    });
  }
});
