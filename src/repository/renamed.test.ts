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
/** The thirteen meters' words before #507, and the meter fragment taken with what each was. */
const METERS: Record<string, string> = {
  meter_4_4: 'meter',
  meter_4_4_swung_on_8n: 'meter(swing=8n:2/3)',
  meter_4_4_leaning_on_16n: 'meter(swing=16n:.65)',
  meter_4_4_leaning_lightly_on_16n: 'meter(swing=16n:.6)',
  meter_4_4_leaning_faintly_on_16n: 'meter(swing=16n:31/60)',
  meter_4_4_alla_breve: 'meter(grouping=meter("2/2", 2))',
  meter_2_4: 'meter(grouping=meter("2/4"))',
  meter_3_4: 'meter(grouping=meter("3/4"))',
  meter_6_8: 'meter(grouping=meter("6/8"))',
  meter_12_8: 'meter(grouping=meter("12/8"))',
  meter_5_4: 'meter(grouping=meter("5/4"))',
  meter_7_8: 'meter(grouping=meter("7/8"))',
  meter_10_8: 'meter(grouping=meter("10/8"))',
};
const piece = (id: string) => `&bar from ${id} 120bpm\n&t step=8n 0 2 4 7\n&v s=tri loop=C4\n&out map=sample [&t * &v]`;

describe('the seed ids as words (#387)', () => {
  it('every seed id is a word now, or a template taken with its arguments; each of the 59 old ones names its word by the rule, and the seven modes the diatonic fragment with theirs', () => {
    expect([...ids].filter((id) => !/^[A-Za-z_][A-Za-z0-9_]*(\([A-Za-z_]\w*=[^=&]+(, [A-Za-z_]\w*=[^=&]+)*\))?$/.test(id))).toEqual([]);
    expect(RENAMED_IDS.size).toBe(79);
    for (const [old, word] of RENAMED_IDS) {
      expect([old, ids.has(word), ids.has(old)]).toEqual([old, true, false]);
      if (/^diatonic\(/.test(word)) expect(word).toBe(`diatonic(mode=${old})`);
      // (the thirteen meters, each the meter fragment with its grouping or swing now, #507: by their word, from the old id too)
      else if (/^meter(\(|$)/.test(word)) expect([old, METERS[wordOf(old)]]).toEqual([old, word]);
      else expect([old, wordOf(old)]).toEqual([old, word]);
    }
  });

  it('an old id resolves to its word’s text, so a lockfile’s hash still holds', () => {
    for (const [old, word] of RENAMED_IDS) expect([old, resolveSeed(old)]).toEqual([old, resolveSeed(word)]);
  });

  it('a piece that names an old id plays as with the word, and warns once, naming the word and Migrate', () => {
    const old = piece('"4/4 swung on 8n"');
    const said = compileSource(old, undefined, SEED).diagnostics.filter((d) => d.severity !== 'info');
    expect(said.map((d) => [d.severity, d.message])).toEqual([
      ['warning', '"4/4 swung on 8n" is renamed meter(swing=8n:2/3): write from meter(swing=8n:2/3) (#387; Migrate rewrites it)'],
    ]);
    expect(compileSource(piece('meter(swing=8n:2/3)'), undefined, SEED).diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
    expect(soundsIdentical(old, piece('meter(swing=8n:2/3)'), undefined, SEED)).toBe(true);
    expect(migrate(old, SEED).source).toBe(piece('meter(swing=8n:2/3)'));
    // (and a word that became the meter fragment taken with its grouping, #507)
    expect(migrate(piece('meter_7_8'), SEED).source).toBe(piece('meter(grouping=meter("7/8"))'));
    expect(soundsIdentical(piece('meter_7_8'), piece('meter(grouping=meter("7/8"))'), undefined, SEED)).toBe(true);
    // (an old meter taken with an argument it still takes: the word's own arguments joined with the line's, #464)
    expect(migrate(piece('meter_7_8(swing=8n:2/3)'), SEED).source).toBe(piece('meter(grouping=meter("7/8"), swing=8n:2/3)'));
    expect(soundsIdentical(piece('meter_7_8(swing=8n:2/3)'), piece('meter(grouping=meter("7/8"), swing=8n:2/3)'), undefined, SEED)).toBe(true);
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
    expect(byId('meter', 'bass_performer')).toBeLessThan(0);
    expect(byId('bossa_nova_drums', 'bossa_nova_clave')).toBeLessThan(0);
    expect(byId('bebop', 'gypsy')).toBeLessThan(0);
  });
});

describe('a learned layer kept before the rename (#387)', () => {
  // (a layer as a frontend kept it at v0.15.0: a point on a seed meter, a pair of a meter and a groove, in that order)
  const kept: LearnedLayer = {
    filed: [],
    points: [{ id: '4/4 leaning on 16n', point: { swing: 0, sync: 0.3, harm: 0.5, drive: 0.5, bright: 0.25 }, weight: 1.1 }],
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
    expect(now.points.map((p) => p.id)).toEqual(['meter(swing=16n:.65)']);
    expect(now.together).toEqual([
      { ids: ['meter(swing=16n:.65)', 'funk_drums'], count: 3 },
      { ids: ['bebop', 'walking_bass'], count: 1 },
    ]);
    expect(layerProblems(now)).toEqual([]);
    expect(repository.merge(now).unheld).toEqual([]);
  });

  it('a point on a mode before #387 B1 is a point on the diatonic fragment taken with that mode', () => {
    const modes: LearnedLayer = {
      filed: [],
      points: [{ id: 'dorian', point: { sync: 0.5, harm: 0.5, drive: 0.5, bright: 0.25 }, weight: 1.1 }],
      together: [{ ids: ['dorian', 'funk_bass'], count: 2 }],
    };
    const now = renamedLayer(modes);
    expect(now.points.map((p) => p.id)).toEqual(['diatonic(mode=dorian)']);
    expect(now.together).toEqual([{ ids: ['diatonic(mode=dorian)', 'funk_bass'], count: 2 }]);
    expect(repository.merge(now).unheld).toEqual([]);
  });

  it('a layer that names no old id is returned as it is', () => {
    expect(renamedLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER);
  });
});
