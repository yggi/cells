// The stab lines (the facet `stab`): the part the stab performer plays, lifted from examples/electroswing.md. Each uses
// `&harm` alone, fits a workbench with a meter and a harmony, and played by the stab performer sounds the chords in force.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { fitOf } from './fit';
import { createRepository } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { ELECTRO_SWING, SWING_JAZZ } from './presets';
import { STAB_FRAGMENTS } from './stab';

const HOST = '&bar meter("4/4") step=120bpm\n&key scale(harmonic, D)\n&harm over=&key step=1m [0,2,4] [4,6,8]';

describe('the stab lines', () => {
  it('are the Charleston, associated as the facet stab at the point proposed for Electro swing', () => {
    expect(STAB_FRAGMENTS.map((f) => f.id)).toEqual(['Charleston stabs']);
    expect(STAB_FRAGMENTS[0]!.association).toEqual([{ point: ELECTRO_SWING, weight: 1, facet: 'stab' }]);
  });

  it.each(STAB_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s uses &harm alone, and fits a workbench that writes it', (_, text) => {
    expect(holesOf(text, compileSource).uses).toEqual(['&harm']);
    expect(fitOf(text, HOST).fits).toBe(true);
  });

  it('played by the stab performer, the Charleston sounds the chord in force on one and on the and of two', () => {
    const piece = `use &stabline from "Charleston stabs"\nuse &stab, &keysV from "stab performer"\n${HOST}\n&stabLevel map=amp .5\n&keysV s=saw loop=C3\n&out map=sample [&stab]`;
    const r = compileSource(piece, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    // (at 120 bpm an eighth is .25 s: D F A on one and on the and of two, in the D minor bar; A C♯ E in the A bar)
    const notes = eventsBetween(plan(r, codeShifts(r)), 0, 4).map((e) => [e.at, Math.round(69 + 12 * Math.log2(e.freq / 440))]);
    expect(notes).toEqual([0, 0.75, 2, 2.75].flatMap((at) => (at < 2 ? [50, 53, 57] : [57, 61, 64]).map((n) => [at, n])));
    const ids = createRepository(LIBRARY).query(SWING_JAZZ, 1, {}, { facet: 'stab' });
    // (the only stab line, found from anywhere: a query for the stab at a preset finds it, at a distance)
    expect(ids.map((f) => f.fragment.id)).toEqual(['Charleston stabs']);
    expect(ids[0]!.distance).toBeGreaterThan(0);
  });
});
