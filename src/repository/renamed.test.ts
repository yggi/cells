import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { RENAMED_IDS, wordOf } from '../engine/renamed';
import { byId } from './fragments';
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
  it('every seed id is a word now, or a template taken with its arguments; each of the 79 old ones names its word by the rule, and the seven modes the diatonic fragment with theirs', () => {
    // (or a document's part, its key and its head, `kinderlied/twinkle`: decision 082)
    expect([...ids].filter((id) => !/^[A-Za-z_][A-Za-z0-9_]*(\/[A-Za-z_]\w*|\([A-Za-z_]\w*=[^=&]+(, [A-Za-z_]\w*=[^=&]+)*\))?$/.test(id))).toEqual([]);
    expect(RENAMED_IDS.size).toBe(79);
    for (const [old, word] of RENAMED_IDS) {
      expect([old, ids.has(word), ids.has(old)]).toEqual([old, true, false]);
      if (/^diatonic\(/.test(word)) expect(word).toBe(`diatonic(mode=${old})`);
      // (the thirteen meters, each the meter fragment with its grouping or swing now, #507: by their word, from the old id too)
      else if (/^meter(\(|$)/.test(word)) expect([old, METERS[wordOf(old)]]).toEqual([old, word]);
      else expect([old, wordOf(old)]).toEqual([old, word]);
    }
  });

  it('an old id resolves to nothing: a piece that names one finds no fragment (#643)', () => {
    for (const old of RENAMED_IDS.keys()) expect([old, resolveSeed(old)]).toEqual([old, null]);
    const said = compileSource(piece('"4/4 swung on 8n"'), undefined, SEED).diagnostics.filter((d) => d.severity === 'error');
    expect(said.map((d) => d.message)).toEqual(expect.arrayContaining(['No fragment "4/4 swung on 8n" to use']));
    expect(compileSource(piece('meter(swing=8n:2/3)'), undefined, SEED).diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
  });

  it('a tie between two fragments breaks as it did before the rename: by the old id', () => {
    // ("4/4" sorted before "bass performer", and "Bossa nova drums" before "bossa nova clave", by code unit)
    expect(byId('meter', 'bass_performer')).toBeLessThan(0);
    expect(byId('bossa_nova_drums', 'bossa_nova_clave')).toBeLessThan(0);
    expect(byId('bebop', 'gypsy')).toBeLessThan(0);
  });
});
