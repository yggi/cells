import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { migrate } from '../engine/migrate';
import { RENAMED_IDS, wordOf } from '../engine/renamed';
import { soundsIdentical } from '../engine/sameness';
import { byId, createRepository, EMPTY_LAYER, layerProblems, type LearnedLayer } from './fragments';
import { renamedLayer } from './learned';
import { LIBRARY, resolveSeed } from './library';

// The seed's ids as words (#387): 59 ids that weren't words, each read for a minor version as its word's fragment.
const SEED = { resolve: resolveSeed };
const ids = new Set(LIBRARY.map((f) => f.id));
const piece = (id: string) => `&bar from ${id} 120bpm\n&t step=8n 0 2 4 7\n&v s=tri loop=C4\n&out map=sample [&t * &v]`;

describe('the seed ids as words (#387)', () => {
  it('every seed id is a word now, and each of the 59 old ones names its word by the rule', () => {
    expect([...ids].filter((id) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(id))).toEqual([]);
    expect(RENAMED_IDS.size).toBe(59);
    for (const [old, word] of RENAMED_IDS) {
      expect([old, ids.has(word), wordOf(old)]).toEqual([old, true, word]);
      expect([old, ids.has(old)]).toEqual([old, false]);
    }
  });

  it('an old id resolves to its word’s text, so a lockfile’s hash still holds', () => {
    for (const [old, word] of RENAMED_IDS) expect([old, resolveSeed(old)]).toEqual([old, resolveSeed(word)]);
  });

  it('a piece that names an old id plays as with the word, and warns once, naming the word and Migrate', () => {
    const old = piece('"4/4 swung on 8n"');
    const said = compileSource(old, undefined, SEED).diagnostics.filter((d) => d.severity !== 'info');
    expect(said.map((d) => [d.severity, d.message])).toEqual([
      ['warning', '"4/4 swung on 8n" is renamed meter_4_4_swung_on_8n: write from meter_4_4_swung_on_8n (#387; Migrate rewrites it)'],
    ]);
    expect(compileSource(piece('meter_4_4_swung_on_8n'), undefined, SEED).diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
    expect(soundsIdentical(old, piece('meter_4_4_swung_on_8n'), undefined, SEED)).toBe(true);
    expect(migrate(old, SEED).source).toBe(piece('meter_4_4_swung_on_8n'));
  });

  it('a host whose own library holds such an id as another fragment is left alone: no warning, no rewrite', () => {
    const own = '&bar meter("3/4")';
    const host = { resolve: (id: string) => (id === '4/4' ? own : resolveSeed(id)) };
    const text = piece('"4/4"');
    expect(compileSource(text, undefined, host).diagnostics.some((d) => d.message.includes('is renamed'))).toBe(false);
    expect(migrate(text, host).source).toBe(text);
  });

  it('a tie between two fragments breaks as it did before the rename: by the old id', () => {
    // ("4/4" sorted before "bass performer", and "Bossa nova drums" before "bossa nova clave", by code unit)
    expect(byId('meter_4_4', 'bass_performer')).toBeLessThan(0);
    expect(byId('bossa_nova_drums', 'bossa_nova_clave')).toBeLessThan(0);
    expect(byId('bebop', 'gypsy')).toBeLessThan(0);
  });
});

describe('a learned layer kept before the rename (#387)', () => {
  // (a layer as a frontend kept it at v0.15.0: a point on a seed meter, a pair of a meter and a groove, in that order)
  const kept: LearnedLayer = {
    filed: [],
    points: [{ id: '4/4 leaning on 16n', point: { swing: 0, sync: 0.3, harm: 0.5, artic: 0.5, energy: 0.5 }, weight: 1.1 }],
    together: [
      { ids: ['4/4 leaning on 16n', 'Funk drums'], count: 3 },
      { ids: ['bebop', 'walking bass'], count: 1 },
    ],
  };
  const repository = createRepository(LIBRARY);

  it('names ids no repository holds: read as it is, its points and pairs would be left out', () => {
    expect(repository.merge(kept).unheld).toEqual(['4/4 leaning on 16n', 'Funk drums', 'walking bass']);
  });

  it('read through renamedLayer, keeps every point and pair, in order, and nothing is left out', () => {
    const now = renamedLayer(kept);
    expect(now.points.map((p) => p.id)).toEqual(['meter_4_4_leaning_on_16n']);
    expect(now.together).toEqual([
      { ids: ['meter_4_4_leaning_on_16n', 'funk_drums'], count: 3 },
      { ids: ['bebop', 'walking_bass'], count: 1 },
    ]);
    expect(layerProblems(now)).toEqual([]);
    expect(repository.merge(now).unheld).toEqual([]);
  });

  it('a layer that names no old id is returned as it is', () => {
    expect(renamedLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER);
  });
});
