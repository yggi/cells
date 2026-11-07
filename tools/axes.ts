/**
 * The axes of style space measured, for #539 (the axes revisited): how the four axes correlate over the presets and the
 * library, how much of the presets' spread each principal direction carries, and what each option on the table does to
 * the presets' distances and to which style each library point is nearest. A measurement; it decides no language.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/axes.ts
 *
 * prints the tables `docs/notes/539-axes.md` quotes. The options:
 *
 * - `four`: the axes as they are, `sync harm artic energy`.
 * - `drive`: articulation and energy as one axis, their mean, `sync harm drive`.
 * - `four+bright`: the four and a fifth, brightness, `sync harm artic energy bright`.
 * - `drive+bright`: the slot `drive` frees taken by brightness, `sync harm drive bright`.
 *
 * Brightness is written by rule where a point has a mode: a seven-note scale's degrees in semitones above the tonic,
 * summed, less locrian's sum (the darkest), over the six semitones lydian adds (the brightest), so the church modes are
 * locrian 0, phrygian 1/6, aeolian 2/6, dorian 3/6, mixolydian 4/6, ionian 5/6 and lydian 1, and harmonic minor is 3/6.
 * A preset's mode is the mode fragment the repository finds nearest its point; a library point has one only where its
 * fragment is a mode (the facet `mode`), so the options with brightness are measured over those points alone, and every
 * other point would need its value written by hand (#539's cost).
 */
import { pathToFileURL } from 'node:url';
import { createRepository, pointDistance, type Fragment, type StylePoint } from '../src/repository/fragments';
import { LIBRARY } from '../src/repository/library';
import { STYLES, type Style } from '../src/repository/styles';

/** The four axes, in their order. */
export const FOUR = ['sync', 'harm', 'artic', 'energy'] as const;

/** A seven-note scale's degrees in semitones above its tonic, by the name a mode fragment's id gives it. */
const SCALES: Readonly<Record<string, readonly number[]>> = {
  lydian: [0, 2, 4, 6, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

/** A scale's brightness: its degrees' sum above locrian's, over lydian's six; 0 the darkest, 1 the brightest. */
export function brightness(scale: readonly number[]): number {
  const sum = (s: readonly number[]) => s.reduce((a, b) => a + b, 0);
  return (sum(scale) - sum(SCALES.locrian!)) / (sum(SCALES.lydian!) - sum(SCALES.locrian!));
}

/** The scale a mode fragment plays, by its id: `diatonic(mode=dorian)`, `harmonic_minor`, `bell_and_scale` (ionian). */
export function scaleOf(id: string): readonly number[] | null {
  const mode = /^diatonic\(mode=(\w+)\)$/.exec(id)?.[1] ?? (id === 'harmonic_minor' ? 'harmonic' : id === 'bell_and_scale' ? 'ionian' : null);
  return (mode && SCALES[mode]) ?? null;
}

/** An option: its name, and a point on the four axes (with brightness, where it has one) as a point on its own axes. */
export interface AxesOption {
  readonly name: string;
  readonly axes: readonly string[];
  readonly map: (p: StylePoint) => StylePoint;
}

const drive = (p: StylePoint) => (p.artic! + p.energy!) / 2;
export const OPTIONS: readonly AxesOption[] = [
  { name: 'four', axes: [...FOUR], map: (p) => ({ sync: p.sync!, harm: p.harm!, artic: p.artic!, energy: p.energy! }) },
  { name: 'drive', axes: ['sync', 'harm', 'drive'], map: (p) => ({ sync: p.sync!, harm: p.harm!, drive: drive(p) }) },
  {
    name: 'four+bright',
    axes: [...FOUR, 'bright'],
    map: (p) => ({ sync: p.sync!, harm: p.harm!, artic: p.artic!, energy: p.energy!, bright: p.bright! }),
  },
  { name: 'drive+bright', axes: ['sync', 'harm', 'drive', 'bright'], map: (p) => ({ sync: p.sync!, harm: p.harm!, drive: drive(p), bright: p.bright! }) },
];

/** Pearson's correlation of two series. */
export function correlation(x: readonly number[], y: readonly number[]): number {
  const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i]! - mx) * (y[i]! - my);
    sxx += (x[i]! - mx) ** 2;
    syy += (y[i]! - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** A symmetric matrix's eigenvalues, largest first (Jacobi's rotations; the matrices here are 4 × 4). */
export function eigenvalues(matrix: readonly (readonly number[])[]): number[] {
  const a = matrix.map((r) => [...r]);
  const n = a.length;
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i]![j]! ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p]![q]!) < 1e-30) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
      }
  }
  return a.map((r, i) => r[i]!).sort((x, y) => y - x);
}

/** The covariance matrix of points over axes. */
function covariance(points: readonly StylePoint[], axes: readonly string[]): number[][] {
  const means = axes.map((a) => points.reduce((s, p) => s + p[a]!, 0) / points.length);
  return axes.map((a, i) => axes.map((b, j) => points.reduce((s, p) => s + (p[a]! - means[i]!) * (p[b]! - means[j]!), 0) / (points.length - 1)));
}

/** A preset with its brightness: that of the mode the repository finds nearest its point. */
export interface Placed extends Style {
  readonly mode: string;
  readonly bright: number;
}

/** The presets, each with the mode found at its point and that mode's brightness. */
export function placedStyles(library: readonly Fragment[] = LIBRARY, styles: readonly Style[] = STYLES): Placed[] {
  const repo = createRepository(library);
  return styles.map((s) => {
    const mode = repo.query(s.point, 1, {}, { facet: 'mode' })[0]!.fragment.id;
    return { ...s, mode, bright: brightness(scaleOf(mode)!), point: { ...s.point, bright: brightness(scaleOf(mode)!) } };
  });
}

/** A library point: its fragment, its facet, its point (with brightness where its fragment is a mode). */
export interface LibraryPoint {
  readonly id: string;
  readonly facet: string;
  readonly point: StylePoint;
}

/** The library's association points but the styles' own; `centre` keeps the stand-ins at `.5 .5 .5 .5` (#540). */
export function libraryPoints(library: readonly Fragment[] = LIBRARY, centre = false): LibraryPoint[] {
  return library.flatMap((f) =>
    f.association
      .filter((wp) => wp.facet !== 'style')
      .filter((wp) => centre || !FOUR.every((a) => wp.point[a] === 0.5))
      .map((wp) => {
        const scale = wp.facet === 'mode' ? scaleOf(f.id) : null;
        return { id: f.id, facet: wp.facet ?? '', point: scale ? { ...wp.point, bright: brightness(scale) } : wp.point };
      }),
  );
}

/** What one option does: the presets' gaps, their distances against the four axes', and the library's nearest styles. */
export interface OptionMeasure {
  readonly name: string;
  /** The nearest two presets and how far apart. */
  readonly smallest: { readonly pair: readonly [string, string]; readonly distance: number };
  /** The median, over the presets, of each one's distance to its nearest neighbour. */
  readonly medianNearest: number;
  /** The 55 pairs' distances correlated with the four axes'. */
  readonly keeps: number;
  /** The library points measured (those the option's axes all exist on), and the share whose nearest preset differs from the four axes'. */
  readonly points: number;
  readonly moved: number;
  /** The pairs whose distance changes most, against the four axes'. */
  readonly pairs: readonly { readonly pair: readonly [string, string]; readonly four: number; readonly here: number }[];
}

/** Measure each option over the presets and the library. */
export function measure(placed: readonly Placed[] = placedStyles(), points: readonly LibraryPoint[] = libraryPoints()): OptionMeasure[] {
  const four = OPTIONS[0]!;
  const pairs: [Placed, Placed][] = placed.flatMap((a, i) => placed.slice(i + 1).map((b) => [a, b] as [Placed, Placed]));
  const dist = (o: AxesOption, a: StylePoint, b: StylePoint) => pointDistance(o.map(a), o.map(b));
  const nearest = (o: AxesOption, p: StylePoint) => placed.map((s, i) => ({ id: s.id, d: dist(o, p, s.point), i })).sort((x, y) => x.d - y.d || x.i - y.i)[0]!.id;
  const fourDistances = pairs.map(([a, b]) => dist(four, a.point, b.point));
  return OPTIONS.map((o) => {
    const distances = pairs.map(([a, b]) => dist(o, a.point, b.point));
    const k = distances.indexOf(Math.min(...distances));
    const nearestGaps = placed.map((s) => Math.min(...placed.filter((t) => t !== s).map((t) => dist(o, s.point, t.point)))).sort((x, y) => x - y);
    const measured = points.filter((p) => o.axes.every((a) => a in p.point || a === 'drive'));
    const moved = measured.filter((p) => nearest(o, p.point) !== nearest(four, p.point)).length;
    const changes = pairs
      .map(([a, b], i) => ({ pair: [a.id, b.id] as const, four: fourDistances[i]!, here: distances[i]! }))
      .sort((x, y) => Math.abs(y.here - y.four) - Math.abs(x.here - x.four))
      .slice(0, 3);
    return {
      name: o.name,
      smallest: { pair: [pairs[k]![0].id, pairs[k]![1].id], distance: distances[k]! },
      medianNearest: nearestGaps[Math.floor(nearestGaps.length / 2)]!,
      keeps: correlation(distances, fourDistances),
      points: measured.length,
      moved: measured.length ? moved / measured.length : 0,
      pairs: changes,
    };
  });
}

const fixed = (x: number, d = 2) => x.toFixed(d);

/** The pairs #539 and #542 name: the nearest two, the two only a mode tells apart, and two the library's islands crowd. */
const NAMED_PAIRS: readonly (readonly [string, string])[] = [
  ['synthPop', 'deepHouse'],
  ['spooky', 'swingJazz'],
  ['lofi', 'bossaNova'],
  ['lofi', 'electroSwing'],
  ['ambient', 'kinderlied'],
];

/** The tables `docs/notes/539-axes.md` quotes, as Markdown. */
export function report(placed: readonly Placed[] = placedStyles(), points: readonly LibraryPoint[] = libraryPoints()): string {
  const out: string[] = [];
  const corr = (ps: readonly StylePoint[]) =>
    FOUR.map(
      (a) =>
        `| ${a} | ${FOUR.map((b) =>
          fixed(
            correlation(
              ps.map((p) => p[a]!),
              ps.map((p) => p[b]!),
            ),
          ),
        ).join(' | ')} |`,
    );
  out.push(`### The axes' correlations over the ${placed.length} presets`, '', `| | ${FOUR.join(' | ')} |`, '|---|---|---|---|---|', ...corr(placed.map((p) => p.point)), '');
  out.push(
    `### Over the library's ${points.length} association points (the centre stand-ins and the styles' own left out)`,
    '',
    `| | ${FOUR.join(' | ')} |`,
    '|---|---|---|---|---|',
    ...corr(points.map((p) => p.point)),
    '',
  );
  const eig = eigenvalues(
    covariance(
      placed.map((p) => p.point),
      FOUR,
    ),
  );
  const total = eig.reduce((a, b) => a + b, 0);
  let running = 0;
  out.push(
    "### The presets' spread by principal direction",
    '',
    '| direction | share | running |',
    '|---|---|---|',
    ...eig.map((e, i) => `| ${i + 1} | ${fixed((100 * e) / total, 1)} % | ${fixed((100 * (running += e)) / total, 1)} % |`),
    '',
  );
  out.push(
    '### The presets, with drive and the brightness of the mode found at each',
    '',
    '| style | sync | harm | artic | energy | drive | mode found | bright |',
    '|---|---|---|---|---|---|---|---|',
    ...placed.map(
      (s) => `| ${s.name} | ${s.point.sync} | ${s.point.harm} | ${s.point.artic} | ${s.point.energy} | ${fixed(drive(s.point), 3)} | ${s.mode} | ${fixed(s.bright, 3)} |`,
    ),
    '',
  );
  const name = (id: string) => placed.find((s) => s.id === id)!.name;
  const m = measure(placed, points);
  out.push(
    '### The options',
    '',
    '| option | axes | nearest two presets | their distance | median nearest gap | distances kept (r with four) | library points measured | nearest preset moves |',
    '|---|---|---|---|---|---|---|---|',
    ...m.map(
      (o, i) =>
        `| ${o.name} | ${OPTIONS[i]!.axes.join(' ')} | ${name(o.smallest.pair[0])}, ${name(o.smallest.pair[1])} | ${fixed(o.smallest.distance, 3)} | ${fixed(o.medianNearest, 3)} | ${fixed(o.keeps, 3)} | ${o.points} | ${fixed(100 * o.moved, 1)} % |`,
    ),
    '',
    '### Named pairs under each option',
    '',
    `| pair | ${m.map((o) => o.name).join(' | ')} |`,
    `|---|${m.map(() => '---').join('|')}|`,
    ...NAMED_PAIRS.map(([a, b]) => {
      const pa = placed.find((s) => s.id === a)!.point;
      const pb = placed.find((s) => s.id === b)!.point;
      return `| ${name(a)}, ${name(b)} | ${OPTIONS.map((o) => fixed(pointDistance(o.map(pa), o.map(pb)), 3)).join(' | ')} |`;
    }),
    '',
    '### The pairs each option moves most, against the four axes',
    '',
    '| option | pair | four | this option |',
    '|---|---|---|---|',
    ...m.slice(1).flatMap((o) => o.pairs.map((p) => `| ${o.name} | ${name(p.pair[0])}, ${name(p.pair[1])} | ${fixed(p.four, 3)} | ${fixed(p.here, 3)} |`)),
  );
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(report());
