/**
 * Lock-in, measured (decision 048, point 6; #145, #151, #162): does learning by use lock the composer onto a few
 * fragments? A seeded walk of the style point at entropy 0.3, as Jambot's radio walks (E30, E34): runs of 1,250
 * sections, in draws of 8, one run from each preset's point. Each section the composer asks for a meter, then for a
 * rhythm with the meter chosen, keeps the first of each within 0.3 (Jambot's `MISS_DISTANCE`), files one of its own on a
 * miss, and uses what it kept at the section's point. The same walk with nothing learned is the baseline. The measure is
 * what learning adds to the share of sections whose fragment is among its run's 3 most used. Pure and seeded: run `i` of
 * draw `d` starts at the `i`th preset and walks on the seed `8d + i`, so a draw is the same on every machine. Its tests:
 * `lockin.test.ts` (a witness over draws 0–3) and `lockin.slow.test.ts` (the bound, over draws 0–31).
 */
import { renameCell } from '../engine/edit';
import { chanceOf } from '../engine/realize';
import { createRepository, EMPTY_LAYER, type LearnedLayer, type StylePoint } from './fragments';
import { fileFragment, useFragments, type Use } from './learned';
import { LIBRARY } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The presets a draw's runs start from, in order: run `i` of a draw starts at the `i`th. */
export const LOCK_IN_PRESETS: Readonly<Record<string, StylePoint>> = { SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ };
const STARTS = Object.values(LOCK_IN_PRESETS);
/** Runs in a draw: one from each preset. */
export const DRAW = STARTS.length;
/** Sections in a run. */
export const SECTIONS = 1_250;
const ENTROPY = 0.3;
const MISS = 0.3;
export const FACETS = ['meter', 'rhythm'] as const;
export type Facet = (typeof FACETS)[number];

/**
 * The bound (decision 048, point 6; amended by #162): what learning may add to the share of sections whose fragment is
 * among its run's 3 most used, over draws 0–31 (256 runs, 320,000 sections), on each facet and for each way of learning,
 * with room for the measure's own noise: the pooled value plus twice its standard error (the spread of its 32 draws of 8
 * over √32) is at most 5 points.
 */
export const LOCK_IN_BOUND = 0.05;

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
    renameCell(renameCell(renameCell(son, 'clave', 'cl'), 'percussion', 'perc'), 'claves', 'wood'),
    son.replace(' &claves', '  &claves'),
  ],
};
const made = (facet: Facet, seed: number, section: number) => MADE[facet][Math.floor(chanceOf(`made|${seed}|${section}|${facet}`) * MADE[facet].length)]!;

/** How the composer learns in a run: whether its uses move associations, whether it counts and weighs use together. */
export interface Learning {
  readonly move: boolean;
  readonly together: boolean;
}

/** One run with nothing learned: the seed's first of each facet at each section, and whether it was a miss. */
export interface Baseline {
  readonly start: string;
  readonly seed: number;
  readonly alone: Record<Facet, string[]>;
  readonly missed: Record<Facet, boolean[]>;
}

/** One run as it learned. */
export interface LearnedRun {
  /** The fragment of each facet kept at each section. */
  readonly kept: Record<Facet, string[]>;
  /** Fragments filed new, and filings whose text was held already (identity). */
  readonly filedNew: number;
  readonly filedHeld: number;
  /** The section a new fragment was first filed (its first use), and the first a filed fragment was found again by a query. */
  readonly firstFiled: number | null;
  readonly firstFoundAgain: number | null;
  readonly layer: LearnedLayer;
}

const repository = createRepository(LIBRARY);

function baseline(start: StylePoint, seed: number): Baseline {
  const alone: Record<Facet, string[]> = { meter: [], rhythm: [] };
  const missed: Record<Facet, boolean[]> = { meter: [], rhythm: [] };
  for (const point of walk(start, seed))
    for (const facet of FACETS) {
      const first = repository.query(point, 1, {}, { facet })[0]!;
      alone[facet].push(first.fragment.id);
      missed[facet].push(first.distance > MISS);
    }
  return { start: Object.keys(LOCK_IN_PRESETS)[STARTS.indexOf(start)]!, seed, alone, missed };
}

function learned(start: StylePoint, seed: number, learn: Learning): LearnedRun {
  let layer = EMPTY_LAYER;
  const kept: Record<Facet, string[]> = { meter: [], rhythm: [] };
  const filedAt = new Map<string, number>();
  let [filedNew, filedHeld] = [0, 0];
  let [firstFiled, firstFoundAgain] = [null as number | null, null as number | null];
  for (const [section, point] of walk(start, seed).entries()) {
    const uses: Use[] = [];
    for (const facet of FACETS) {
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
  return { kept, filedNew, filedHeld, firstFiled, firstFoundAgain, layer };
}

/** Draws `from` to `to` (each of 8 runs): each run's baseline, and the same run under each way of learning given, in order. */
export interface Draws {
  readonly baselines: readonly Baseline[][];
  readonly learned: readonly (readonly LearnedRun[][])[];
}

export function lockInDraws(from: number, to: number, learnings: readonly Learning[]): Draws {
  const baselines: Baseline[][] = [];
  const learnedRuns: LearnedRun[][][] = learnings.map(() => []);
  for (let draw = from; draw <= to; draw++) {
    const seeds = STARTS.map((start, i) => [start, DRAW * draw + i] as const);
    baselines.push(seeds.map(([start, seed]) => baseline(start, seed)));
    learnings.forEach((learn, k) => learnedRuns[k]!.push(seeds.map(([start, seed]) => learned(start, seed, learn))));
  }
  return { baselines, learned: learnedRuns };
}

/** The share of sections whose fragment is among the 3 most used of the run. */
export function topThree(ids: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 3);
  return top.reduce((a, b) => a + b, 0) / ids.length;
}

/** What learning added, on a facet, to the share among each run's 3 most used, over runs of equal length: pooled over them. */
const added = (base: readonly Baseline[], runs: readonly LearnedRun[], facet: Facet) =>
  runs.reduce((sum, r, i) => sum + topThree(r.kept[facet]) - topThree(base[i]!.alone[facet]), 0) / runs.length;

/** The lock-in of one way of learning over draws, on a facet: per draw of 8, pooled over all of them, and the pooled value's standard error from the draws' spread. */
export interface LockIn {
  readonly perDraw: readonly number[];
  readonly pooled: number;
  readonly standardError: number;
}

export function lockIn(base: readonly Baseline[][], runs: readonly LearnedRun[][], facet: Facet): LockIn {
  const perDraw = runs.map((draw, d) => added(base[d]!, draw, facet));
  const pooled = perDraw.reduce((a, b) => a + b, 0) / perDraw.length;
  const variance = perDraw.reduce((a, b) => a + (b - pooled) ** 2, 0) / Math.max(1, perDraw.length - 1);
  return { perDraw, pooled, standardError: Math.sqrt(variance / perDraw.length) };
}

/** The share of sections, where the seed alone found something, whose fragment learning changed. */
export function drift(base: readonly Baseline[], runs: readonly LearnedRun[], facet: Facet): number {
  const aimed = runs.flatMap((r, i) => base[i]!.alone[facet].flatMap((id, s) => (base[i]!.missed[facet][s] ? [] : [id === r.kept[facet][s]])));
  return aimed.filter((same) => !same).length / aimed.length;
}
