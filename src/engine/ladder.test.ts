import { describe, expect, test } from 'vitest';
import { entries } from '../../tools/reference';
import { formKey, formsUsed, STUBS, TIERS } from './ladder';
import { pieceMeta } from './parser';
import { ORDER } from './order';
import { PRESETS } from './presets';
import { canonicalTags, TUTORIAL } from './tags';

// The tutorial (#170) in tiers: every form of the reference on exactly one tier, and the pieces of a tier together show all of its forms.
const pieces = Object.entries(PRESETS).map(([key, p]) => ({ key, source: p.source, meta: pieceMeta(p.source) }));
const tutorial = pieces.filter((p) => canonicalTags(p.meta?.tags ?? []).includes(TUTORIAL));

describe('the tutorial, in tiers', () => {
  test('its pieces carry tier=, each of the tiers 1 to the last has some; a tier only on the tutorial', () => {
    for (const p of tutorial) expect(p.meta?.tier, `${p.key}: tier=`).toBeGreaterThanOrEqual(1);
    expect([...new Set(tutorial.map((p) => p.meta?.tier))].sort((a, b) => a! - b!)).toEqual(TIERS.map((_, i) => i + 1));
    for (const p of pieces)
      if (p.meta?.tier != null)
        expect(
          tutorial.map((t) => t.key),
          `${p.key}: tier= without the tutorial tag`,
        ).toContain(p.key);
  });

  test('every form of the reference is on one tier, and only on one', () => {
    const keys = entries().map(formKey);
    expect(new Set(keys).size, 'two forms with one key').toBe(keys.length);
    const declared = TIERS.flatMap((r) => r.forms);
    expect(
      declared.filter((k, i) => declared.indexOf(k) !== i),
      'on two tiers',
    ).toEqual([]);
    expect(
      declared.filter((k) => !keys.includes(k)),
      'not in the reference',
    ).toEqual([]);
    expect(
      keys.filter((k) => !declared.includes(k) && !STUBS.has(k)),
      'on no tier',
    ).toEqual([]);
  });

  test('the pieces of a tier use only its forms and those of the tiers before it, and show all of its own', () => {
    const known = new Set<string>();
    for (const [i, tier] of TIERS.entries()) {
      const mine = tutorial.filter((p) => p.meta?.tier === i + 1);
      const usedBy = new Map(mine.map((p) => [p.key, formsUsed(p.source)]));
      for (const k of tier.forms) known.add(k);
      // (a form of a later tier, in a piece that comes before its tier)
      for (const [key, used] of usedBy) {
        const ahead = [...used].filter((k) => !known.has(k)).map((k) => `${k} (tier ${TIERS.findIndex((t) => t.forms.includes(k)) + 1})`);
        expect(ahead, `tier ${i + 1}, ${key}: forms of a later tier`).toEqual([]);
      }
      // (a form of the tier that none of its pieces shows)
      const shown = new Set([...usedBy.values()].flatMap((u) => [...u]));
      expect(
        tier.forms.filter((k) => !shown.has(k)),
        `tier ${i + 1} ${tier.name}: forms none of ${mine.map((p) => p.key).join(', ')} shows`,
      ).toEqual([]);
    }
  });

  test('a tier’s pieces come in the library’s order, the tiers one after the other', () => {
    const order = tutorial.map((p) => ORDER.indexOf(p.key as (typeof ORDER)[number]));
    expect(order.every((o) => o >= 0)).toBe(true);
    const keys = [...tutorial].sort((a, b) => ORDER.indexOf(a.key as (typeof ORDER)[number]) - ORDER.indexOf(b.key as (typeof ORDER)[number])).map((p) => p.meta?.tier);
    expect(keys, 'the library lists the tutorial tier by tier').toEqual([...keys].sort((a, b) => a! - b!));
  });
});
