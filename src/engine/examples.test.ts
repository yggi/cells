// The language's half of yggi/cell-studio src/engine/examples.test.ts @ e168c8d: every example is listed, compiles, and
// carries its card; the library's index and miniatures stay with the workbench.
import { describe, expect, test } from 'vitest';
import { readdirSync } from 'node:fs';
import { PRESETS } from './presets';
import { compileSource } from './compile';
import { pieceMeta } from './parser';
import { canonicalTag, parseTag, VOCABULARY } from './tags';

describe('examples/*.cells', () => {
  test('every file is listed, and every listed piece has a file', () => {
    const files = readdirSync('examples')
      .filter((f) => f.endsWith('.cells'))
      .map((f) => f.slice(0, -6));
    expect(Object.keys(PRESETS).sort()).toEqual(files.sort());
  });
  for (const [key, p] of Object.entries(PRESETS)) {
    test(`${key}: compiles without diagnostics, has a title, tags, and its card's postgain= or the built-in card`, () => {
      const r = compileSource(p.source);
      expect(r.diagnostics).toEqual([]);
      const m = pieceMeta(p.source);
      expect(m?.title, 'title=').toBeTruthy();
      expect(m?.tags.length, 'tags=').toBeGreaterThan(0);
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
    test(`${key}: the card is the first cell, named piece, and its notes are named …Note`, () => {
      const lines = p.source.split('\n');
      const first = lines.find((l) => l.startsWith('&'));
      expect(first, 'the first cell').toMatch(/^&piece title="/);
      const r = compileSource(p.source);
      for (const c of r.cells.values()) if (c.note && c.name !== 'piece') expect(c.name, `note &${c.name}`).toMatch(/Note$/);
    });
  }
});
