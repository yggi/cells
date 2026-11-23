/**
 * The radio's drift, measured (#571 step 4, #576 rung 2, the half of yggi/jambot#617 that measures first): E30's columns
 * for Jambot's walk and for the radio as cells writes it. A measurement; it decides no language.
 *
 *   npm run radio -- [--hours 3] [--seeds 5] [--reach 3.5] [--json]
 *
 * Every run is tuned in at one of Jambot's eight prototype presets (Synth-pop, Techno, Deep house, Ambient, Lo-fi hip
 * hop, Funk, Bossa nova, Swing jazz) and left alone for `--hours` hours of 8-bar sections of 4/4 at 104 bpm, over
 * `--seeds` seeds a preset, the style read at each section's start on the four axes `styles` has. The models:
 *
 * - **the walk**, Jambot's (`radio.ts`, #313): every axis a step a section, uniform between minus and plus its step
 *   scaled by the entropy, folded back at the ends, nothing pulling it home; at entropy 0.3 and at 1;
 * - **the example's drift**, Radio's (`examples/radio.md`): each axis the preset's point moved inside a window by a sum
 *   of sample-and-holds clocked at 8, 64 and 256 bars, weighted .5 .3 .2 (decision 079); the window's reach per axis is
 *   `--reach` times the walk's step (3.5: .35 on bite, as the example has it);
 * - **the same at six rates**, 8 to 256 bars an octave apart, weighted alike (Voss and McCartney's construction, the
 *   frame of #571).
 *
 * The cells models are texts, read through `styleAt` as a frontend reads a score's style, so what is measured is what
 * a piece plays. The columns are E30's (yggi/jambot `docs/language-experiments.md`), each over every run:
 *
 * - how far each axis is from where it was tuned in after 10 minutes, an hour and 3 (root mean square);
 * - the nearest preset: the minutes until it first changes (the median of the runs that change), how often it changes
 *   an hour, the share of changes undone within a section, the share of time it is the preset tuned in at, how many
 *   presets are nearest some time;
 * - the sections an axis remembers itself for, 1 / (1 − ρ) of its correlation ρ a section later (A4);
 * - its bound: the largest step, and the share of values on an end.
 *
 * Unlike E30's, the nearest preset is read at each section's start, with no glide, on four axes (E30's also had energy,
 * and a tempo), so those columns say how the models compare, not what E30 said. The walk's steps are E30's, the draws
 * are cells' own (a seeded `mulberry32`, not Jambot's `draw`).
 *
 * Lifted from yggi/jambot packages/engine/src/radio.ts @ f792790 (the walk's steps and its fold) and
 * packages/engine/experiments/radio-walk.ts @ f792790 (the columns).
 */
import { pathToFileURL } from 'node:url';
import { styleAt } from '../src/engine/styleat';
import { nearestStyle, stylePoint, STYLES, type Style } from '../src/repository/styles';

/** The four axes of style space, in their order. */
export const AXES = ['sync', 'harm', 'bite', 'mood'] as const;
export type Axis = (typeof AXES)[number];
export type Point = Readonly<Record<Axis, number>>;

/** Jambot's eight prototype presets, by their ids in `styles`. */
export const PRESET_IDS = ['synthPop', 'techno', 'deepHouse', 'ambient', 'lofi', 'funk', 'bossaNova', 'swingJazz'] as const;
const PROTOTYPES: readonly Style[] = PRESET_IDS.map((id) => STYLES.find((s) => s.id === id)!);

/** The most an axis moves a section at an entropy of 1 (Jambot's `RADIO.step`; its articulation is cells' bite). */
export const STEP: Readonly<Record<Axis, number>> = { sync: 0.08, harm: 0.1, bite: 0.1, mood: 0.06 };

/** A section is 8 bars of 4/4 at this tempo: 18.46 s, as E30's averaged 19.5. */
export const BPM = 104;
export const SECTION_BARS = 8;
export const SECTION_SECONDS = (SECTION_BARS * 4 * 60) / BPM;

/** `x` folded into [low, high]: past an end, it comes back off it by as much, as often as it takes. */
export function reflected(x: number, low: number, high: number): number {
  const width = high - low;
  const around = (((x - low) % (2 * width)) + 2 * width) % (2 * width);
  return low + (around > width ? 2 * width - around : around);
}

/** A seeded stream of numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jambot's walk from a point: a section on, every axis a step in its own space, scaled by the entropy, folded back. */
export function walk(start: Point, sections: number, seed: number, entropy: number): Point[] {
  const next = mulberry32(seed);
  const out: Point[] = [start];
  for (let k = 1; k < sections; k++) {
    const before = out[k - 1]!;
    out.push(Object.fromEntries(AXES.map((a) => [a, reflected(before[a] + STEP[a] * entropy * (2 * next() - 1), 0, 1)])) as Point);
  }
  return out;
}

/** A drift: the bars each walker holds a value for, and the weight of each in the sum (decision 079). */
export interface Drift {
  readonly name: string;
  readonly bars: readonly number[];
  readonly weights: readonly number[];
}

/** Radio's, as `examples/radio.md` writes it. */
export const EXAMPLE_DRIFT: Drift = { name: 'the example (8, 64, 256 bars: .5 .3 .2)', bars: [8, 64, 256], weights: [0.5, 0.3, 0.2] };
/** Six octave-spaced rates, weighted alike. */
export const OCTAVES_DRIFT: Drift = { name: 'six octaves (8 to 256 bars, alike)', bars: [8, 16, 32, 64, 128, 256], weights: Array<number>(6).fill(1 / 6) };

/**
 * The radio as cells writes it: a style whose every axis is the preset's value moved inside a window by a sum of
 * sample-and-holds, each walker its own draws (`seed=`), `&style` the section's. `reach` is the window's half-width.
 */
export function radioText(start: Point, drift: Drift, reach: Point, seed: number): string {
  const lines = ['&bar meter("4/4") step=104bpm'];
  const axes: string[] = [];
  AXES.forEach((axis, i) => {
    drift.bars.forEach((bars, k) => lines.push(`&w${axis}${k} step=1m/${bars} seed=${seed * 1000 + i * 10 + k + 1} [0|.25|.5|.75|1]`));
    lines.push(`&d${axis} [${drift.bars.map((_, k) => `&w${axis}${k} * ${drift.weights[k]}`).join(' + ')}]`);
    axes.push(`${axis}=${start[axis]} ± ${reach[axis]} * &d${axis}`);
  });
  lines.push(`&mine map=style ${axes.join(' ')}`, '&style style=&mine');
  return lines.join('\n');
}

/** A cells radio's style at each section's start (its first half second: a value held clear of the step's edge). */
export function trajectory(text: string, sections: number): Point[] {
  const out: Point[] = [];
  for (let k = 0; k < sections; k++) {
    const at = styleAt(text, k * SECTION_SECONDS + 0.5);
    if (!at) throw new Error('radio: the text does not compile');
    out.push(Object.fromEntries(AXES.map((a, i) => [a, at[i]!])) as Point);
  }
  return out;
}

/** A value for each axis. */
const perAxis = <T>(f: (a: Axis) => T): Record<Axis, T> => ({ sync: f('sync'), harm: f('harm'), bite: f('bite'), mood: f('mood') });

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rms = (xs: readonly number[]) => Math.sqrt(mean(xs.map((x) => x * x)));
const median = (xs: readonly number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** The preset nearest a point, of the eight. */
export const nearest = (p: Point): string => nearestStyle(p, { k: 1, styles: PROTOTYPES })[0]!.style.id;

/** The minutes after which the distance from where it was tuned in is read. */
export const WALKED_AT = [10, 60, 180] as const;

/** E30's columns over a set of runs. */
export interface Columns {
  readonly runs: number;
  readonly sections: number;
  /** Per axis, the root mean square distance from where it was tuned in after each of `WALKED_AT` minutes (null past the run). */
  readonly walked: Readonly<Record<Axis, readonly (number | null)[]>>;
  /** The minutes until the nearest preset first changes: the median of the runs that change, and how many do. */
  readonly firstChange: { readonly minutes: number | null; readonly runs: number };
  /** Changes of the nearest preset an hour (the mean), the share undone within a section, the share of time at the preset tuned in at, presets nearest some time (the mean). */
  readonly changesAnHour: number;
  readonly undone: number;
  readonly atTunedIn: number;
  readonly visited: number;
  /** Per axis, the sections it remembers itself for: 1 / (1 − ρ), ρ its correlation a section later; null where the axis holds still. */
  readonly remembers: Readonly<Record<Axis, number | null>>;
  /** Per axis, the largest step, and the share of values on an end of the axis. */
  readonly largestStep: Readonly<Record<Axis, number>>;
  readonly onAnEnd: number;
}

/** E30's columns for a set of runs, each a style per section. */
export function columns(runs: readonly (readonly Point[])[]): Columns {
  const sections = Math.min(...runs.map((r) => r.length));
  const perSection = SECTION_SECONDS / 60;
  const at = (minutes: number) => Math.round(minutes / perSection);
  const walked = perAxis((a) => WALKED_AT.map((m) => (at(m) < sections ? rms(runs.map((r) => r[at(m)]![a] - r[0]![a])) : null)));
  const hours = (sections * perSection) / 60;
  const firsts: number[] = [];
  let changes = 0;
  let undone = 0;
  let atTunedIn = 0;
  let visited = 0;
  for (const r of runs) {
    const near = r.slice(0, sections).map(nearest);
    const first = near.findIndex((n) => n !== near[0]);
    if (first > 0) firsts.push(first * perSection);
    const ids = new Set(near);
    visited += ids.size;
    atTunedIn += near.filter((n) => n === near[0]).length / near.length;
    for (let k = 1; k < near.length; k++) {
      if (near[k] === near[k - 1]) continue;
      changes++;
      if (near[k + 1] === near[k - 1]) undone++;
    }
  }
  const remembers = perAxis((a) => {
    const all = runs.flatMap((r) => r.slice(0, sections).map((s) => s[a]));
    const m = mean(all);
    let alone = 0;
    let together = 0;
    for (const r of runs)
      for (let i = 0; i < sections; i++) {
        const x = r[i]![a] - m;
        alone += x * x;
        if (i > 0) together += x * (r[i - 1]![a] - m);
      }
    return alone === 0 ? null : 1 / (1 - together / alone);
  });
  const largestStep = Object.fromEntries(
    AXES.map((a) => [a, Math.max(...runs.flatMap((r) => r.slice(1, sections).map((s, i) => Math.abs(s[a] - r[i]![a]))))]),
  ) as Columns['largestStep'];
  const values = runs.flatMap((r) => r.slice(1, sections).flatMap((s) => AXES.map((a) => s[a])));
  return {
    runs: runs.length,
    sections,
    walked,
    firstChange: { minutes: firsts.length ? median(firsts) : null, runs: firsts.length },
    changesAnHour: changes / runs.length / hours,
    undone: changes === 0 ? 0 : undone / changes,
    atTunedIn: atTunedIn / runs.length,
    visited: visited / runs.length,
    remembers,
    largestStep,
    onAnEnd: values.filter((v) => v < 1e-9 || v > 1 - 1e-9).length / values.length,
  };
}

/** A model: its name and the run it makes from a preset and a seed. */
export interface Model {
  readonly name: string;
  readonly run: (start: Point, seed: number, sections: number) => Point[];
}

/** The models compared, at a reach of `reach` steps of the walk. */
export function models(reach: number): Model[] {
  const window: Point = Object.fromEntries(AXES.map((a) => [a, Math.round(STEP[a] * reach * 1e6) / 1e6])) as Point;
  const text =
    (drift: Drift): Model['run'] =>
    (start, seed, sections) =>
      trajectory(radioText(start, drift, window, seed), sections);
  return [
    { name: 'the walk, entropy 0.3', run: (s, seed, n) => walk(s, n, seed, 0.3) },
    { name: 'the walk, entropy 1', run: (s, seed, n) => walk(s, n, seed, 1) },
    { name: EXAMPLE_DRIFT.name, run: text(EXAMPLE_DRIFT) },
    { name: OCTAVES_DRIFT.name, run: text(OCTAVES_DRIFT) },
  ];
}

/** Every run of a model: each preset's point, over `seeds` seeds. */
export function measure(model: Model, hours: number, seeds: number): Columns {
  // (one section more than the hours hold, so the last minute asked for is read)
  const sections = Math.floor((hours * 3600) / SECTION_SECONDS) + 1;
  const runs: Point[][] = [];
  for (const id of PRESET_IDS) {
    const p = stylePoint(id);
    const start = Object.fromEntries(AXES.map((a) => [a, p[a]!])) as Point;
    for (let seed = 1; seed <= seeds; seed++) runs.push(model.run(start, seed, sections));
  }
  return columns(runs);
}

const fixed = (x: number | null, digits = 2) => (x === null ? '–' : x.toFixed(digits));
const span = (xs: readonly (number | null)[]) => {
  const ys = xs.filter((x): x is number => x !== null);
  return ys.length ? `${fixed(Math.min(...ys))}–${fixed(Math.max(...ys))}` : '–';
};

/** A row of the table: a model's columns as the note prints them. */
export function row(name: string, c: Columns): string[] {
  return [
    name,
    ...WALKED_AT.map((_, i) => span(AXES.map((a) => c.walked[a][i] ?? null))),
    c.firstChange.minutes === null ? `none (0 of ${c.runs})` : `${fixed(c.firstChange.minutes, 0)} (${c.firstChange.runs} of ${c.runs})`,
    fixed(c.changesAnHour, 1),
    `${fixed(100 * c.undone, 0)} %`,
    `${fixed(100 * c.atTunedIn, 0)} %`,
    fixed(c.visited, 1),
    span(AXES.map((a) => c.remembers[a])).replace(/(\d+\.\d+)/g, (x) => Number(x).toFixed(1)),
    `${fixed(Math.max(...AXES.map((a) => c.largestStep[a])), 3)}; ${fixed(100 * c.onAnEnd, 1)} %`,
  ];
}

export const HEADER = [
  'model',
  'rms 10 min',
  'rms 1 h',
  'rms 3 h',
  'first change (min)',
  'changes/h',
  'undone',
  'at tuned in',
  'presets',
  'remembers (sections)',
  'largest step; on an end',
];

/** The table, as markdown. */
export function table(rows: readonly (readonly string[])[]): string {
  return [HEADER, HEADER.map(() => '---'), ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n');
}

const valueOf = (args: readonly string[], flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const hours = Number(valueOf(args, '--hours') ?? 3);
  const seeds = Number(valueOf(args, '--seeds') ?? 5);
  const reach = Number(valueOf(args, '--reach') ?? 3.5);
  const results = models(reach).map((m) => ({ name: m.name, columns: measure(m, hours, seeds) }));
  if (args.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else console.log(table(results.map((r) => row(r.name, r.columns))));
}
