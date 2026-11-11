// The language's half of yggi/cell-studio src/engine/examples.test.ts @ e168c8d: every example is listed, compiles, and
// says what it is; the library's index and miniatures stay with the workbench. Each is a piece file (piecefile.ts,
// decision 047): its title, description, tags and tier in the frontmatter, the piece in a cells block, with no card (#196).
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { EXAMPLES } from './examples';
import { compileSource } from './compile';
import { pieceMeta } from './parser';
import { readPiece, writePiece } from './piecefile';
import { movedCard } from './shorten/card';
import { canonicalTag, parseTag, VOCABULARY } from './tags';
import { resolveSeed } from '../repository/library';

/** The examples' `use` lines read the seed library (docs/language/use.md), as a frontend's library would. */
const seed = { resolve: resolveSeed };

/** The kinds' order a piece's tags are written in: the tutorial, its genres, its artists, its topics (each kind in its own order). */
const KIND_ORDER = ['tutorial', 'genre', 'artist', 'topic'];
const inKindOrder = (tags: readonly string[]) => tags.every((t, i) => i === 0 || KIND_ORDER.indexOf(parseTag(tags[i - 1]!).kind) <= KIND_ORDER.indexOf(parseTag(t).kind));

/** An example's text written the old way: what its frontmatter says, on its card (`&piece title="…" tags="…" tier=n label="…"`), its first line. */
function oldForm(file: string): string {
  const piece = readPiece(file);
  if ('problems' in piece) throw new Error(piece.problems[0]!.message);
  const { title, tags, tier, description } = piece.frontmatter;
  const card = `&piece title="${title}" tags="${(tags as string[]).join(', ')}"${tier === undefined ? '' : ` tier=${tier}`} label="${description}"`;
  return `${card}\n${piece.text}`;
}

describe('examples/*.md', () => {
  test('the order of the tags is checked: a genre after a topic, or the tutorial after a genre, is out of it', () => {
    expect(inKindOrder(['tutorial', 'genre:jazz', 'artist:Coltrane', 'modal', 'rhythm'])).toBe(true);
    expect(inKindOrder(['tutorial', 'MIDI', 'genre:electronic'])).toBe(false);
    expect(inKindOrder(['genre:jazz', 'tutorial'])).toBe(false);
    expect(inKindOrder(['artist:Bach', 'genre:classical'])).toBe(false);
  });

  test('every file is listed, and every listed piece has a file', () => {
    const files = readdirSync('examples')
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3));
    expect(
      readdirSync('examples').filter((f) => !f.endsWith('.md')),
      'a file that is no piece file',
    ).toEqual([]);
    expect(Object.keys(EXAMPLES).sort()).toEqual(files.sort());
  });
  for (const [key, p] of Object.entries(EXAMPLES)) {
    test(`${key}: compiles without diagnostics, has a title, a description, tags, and its card's postgain= or the built-in card`, () => {
      const r = compileSource(p.source, undefined, seed);
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
      expect(inKindOrder(m?.tags ?? []), `tags [${m?.tags.join(', ')}]: tutorial, genres, artists, topics`).toBe(true);
      // its level: a card written with its postgain= (linear, from the loudness check: display.md; left out where that
      // found 1, the default), or no card written and the built-in card's .8 (decision 028)
      const cards = [...r.cells.values()].filter((c) => c.sink && !c.implicit);
      expect(cards.length, 'sound cards').toBeLessThanOrEqual(1);
      for (const c of cards) if (c.params.postgain !== undefined) expect(c.params.postgain, `&${c.name} postgain=`).toBeGreaterThan(0);
      if (!cards.length) expect(r.builtinCard, 'no card written: the built-in card').toBeDefined();
    });
  }

  for (const [key, p] of Object.entries(EXAMPLES)) {
    test(`${key}: no card (the frontmatter says what the piece is), and its notes are named …Note`, () => {
      const r = compileSource(p.source, undefined, seed);
      expect(r.cells.has('piece'), 'a card, &piece: its label is the description').toBe(false);
      for (const c of r.cells.values()) if (c.note) expect(c.name, `note &${c.name}`).toMatch(/Note$/);
    });
  }

  for (const [key, p] of Object.entries(EXAMPLES)) {
    test(`${key}: reads the same from its frontmatter as written the old way, and the migration writes its file byte for byte`, () => {
      const old = oldForm(p.file);
      // (the same card, but on no note: the file's frontmatter says it all)
      expect(pieceMeta(p.file)).toEqual({ ...pieceMeta(old), cell: null });
      expect(compileSource(old, undefined, seed).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/frontmatter now .*Shorten moves them there/)]);
      const moved = movedCard(old)!;
      expect(moved.text).toBe(p.source);
      // (its layout and prose as the file has them: a literate piece's blocks and the prose between them)
      const piece = readPiece(p.file);
      if ('problems' in piece) throw new Error(key);
      // (what the card form has no way to say, a document's parts (decision 082), the file keeps as it has it)
      const kept = Object.fromEntries(Object.entries(piece.frontmatter).filter(([k]) => !(k in moved.frontmatter)));
      expect(writePiece({ ...moved, frontmatter: { ...moved.frontmatter, ...kept }, layout: piece.layout, prose: piece.prose })).toBe(p.file);
    });
  }
});

describe('EXAMPLES is their name (#551)', () => {
  /** Every TypeScript file under `dir`, recursively. */
  const tsFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tsFiles(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []));
  /** The deprecated aliases' homes, until the minor after: the module, the key's line and the root's export. */
  const ALIASES = new Set(['src/engine/presets.ts', 'src/engine/order.ts', 'src/index.ts']);

  test('the old names and the old module appear only in the alias lines', () => {
    const files = [...tsFiles('src/engine'), ...tsFiles('tools'), 'src/index.ts', 'src/docs.test.ts', ...tsFiles('src/repository').filter((f) => f.endsWith('.test.ts'))];
    const found = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .flatMap((line, i) => {
          // In src/repository, `PRESETS` is Jambot's style points (local tables lifted from it), a true name there.
          const old = f.startsWith('src/repository') ? /\bPresetKey\b|\bPreset\b|engine\/presets'/ : /\bPRESETS\b|\bPresetKey\b|\bPreset\b|engine\/presets'|'\.\.?\/presets'/;
          return old.test(line) && !(ALIASES.has(f) && /preset/i.test(line)) && f !== 'src/engine/examples.test.ts' ? [`${f}:${i + 1}`] : [];
        }),
    );
    expect(found).toEqual([]);
  });
});
