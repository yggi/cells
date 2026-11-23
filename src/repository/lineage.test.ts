// A variation's origin and its lineage (decision 052, points 4 and 9): filed with `variationMeta`, read back by
// `originOf`, `ancestry`, `rootOf` and `familyOf` over a learned layer, a seed's variation of a variation the same as
// Jambot's `familyOf` reads it (yggi/jambot `novelty.test.ts`), a cycle ended, and a chain replayed by `variationBy`.
import { describe, expect, it } from 'vitest';
import { HARMONY_OPERATORS, variationBy, variations } from '../engine/vary';
import { createRepository, EMPTY_LAYER, type LearnedLayer } from './fragments';
import { fileFragment } from './learned';
import { LIBRARY } from './library';
import { ancestry, BY, familyOf, originOf, rootOf, variationMeta, VARIES } from './lineage';
import { seedFragments } from './seed';

const WORKBENCH = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const OPTIONS = { workbench: WORKBENCH, operators: HARMONY_OPERATORS };
const SEED = seedFragments('harmony').find((f) => f.id === 'dark_cadence')!;
const repository = createRepository(LIBRARY);

/** The dark cadence, a variation of it, a variation of that, and a progression filed as heard, as a layer holds them. */
function filings() {
  let layer: LearnedLayer = EMPTY_LAYER;
  const file = (text: string, created: string, meta = {}) => {
    const filed = fileFragment(repository, layer, { text, point: { harm: 0.9 }, facet: 'harmony', source: 'composer', created, meta });
    layer = filed.layer;
    return filed.id;
  };
  const once = variationBy(SEED.text, 'third &harm 2 -2', OPTIONS)!;
  const v = file(once.apply(SEED.text), 'bar 8', variationMeta(SEED.id, once));
  const vText = once.apply(SEED.text);
  const twice = variations(vText, OPTIONS).find((x) => x.rule === 'dominant')!;
  const w = file(twice.apply(vText), 'bar 16', variationMeta(v, twice));
  const h = file('&harm from &key\n&harm over=&key step=1m cycle=4 [0,2,4] [1,3,5] [4,6,8] [4,6,8]', 'bar 24');
  return { layer, v, w, h, once, twice, vText };
}

describe('a variation filed with its origin', () => {
  it('is filed with varies and by in its meta', () => {
    const { layer, v, once } = filings();
    expect(variationMeta(SEED.id, once)).toEqual({ [VARIES]: 'dark_cadence', [BY]: 'third &harm 2 -2' });
    expect(layer.filed.find((f) => f.fragment.id === v)!.meta).toMatchObject({ varies: 'dark_cadence', by: 'third &harm 2 -2' });
  });

  it('reads its origin back: what it varies and how, none for a seed or a filing heard', () => {
    const { layer, v, w, h, twice } = filings();
    expect(originOf(layer, v)).toEqual({ varies: 'dark_cadence', by: 'third &harm 2 -2' });
    expect(originOf(layer, w)).toEqual({ varies: v, by: twice.by });
    expect(originOf(layer, h)).toBeNull();
    expect(originOf(layer, 'dark_cadence')).toBeNull();
  });

  it('reads its ancestry to its root, each step with the by that made the one before it', () => {
    const { layer, v, w, h, twice } = filings();
    expect(ancestry(layer, w)).toEqual([{ id: w, by: twice.by }, { id: v, by: 'third &harm 2 -2' }, { id: 'dark_cadence' }]);
    expect(rootOf(layer, w)).toBe('dark_cadence');
    expect(ancestry(layer, h)).toEqual([{ id: h }]);
    expect(rootOf(layer, 'dark_cadence')).toBe('dark_cadence');
  });

  it('reads a family as Jambot does: the root first, which the layer didn’t file, then every filing from it', () => {
    const { layer, v, w, h } = filings();
    expect(familyOf(layer, w)).toEqual(['dark_cadence', v, w]);
    expect(familyOf(layer, 'dark_cadence')).toEqual(['dark_cadence', v, w]);
    expect(familyOf(layer, h)).toEqual([h]);
    expect(familyOf(layer, 'tonic_vamp')).toEqual(['tonic_vamp']);
  });

  it('replays a lineage from its root: each step’s by, made by variationBy, gives the text filed', () => {
    const { layer, w } = filings();
    const path = ancestry(layer, w);
    let text = SEED.text;
    for (const step of path.slice(0, -1).reverse()) text = variationBy(text, step.by!, OPTIONS)!.apply(text);
    expect(text).toBe(layer.filed.find((f) => f.fragment.id === w)!.fragment.text);
  });

  it('ends a chain that comes round to an id already on it', () => {
    const { layer, v, w } = filings();
    // (the first filing edited by hand to vary the second: a cycle no filing makes)
    const looped: LearnedLayer = { ...layer, filed: layer.filed.map((f) => (f.fragment.id === v ? { ...f, meta: { ...f.meta, varies: w } } : f)) };
    expect(ancestry(looped, w).map((a) => a.id)).toEqual([w, v]);
    expect(familyOf(looped, v)).toContain(v);
  });
});
