// The stab lines (the facet `stab`): the part the stab performer plays, lifted from examples/electroswing.md. Each uses
// `&harm` alone, fits a workbench with a meter and a harmony, and played by the stab performer sounds the chords in force.
import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { fitsAs } from './fit';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { createRepository } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { ELECTRO_SWING, SPOOKY, stylePoint, SWING_JAZZ } from './styles';

import { STAB_FRAGMENTS } from './stab';

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

const HOST = '&bar meter("4/4") step=120bpm\n&key scale(harmonic, D)\n&harm over=&key step=1m [0,2,4] [4,6,8]';

describe('the stab lines', () => {
  it('are the Charleston, associated as the facet stab at the point proposed for Electro swing; then Spooky’s and the rave stabs, each at its style (#572)', () => {
    expect(STAB_FRAGMENTS.map((f) => f.id)).toEqual(['charleston_stabs', 'spooky_stabs', 'rave_stabs']);
    expect(STAB_FRAGMENTS[0]!.association).toEqual([{ point: ELECTRO_SWING, weight: 0.4, facet: 'stab' }]);
    expect(STAB_FRAGMENTS[1]!.association).toEqual([{ point: SPOOKY, weight: 0.4, facet: 'stab' }]);
    expect(STAB_FRAGMENTS[2]!.association).toEqual([{ point: stylePoint('happyHardcore'), weight: 0.4, facet: 'stab' }]);
  });

  // (Spooky's stabs are a bar of five beats, ten eighths: they fit a workbench in 5/4)
  const hostOf = (id: string) => (id === 'spooky_stabs' ? HOST.replace('meter("4/4")', 'meter("5/4")') : HOST);
  it.each(STAB_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s uses &harm alone, and fits a workbench that writes it', (id, text) => {
    expect(holesOf(text, compileSource).uses).toEqual(['&harm']);
    expect(takenOn(text, hostOf(id), '&harm').fits).toBe(true);
  });

  it('played by the stab performer, the Charleston sounds the chord in force on one and on the and of two', () => {
    const piece = `&stabline from charleston_stabs &harm\n&stab, &stabOut from stab_performer(stabLevel=&stabLevel) &stabline\n${HOST}\n&stabLevel map=amp .5\n&keysV s=saw loop=C3\n&out map=sample [&stabOut]`;
    const r = compileSource(piece, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    // (at 120 bpm an eighth is .25 s: D F A on one and on the and of two, in the D minor bar; A C♯ E in the A bar)
    const notes = eventsBetween(plan(r, codeShifts(r)), 0, 4).map((e) => [e.at, Math.round(69 + 12 * Math.log2(e.freq / 440))]);
    expect(notes).toEqual([0, 0.75, 2, 2.75].flatMap((at) => (at < 2 ? [50, 53, 57] : [57, 61, 64]).map((n) => [at, n])));
    const ids = createRepository(LIBRARY).query(SWING_JAZZ, 1, {}, { facet: 'stab' });
    // (a stab line found from anywhere: a query for the stab at a preset finds one, at a distance; each at weight 0.4, #572)
    expect(ids.map((f) => f.fragment.id)).toEqual(['charleston_stabs']);
    expect(ids[0]!.distance).toBeGreaterThan(0);
  });
});
