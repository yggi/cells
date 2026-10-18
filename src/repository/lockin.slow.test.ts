// Lock-in, the bound (decision 048, point 6, amended by #162): the walk of `lockin.ts` over draws 0–31, 256 runs of
// 1,250 sections (320,000), about 40 s. Over one draw of 8 the measure moved by whole points with the seeds (use moves
// added 3.2 points to the rhythms' share on draw 0 and 8.0 on draw 1), so the bound is stated over the pool and leaves
// room for the pool's own noise. `lockin.test.ts` is the quick witness over draws 0–3.
// `LOCKIN_REPORT=1 npx vitest run --project slow --silent=false src/repository/lockin.slow.test.ts` prints the numbers.
import { describe, expect, it } from 'vitest';
import { FACETS, LOCK_IN_BOUND, lockIn, lockInDraws } from './lockin';

/** How far a draw of 8 may spread from the pool (the standard deviation of the 32 draws' values): the quick witness's bound is built on it. */
const DRAW_SPREAD = 0.025;

const LEARNINGS = { 'use moves': { move: true, together: false }, 'use moves and use together': { move: true, together: true } };
const { baselines, learned } = lockInDraws(0, 31, Object.values(LEARNINGS));
const cases = Object.keys(LEARNINGS).flatMap((name, k) => FACETS.map((facet) => [name, facet, lockIn(baselines, learned[k]!, facet)] as const));
const points = (x: number) => +(100 * x).toFixed(2);

describe('lock-in, over 32 draws of 8 runs, 320,000 sections at entropy 0.3', () => {
  if (process.env['LOCKIN_REPORT'])
    console.table(
      cases.map(([name, facet, l]) => ({
        learning: name,
        facet,
        pooled: points(l.pooled),
        'standard error': points(l.standardError),
        'pooled + 2 SE': points(l.pooled + 2 * l.standardError),
        'draw spread': points(l.standardError * Math.sqrt(l.perDraw.length)),
        'least draw': points(Math.min(...l.perDraw)),
        'most draw': points(Math.max(...l.perDraw)),
        'draws 0–3': l.perDraw.slice(0, 4).map(points).join(' '),
      })),
    );

  it.each(cases)('%s add at most 5 points to the share among the 3 most used, with twice the standard error: %s', (_, __, l) => {
    expect(l.perDraw).toHaveLength(32);
    expect(l.pooled + 2 * l.standardError).toBeLessThanOrEqual(LOCK_IN_BOUND);
  });

  it.each(cases)('%s spread by at most 2.5 points from one draw of 8 to the next: %s', (_, __, l) => {
    expect(l.standardError * Math.sqrt(l.perDraw.length)).toBeLessThanOrEqual(DRAW_SPREAD);
  });

  it('files fragments of its own where it misses, finds them again within 3 sections, and keeps the layer under 4 KB', () => {
    const runs = learned.flat(2);
    const filed = runs.filter((r) => r.firstFiled !== null);
    expect(filed.length).toBeGreaterThan(0);
    for (const r of filed) expect(r.firstFoundAgain! - r.firstFiled!).toBeLessThanOrEqual(3);
    for (const r of runs) expect(JSON.stringify(r.layer).length).toBeLessThan(4096);
  });
});
