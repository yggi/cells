// Lock-in, a witness (decision 048, point 6; #145, #151, #162): the walk of `lockin.ts` over draws 0–3, 32 runs of 1,250
// sections (40,000), about 5 s. The bound itself is over draws 0–31 in `lockin.slow.test.ts` (`npm run test:all`): 32 runs
// can't tell 5 points from 6, since a draw of 8 spreads by up to 2.5 points. This one holds what 32 runs can say, and
// that the walk files fragments of its own, finds them again, and keeps its layer small.
// `LOCKIN_REPORT=1 npx vitest run --silent=false src/repository/lockin.test.ts` prints the numbers.
import { describe, expect, it } from 'vitest';
import { DRAW, drift, FACETS, LOCK_IN_BOUND, LOCK_IN_PRESETS, lockIn, lockInDraws, SECTIONS, topThree } from './lockin';

/**
 * What a pool of 4 draws may read when the bound holds over 32: the bound plus twice the standard error of a pool of 4
 * draws, a draw of 8 spreading by up to 2.5 points (`DRAW_SPREAD`, which the slow test holds): 5 + 2 · 2.5 / √4 = 7.5
 * points. It fires on what the bound was built against: a cap of 1.5 reads 7.9 here (use moves, the rhythms) and 8.2
 * (with use together), a reach of 1 (a known group pulling 0.1) 8.0, where the values chosen read 3.2 and 4.6 (#162).
 */
const WITNESS_BOUND = LOCK_IN_BOUND + (2 * 0.025) / Math.sqrt(4);

const LEARNINGS = { 'use moves': { move: true, together: false }, 'use moves and use together': { move: true, together: true } };
const { baselines, learned } = lockInDraws(0, 3, Object.values(LEARNINGS));
const ways = Object.keys(LEARNINGS).map((name, k) => [name, learned[k]!] as const);
const allRuns = learned.flat(2);

describe('lock-in, a witness over 4 draws of 8 runs, 40,000 sections at entropy 0.3', () => {
  if (process.env['LOCKIN_REPORT'])
    for (const [name, draws] of ways) {
      console.log(name);
      console.table(
        draws.flatMap((runs, d) =>
          runs.map((r, i) => ({
            draw: d,
            run: Object.keys(LOCK_IN_PRESETS)[i],
            ...Object.fromEntries(
              FACETS.flatMap((f) => [
                [`${f} top 3`, +topThree(r.kept[f]).toFixed(3)],
                [`${f} alone`, +topThree(baselines[d]![i]!.alone[f]).toFixed(3)],
              ]),
            ),
            'filed new': r.filedNew,
            'filed, held': r.filedHeld,
            'first filed': r.firstFiled,
            'found again': r.firstFoundAgain,
            points: r.layer.points.length + r.layer.filed.reduce((n, f) => n + f.fragment.association.length, 0),
            pairs: r.layer.together.length,
            bytes: JSON.stringify(r.layer).length,
          })),
        ),
      );
      for (const f of FACETS) {
        const l = lockIn(baselines, draws, f);
        console.log(f, { pooled: l.pooled, standardError: l.standardError, perDraw: l.perDraw, drift: drift(baselines.flat(), draws.flat(), f) });
      }
    }

  it('walks 40,000 sections, 1,250 a run, every way of learning over the same walks', () => {
    expect(baselines.flat().map((b) => b.seed)).toEqual([...Array(4 * DRAW).keys()]);
    for (const b of baselines.flat()) for (const f of FACETS) expect(b.alone[f]).toHaveLength(SECTIONS);
    for (const r of allRuns) for (const f of FACETS) expect(r.kept[f]).toHaveLength(SECTIONS);
  });

  it.each(ways.flatMap(([name, draws]) => FACETS.map((f) => [name, f, draws] as const)))(
    '%s add at most 7.5 points to the share among the 3 most used, over 32 runs: %s',
    (_, facet, draws) => {
      expect(lockIn(baselines, draws, facet).pooled).toBeLessThanOrEqual(WITNESS_BOUND);
    },
  );

  it('files fragments of its own where it misses, and finds them again within 3 sections', () => {
    const filed = allRuns.filter((r) => r.firstFiled !== null);
    expect(filed.length).toBeGreaterThan(0);
    for (const r of filed) expect(r.firstFoundAgain! - r.firstFiled!).toBeLessThanOrEqual(3);
  });

  it('keeps the layer small: a few points and pairs, under 4 KB as JSON after 1,250 sections', () => {
    for (const r of allRuns) expect(JSON.stringify(r.layer).length).toBeLessThan(4096);
  });
});
