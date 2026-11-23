// The engine's wall-clock ceilings, out of the quick tier (#237, #242): a loaded machine moves the milliseconds, so the
// quick tests bound the work instead (the compiles Vary makes) or only that the work is done, and these ceilings run in
// `npm run test:all`, on a machine quiet enough to read them.
import { describe, expect, it } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import { compileSource } from './compile';
import { liveAt } from './live';
import { EXAMPLES } from './examples';
import { codeShifts } from './program';
import { FORM_OPERATORS, HARMONY_OPERATORS, variations, varied, type Variation } from './vary';
import { resolveSeed } from '../repository/library';
import { seedFragments } from '../repository/seed';

describe('what the engine costs', () => {
  // (as `routing.test.ts` works them out: a piece is opened or edited and this runs once, so a sign if one example is slow)
  it('the heads at rest of an example take under 50 ms, on average over every example', () => {
    const t0 = performance.now();
    let n = 0;
    for (const p of Object.values(EXAMPLES)) {
      const r = compileSource(p.source, undefined, { resolve: resolveSeed });
      liveAt(r, codeShifts(r), r.off, 0);
      n++;
    }
    expect((performance.now() - t0) / n).toBeLessThan(50);
  });

  // (as `vary/rhythm.test.ts` counts their compiles: all eight of E31's bars, their variations and a draw on each, five
  // times over)
  it('every variation of E31’s eight bars, and a draw on each, five times over, take under 10 s', () => {
    const options = { workbench: '&bar meter("4/4") step=120bpm', keep: ['&fill'], fewest: 3 };
    const bars = e31.witnesses.map((w) => w.text.split('\n').slice(1).join('\n'));
    const t0 = performance.now();
    for (let round = 0; round < 5; round++)
      for (const b of bars) {
        const all = variations(b, options);
        expect(varied(b, 0.5, options)).not.toBeNull();
        all.map((v: Variation) => v.apply(b));
      }
    expect(performance.now() - t0).toBeLessThan(10_000);
  });

  // (from `vary/harmony.test.ts` and `vary/form.test.ts`, out of the quick tier: the slot operators, swap and substitute,
  // nearly double a progression's variations, 419 to 789 over C, and CI's loaded quick run read 15.6 ms for the
  // twelve-bar's; the quick tests still count every variation and check each is given back by its `by`)
  it('Vary varies every seed progression in under 10 ms, its compile included, the median of 7 runs', () => {
    const options = { workbench: '&bar meter("4/4") step=120bpm\n&key scale(major, C)', operators: HARMONY_OPERATORS };
    for (const { id, text } of seedFragments('harmony')) {
      variations(text, options);
      expect(
        medianMs(() => variations(text, options)),
        id,
      ).toBeLessThan(10);
    }
  });

  // (on `vary/form.test.ts`'s benches: a form's holes filled by two motifs, a song plan on its song)
  it('Vary varies every seed form and song plan in under 15 ms, the median of 7 runs', () => {
    const benches = {
      forms: '&bar meter("4/4") step=120bpm\n&key scale(major, C)\n&a over=&key step=8n 0 2 4 2\n&call over=&key step=8n 7 5 3 1',
      songs: '&bar meter("4/4") step=120bpm\n&song .55',
    };
    for (const [facet, workbench] of Object.entries(benches))
      for (const { id, text } of seedFragments(facet)) {
        const options = { workbench, operators: FORM_OPERATORS, resolve: resolveSeed };
        variations(text, options);
        expect(
          medianMs(() => variations(text, options)),
          id,
        ).toBeLessThan(15);
      }
  });
});

/** The median of 7 runs of `run`, in milliseconds: a garbage collection or a loaded machine stalls one run, not the median. */
function medianMs(run: () => unknown): number {
  const times = Array.from({ length: 7 }, () => {
    const t0 = performance.now();
    run();
    return performance.now() - t0;
  }).sort((a, b) => a - b);
  return times[3]!;
}
