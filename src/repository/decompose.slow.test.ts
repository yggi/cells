import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { decompose, writtenOut } from './decompose';
import { FORM_FRAGMENTS } from './forms';
import { resolveSeed } from './library';
import { MOTIF_FRAGMENTS } from './motifs';

/** The meters the seed motifs are written in, 4/4 first: each motif is read in the first whose one or two bars it fills. */
const METERS = ['4/4', '3/4', '6/8', '5/4', '7/8', '10/8', '12/8', '2/4', '2/2'];

/** The meter a seed motif fills one or two bars of, or null. */
function meterOf(id: string): string | null {
  for (const meter of METERS) {
    const r = compileSource(`&bar meter("${meter}") step=120bpm\n&key scale(ionian, C)\n&${id} from ${id} &key`, undefined, {
      resolve: resolveSeed,
    });
    const cell = r.cells.get(id);
    const bar = r.cells.get('bar')?.meter;
    if (!r.ok || !cell || !bar) continue;
    const bars = cell.steps / 8 / (bar.pulses / bar.unit);
    if (Math.abs(bars - 1) < 1e-9 || Math.abs(bars - 2) < 1e-9) return meter;
  }
  return null;
}

describe('every seed form over every seed motif, written out and decomposed (#512, rung 1)', () => {
  it('comes back as the same form over the same motif, no helper set, in 100 % of the 294 (six forms over 49 motifs since #572)', () => {
    const wrong: string[] = [];
    let tried = 0;
    for (const motif of MOTIF_FRAGMENTS) {
      const meter = meterOf(motif.id);
      expect(meter, motif.id).not.toBeNull();
      for (const form of FORM_FRAGMENTS) {
        const line = writtenOut(`&${motif.id} from ${motif.id} &key\n&song from ${form.id} &${motif.id}`, 'song', meter!, 'lead');
        expect(line, `${form.id} over ${motif.id}`).not.toBeNull();
        tried++;
        const d = decompose(line!, 'lead', meter!);
        if (d.form !== form.id || d.call !== motif.id || Object.keys(d.helpers).length > 0)
          wrong.push(`${form.id} over ${motif.id}: ${d.form} over ${d.call} ${JSON.stringify(d.helpers)}`);
      }
    }
    expect(tried).toBe(FORM_FRAGMENTS.length * MOTIF_FRAGMENTS.length);
    expect(tried).toBe(294);
    expect(wrong).toEqual([]);
  });
});
