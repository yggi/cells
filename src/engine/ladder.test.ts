import { describe, expect, test } from 'vitest';
import { entries } from '../../tools/reference';
import { formKey, formsUsed, LADDER } from './ladder';
import { pieceMeta } from './parser';
import { PRESETS } from './presets';
import { canonicalTags, TUTORIAL } from './tags';

// The tutorial (#170): a ladder of pieces, one concept each, every form of the reference on exactly one rung.
const pieces = Object.entries(PRESETS).map(([key, p]) => ({ key, source: p.source, meta: pieceMeta(p.source) }));
const tutorial = pieces.filter((p) => canonicalTags(p.meta?.tags ?? []).includes(TUTORIAL)).sort((a, b) => (a.meta?.rung ?? 0) - (b.meta?.rung ?? 0));

describe('the tutorial, a ladder', () => {
  test('its pieces carry rung=, 1 to the last, one each; a rung only on the tutorial', () => {
    expect(tutorial.map((p) => p.meta?.rung)).toEqual(LADDER.map((_, i) => i + 1));
    for (const p of pieces)
      if (p.meta?.rung != null)
        expect(
          tutorial.map((t) => t.key),
          `${p.key}: rung= without the tutorial tag`,
        ).toContain(p.key);
  });

  test('every form of the reference is on one rung, and only on one', () => {
    const keys = entries().map(formKey);
    expect(new Set(keys).size, 'two forms with one key').toBe(keys.length);
    const declared = LADDER.flatMap((r) => r.forms);
    expect(
      declared.filter((k, i) => declared.indexOf(k) !== i),
      'on two rungs',
    ).toEqual([]);
    expect(
      declared.filter((k) => !keys.includes(k)),
      'not in the reference',
    ).toEqual([]);
    expect(
      keys.filter((k) => !declared.includes(k)),
      'on no rung',
    ).toEqual([]);
  });

  test('each rung introduces its concept, and uses only what the rungs before it introduced', () => {
    const known = new Set<string>();
    for (const [i, rung] of LADDER.entries()) {
      const p = tutorial[i];
      const used = formsUsed(p.source);
      const fresh = [...used].filter((k) => !known.has(k));
      // (what it uses that no rung before it introduced is exactly its concept: all of it, nothing more)
      const ahead = fresh.filter((k) => !rung.forms.includes(k)).map((k) => `${k} (rung ${LADDER.findIndex((r) => r.forms.includes(k)) + 1})`);
      const missing = rung.forms.filter((k) => !fresh.includes(k));
      expect({ ahead, missing }, `rung ${i + 1}, ${p.key}: ${rung.concept}`).toEqual({ ahead: [], missing: [] });
      for (const k of used) known.add(k);
    }
  });
});
