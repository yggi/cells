import { describe, expect, test } from 'vitest';
import { readdirSync } from 'node:fs';
import { PRESETS } from './presets';
import { compileSource } from './compile';
import { pieceMeta } from './parser';
import built from 'virtual:examples-index';
import { buildExamplesIndex, examplesIndexModule } from '../../tools/examples-index';
import { ORDER } from './order';
import { canonicalTag, parseTag, VOCABULARY } from './tags';

describe('examples/*.cells', () => {
  test('every file is listed, and every listed piece has a file', () => {
    const files = readdirSync('examples').filter((f) => f.endsWith('.cells')).map((f) => f.slice(0, -6));
    expect(Object.keys(PRESETS).sort()).toEqual(files.sort());
  });
  for (const [key, p] of Object.entries(PRESETS)) {
    test(`${key}: compiles without diagnostics, has a title, tags and a level`, () => {
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
      expect(p.source, 'level=').toMatch(/\blevel=/);
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
  test('the build-time index lists every example in order, as compiling each file says', () => {
    expect(built.map((e) => (e as { key: string }).key)).toEqual([...ORDER]);
    expect(built).toEqual(buildExamplesIndex());
    for (const e of buildExamplesIndex()) {
      const m = pieceMeta(PRESETS[e.key].source);
      expect([e.title, e.description, e.tags]).toEqual([m?.title, m?.description, m?.tags]); // (the tags are written canonical: checked above)
      expect(e.size, `${e.key}: size`).toBeGreaterThan(0);
    }
  });
  test('the index module keeps an endless cycle (JSON would make it null)', () => {
    const [first] = buildExamplesIndex();
    const text = examplesIndexModule([{ ...first, time: { ends: null, cycle: Infinity, chance: false, longest: null } }]);
    expect(text).toContain('"cycle":Infinity');
  });
});
