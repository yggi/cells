import { describe, expect, test } from 'vitest';
import { readdirSync } from 'node:fs';
import { PRESETS } from './presets';
import { compileSource } from './compile';
import { pieceMeta } from './parser';

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
      expect(p.source, 'level=').toMatch(/\blevel=/);
    });
  }
});
