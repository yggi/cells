// The engine's wall-clock ceilings, out of the quick tier (#237, #242): a loaded machine moves the milliseconds, so the
// quick tests bound the work instead (the compiles Vary makes) or only that the work is done, and these ceilings run in
// `npm run test:all`, on a machine quiet enough to read them.
import { describe, expect, it } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import { compileSource } from './compile';
import { liveAt } from './live';
import { PRESETS } from './presets';
import { codeShifts } from './program';
import { variations, varied, type Variation } from './vary';

describe('what the engine costs', () => {
  // (as `routing.test.ts` works them out: a piece is opened or edited and this runs once, so a sign if one example is slow)
  it('the heads at rest of an example take under 50 ms, on average over every example', () => {
    const t0 = performance.now();
    let n = 0;
    for (const p of Object.values(PRESETS)) {
      const r = compileSource(p.source);
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
});
