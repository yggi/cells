// Lock-in, measured (#145; decision 043's open question, decision 048): does learning by use lock the composer onto a few
// fragments? A seeded walk of the style point at entropy 0.3, as Jambot's radio walks (E30, E34), 8 runs of 1,250
// sections, one from each preset's point: 10,000 sections. Each section the composer asks for a meter, then for a rhythm
// with the meter chosen, keeps the first of each, files one of its own on a miss (nothing within 0.3, Jambot's
// `MISS_DISTANCE`), and uses what it kept at the section's point. The same walk with nothing learned is the baseline.
// `LOCKIN_REPORT=1 npx vitest run --silent=false src/repository/lockin.test.ts` prints the numbers.
import { describe, expect, it } from 'vitest';
import { renameCell } from '../engine/edit';
import { chanceOf } from '../engine/realize';
import { createRepository, EMPTY_LAYER, type LearnedLayer, type StylePoint } from './fragments';
import { fileFragment, useFragments, type Use } from './learned';
import { LIBRARY } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

const PRESETS = { SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ };
const SECTIONS = 1_250;
const ENTROPY = 0.3;
const MISS = 0.3;
const FACETS = ['meter', 'rhythm'] as const;
type Facet = (typeof FACETS)[number];

// The radio's step on each of the four axes the fragments are placed on, scaled by the entropy, folded back into [0, 1]:
// the walk of yggi/jambot packages/engine/src/radio.ts @ 327d6a8 (`walkRadio`, `RADIO.step`), its draws here keyed by
// cells' own `chanceOf` on the seed, the section and the axis.
const STEP: StylePoint = { sync: 0.08, harm: 0.1, artic: 0.1, energy: 0.06 };
const reflected = (x: number) => {
  const around = ((x % 2) + 2) % 2;
  return around > 1 ? 2 - around : around;
};
function walk(start: StylePoint, seed: number): StylePoint[] {
  const points = [start];
  for (let section = 1; section < SECTIONS; section++) {
    const at = points[section - 1]!;
    points.push(Object.fromEntries(Object.keys(STEP).map((axis) => [axis, reflected(at[axis]! + STEP[axis]! * ENTROPY * (2 * chanceOf(`walk|${seed}|${section}|${axis}`) - 1))])));
  }
  return points;
}

// What the composer makes on a miss: one of a few texts, drawn by seed and section. Two of each facet are a seed
// fragment's text after renaming (or respaced, or commented), so identity adds to that fragment instead.
const son = RHYTHM_FRAGMENTS.find((f) => f.id === 'son clave 3-2')!.text;
const MADE: Record<Facet, readonly string[]> = {
  meter: ['&bar meter("9/8")', '&bar meter("11/8")', '&bar meter("5/8")', '&bar meter("4/4") swing=16n:.58', '&bar  meter("7/8")', '&bar meter("3/4") // a waltz'],
  rhythm: [
    '&perc step=16n euclid(5,16)\n&rim map=midi(10) [&perc]',
    '&perc step=16n euclid(7,16,2)\n&rim map=midi(10) [&perc]',
    '&perc step=8n euclid(3,8)\n&rim map=midi(10) [&perc]',
    '&shaker step=16n euclid(11,16)\n&rim map=midi(10) [&shaker]',
    renameCell(renameCell(renameCell(son, 'clave', 'cl'), 'claves', 'cls'), 'rs', 'side'),
    son.replace(' &rs', '  &rs'),
  ],
};
const made = (facet: Facet, seed: number, section: number) => MADE[facet][Math.floor(chanceOf(`made|${seed}|${section}|${facet}`) * MADE[facet].length)]!;

/** How the composer learns in a run: whether its uses move associations, whether it counts and weighs use together. */
interface Learning {
  readonly move: boolean;
  readonly together: boolean;
}

interface Run {
  /** The fragment of each facet kept at each section. */
  readonly kept: Record<Facet, string[]>;
  /** The seed's first at each section, and whether it was a miss: the same walk with nothing learned. */
  readonly alone: Record<Facet, string[]>;
  readonly missed: Record<Facet, boolean[]>;
  /** Fragments filed new, and filings whose text was held already (identity). */
  readonly filedNew: number;
  readonly filedHeld: number;
  /** The section a new fragment was first filed (its first use), and the first a filed fragment was found again by a query. */
  readonly firstFiled: number | null;
  readonly firstFoundAgain: number | null;
  readonly layer: LearnedLayer;
}

const repository = createRepository(LIBRARY);

function run(start: StylePoint, seed: number, learn: Learning): Run {
  let layer = EMPTY_LAYER;
  const kept: Record<Facet, string[]> = { meter: [], rhythm: [] };
  const alone: Record<Facet, string[]> = { meter: [], rhythm: [] };
  const missed: Record<Facet, boolean[]> = { meter: [], rhythm: [] };
  const filedAt = new Map<string, number>();
  let [filedNew, filedHeld] = [0, 0];
  let [firstFiled, firstFoundAgain] = [null as number | null, null as number | null];
  for (const [section, point] of walk(start, seed).entries()) {
    const uses: Use[] = [];
    for (const facet of FACETS) {
      const seedFirst = repository.query(point, 1, {}, { facet })[0]!;
      alone[facet].push(seedFirst.fragment.id);
      missed[facet].push(seedFirst.distance > MISS);
      // (the first that ranks within the miss distance: a fragment pulled first by its uses but farther than that is no find)
      const chosen = learn.together ? uses.map((u) => u.id) : [];
      const first = repository.query(point, LIBRARY.length + layer.filed.length, {}, { facet, chosen, layer }).find((f) => f.distance <= MISS);
      if (first) {
        if ((filedAt.get(first.fragment.id) ?? section) < section) firstFoundAgain ??= section;
        uses.push({ id: first.fragment.id, facet, ...(learn.move ? { point } : {}) });
        continue;
      }
      const filed = fileFragment(repository, layer, { text: made(facet, seed, section), point, facet, source: 'composer', created: `run ${seed} section ${section}` });
      layer = filed.layer;
      if (filed.file) {
        filedNew++;
        filedAt.set(filed.id, section);
        firstFiled ??= section;
      } else filedHeld++;
      uses.push({ id: filed.id, facet }); // (filing was its use at this point)
    }
    for (const u of uses) kept[u.facet as Facet].push(u.id);
    layer = useFragments(repository, layer, uses);
    if (!learn.together) layer = { ...layer, together: [] };
  }
  return { kept, alone, missed, filedNew, filedHeld, firstFiled, firstFoundAgain, layer };
}

/** The share of sections whose fragment is among the 3 most used of the run. */
function topThree(ids: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 3);
  return top.reduce((a, b) => a + b, 0) / ids.length;
}

/**
 * The bound on lock-in (decision 048): what use moves may add to the share of sections whose fragment is among its run's
 * 3 most used, over the same walk with nothing learned, on each facet, over the 10,000 sections: 5 points.
 */
const LOCK_IN_BOUND = 0.05;
/** What use moves and use together add, recorded: the count's pull (decision 046) adds the most, and this holds it from growing. */
const LOCK_IN_RECORDED = 0.1;

const runs = (learn: Learning) => Object.values(PRESETS).map((start, seed) => run(start, seed, learn));
const MOVES = runs({ move: true, together: false });
const BOTH = runs({ move: true, together: true });

/** Over the runs, the share of all sections whose fragment is among its run's 3 most used: learned, and with nothing learned. */
const pooled = (rs: readonly Run[], facet: Facet, of: 'kept' | 'alone') => rs.reduce((sum, r) => sum + topThree(r[of][facet]) * SECTIONS, 0) / (rs.length * SECTIONS);
/** The share of sections, where the seed alone found something, whose fragment learning changed. */
const drift = (rs: readonly Run[], facet: Facet) => {
  const aimed = rs.flatMap((r) => r.alone[facet].flatMap((id, i) => (r.missed[facet][i] ? [] : [id === r.kept[facet][i]])));
  return aimed.filter((same) => !same).length / aimed.length;
};

describe('lock-in, over 10,000 sections at entropy 0.3', () => {
  if (process.env['LOCKIN_REPORT'])
    for (const [name, rs] of [
      ['use moves', MOVES],
      ['use moves and use together', BOTH],
    ] as const) {
      console.log(name);
      console.table(
        rs.map((r, i) => ({
          run: Object.keys(PRESETS)[i],
          ...Object.fromEntries(
            FACETS.flatMap((f) => [
              [`${f} top 3`, +topThree(r.kept[f]).toFixed(3)],
              [`${f} alone`, +topThree(r.alone[f]).toFixed(3)],
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
      );
      console.log(
        Object.fromEntries(
          FACETS.flatMap((f) => [
            [`${f} top 3`, pooled(rs, f, 'kept')],
            [`${f} alone`, pooled(rs, f, 'alone')],
            [`${f} drift`, drift(rs, f)],
          ]),
        ),
      );
    }

  it('walks 10,000 sections, the same walk for every way of learning', () => {
    expect(MOVES.reduce((n, r) => n + r.kept.meter.length, 0)).toBe(10_000);
    expect(MOVES.map((r) => r.alone)).toEqual(BOTH.map((r) => r.alone));
  });

  it.each(FACETS)('use moves add at most 5 points to the share among the 3 most used: %s', (facet) => {
    expect(pooled(MOVES, facet, 'kept') - pooled(MOVES, facet, 'alone')).toBeLessThanOrEqual(LOCK_IN_BOUND);
  });

  it.each(FACETS)('use moves and use together add at most 10 points, recorded: %s', (facet) => {
    expect(pooled(BOTH, facet, 'kept') - pooled(BOTH, facet, 'alone')).toBeLessThanOrEqual(LOCK_IN_RECORDED);
  });

  it('files fragments of its own where it misses, and finds them again the section after', () => {
    const filed = [...MOVES, ...BOTH].filter((r) => r.firstFiled !== null);
    expect(filed.length).toBeGreaterThan(0);
    for (const r of filed) expect(r.firstFoundAgain! - r.firstFiled!).toBeLessThanOrEqual(3);
  });

  it('keeps the layer small: a few points and pairs, under 4 KB as JSON after 1,250 sections', () => {
    for (const r of [...MOVES, ...BOTH]) expect(JSON.stringify(r.layer).length).toBeLessThan(4096);
  });
});
