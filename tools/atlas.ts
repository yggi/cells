/**
 * An atlas of genres in style space, for #572 (the axes reworked) and #542 (more styles): how well a set of axes tells
 * musical genres apart. A measurement; it decides no language.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/atlas.ts
 *
 * prints the tables `docs/notes/572-axes-atlas.md` quotes.
 *
 * Each genre is placed by hand, once, on the musical features underneath any set of axes, not on the axes themselves:
 *
 * - `sync`: where the accents fall, on the beat (0) to off it (1);
 * - `harm`: how the harmony moves, a static vamp (0) to moving, rich (1);
 * - `attack`: how notes start and end, sustained, legato (0) to short, struck (1);
 * - `density`: how many onsets and layers, sparse (0) to dense (1);
 * - `mode`: the scale it is mostly in, by name (`BRIGHTNESS`);
 * - `tension`: how much its harmony and timbre unsettle, consonant and at ease (0) to dissonant, menacing (1).
 *
 * The placements are one person's reading, written down so every option is measured over the same ones: the atlas
 * tests what a set of axes does with a placement, not whether the placement is right. A family groups genres that a
 * listener would put together; a family need not be compact (electronic spans techno and ambient).
 *
 * The options (each axis 0 to 1):
 *
 * - `v0.21`: `sync harm artic energy`, the axes before decision 076 (`artic` the attack, `energy` the density);
 * - `drive`: `sync harm drive bright`, #624 as first opened (drive the mean of attack and density, bright the mode's);
 * - `bite+mode`: `sync harm bite mood`, bite the attack alone, mood the mode's brightness alone;
 * - `bite+mood`: `sync harm bite mood`, bite the attack alone, mood the mode's brightness tempered by tension,
 *   `0.6 · bright + 0.4 · (1 − tension)`: what a mode says, moved by what the harmony and the sound do with it.
 */
import { pathToFileURL } from 'node:url';
import { BRIGHTNESS } from '../src/engine/style';

/** A genre as placed by hand: its family, and its features (each 0 to 1, but its mode by name). */
export interface Genre {
  readonly name: string;
  readonly family: string;
  readonly sync: number;
  readonly harm: number;
  readonly attack: number;
  readonly density: number;
  readonly mode: keyof typeof BRIGHTNESS;
  readonly tension: number;
}

const g = (name: string, family: string, [sync, harm, attack, density]: readonly number[], mode: keyof typeof BRIGHTNESS, tension: number): Genre => ({
  name,
  family,
  sync: sync!,
  harm: harm!,
  attack: attack!,
  density: density!,
  mode,
  tension,
});

/** The atlas: the eleven styles of cells' library as they are placed (their old `artic` the attack, `energy` the density), and 31 more. */
export const ATLAS: readonly Genre[] = [
  // (the library's eleven, as placed, their mode the one the library finds at each point)
  g('Synth-pop', 'electronic', [0.3, 0.45, 0.55, 0.55], 'aeolian', 0.15),
  g('Techno', 'electronic', [0.12, 0, 1, 0.8], 'aeolian', 0.35),
  g('Deep house', 'electronic', [0.35, 0.55, 0.65, 0.65], 'dorian', 0.1),
  g('Ambient', 'electronic', [0.05, 0.3, 0, 0.2], 'ionian', 0.05),
  g('Lo-fi hip hop', 'hip hop', [0.5, 0.75, 0.35, 0.5], 'aeolian', 0.1),
  g('Funk', 'funk and soul', [1, 0.12, 0.85, 0.75], 'dorian', 0.1),
  g('Bossa nova', 'latin', [0.75, 0.85, 0.45, 0.45], 'ionian', 0.05),
  g('Swing jazz', 'jazz', [0.35, 1, 0.3, 0.6], 'ionian', 0.2),
  g('Electro swing', 'jazz', [0.55, 0.75, 0.6, 0.75], 'harmonic_minor', 0.3),
  g('Spooky', 'dark', [0.2, 0.9, 0.3, 0.35], 'harmonic_minor', 0.75),
  g('Kinderlied', 'folk', [0.1, 0.12, 0.5, 0.35], 'ionian', 0),
  // (more electronic)
  g('Trance', 'electronic', [0.2, 0.4, 0.4, 0.8], 'aeolian', 0.15),
  g('Drum and bass', 'electronic', [0.85, 0.3, 0.8, 0.95], 'aeolian', 0.4),
  g('Dubstep', 'electronic', [0.7, 0.1, 0.9, 0.7], 'phrygian', 0.7),
  g('Disco', 'funk and soul', [0.4, 0.4, 0.6, 0.85], 'dorian', 0),
  // (hip hop)
  g('Boom-bap', 'hip hop', [0.6, 0.3, 0.7, 0.5], 'aeolian', 0.2),
  g('Trap', 'hip hop', [0.65, 0.15, 0.85, 0.6], 'phrygian', 0.55),
  // (jazz)
  g('Bebop', 'jazz', [0.6, 1, 0.7, 0.9], 'ionian', 0.4),
  g('Jazz ballad', 'jazz', [0.3, 0.9, 0.15, 0.2], 'ionian', 0.1),
  // (funk and soul)
  g('Soul ballad', 'funk and soul', [0.4, 0.6, 0.25, 0.35], 'ionian', 0.15),
  g('Gospel', 'funk and soul', [0.4, 0.7, 0.4, 0.7], 'ionian', 0),
  // (latin, african, caribbean)
  g('Salsa', 'latin', [0.9, 0.4, 0.8, 0.85], 'ionian', 0.1),
  g('Samba', 'latin', [0.85, 0.5, 0.75, 0.9], 'ionian', 0),
  g('Tango', 'latin', [0.6, 0.6, 0.85, 0.6], 'harmonic_minor', 0.5),
  g('Afrobeat', 'latin', [0.75, 0.2, 0.7, 0.8], 'dorian', 0.1),
  g('Reggae', 'caribbean', [0.85, 0.15, 0.85, 0.35], 'ionian', 0.05),
  g('Dub', 'caribbean', [0.8, 0.05, 0.7, 0.25], 'aeolian', 0.35),
  // (rock and metal)
  g('Rock', 'rock and metal', [0.2, 0.3, 0.7, 0.8], 'mixolydian', 0.3),
  g('Punk', 'rock and metal', [0.15, 0.2, 0.9, 0.95], 'ionian', 0.45),
  g('Doom metal', 'rock and metal', [0.1, 0.2, 0.3, 0.4], 'phrygian', 0.85),
  g('Thrash metal', 'rock and metal', [0.3, 0.3, 0.95, 1], 'phrygian', 0.9),
  g('Shoegaze', 'rock and metal', [0.15, 0.4, 0.05, 0.9], 'ionian', 0.35),
  // (folk)
  g('Folk waltz', 'folk', [0.1, 0.3, 0.2, 0.4], 'ionian', 0),
  g('Celtic jig', 'folk', [0.3, 0.3, 0.6, 0.8], 'mixolydian', 0),
  g('Blues', 'folk', [0.45, 0.35, 0.5, 0.5], 'mixolydian', 0.45),
  g('Country', 'folk', [0.25, 0.3, 0.55, 0.55], 'ionian', 0),
  g('March', 'folk', [0.05, 0.3, 0.8, 0.7], 'ionian', 0),
  // (classical)
  g('Baroque', 'classical', [0.15, 0.85, 0.4, 0.7], 'ionian', 0.1),
  g('Romantic', 'classical', [0.2, 0.95, 0.15, 0.5], 'aeolian', 0.45),
  g('Minimalism', 'classical', [0.3, 0.05, 0.7, 0.6], 'ionian', 0),
  // (dark)
  g('Horror drone', 'dark', [0.05, 0.1, 0, 0.15], 'locrian', 1),
  g('Flamenco', 'dark', [0.7, 0.5, 0.85, 0.75], 'phrygian', 0.5),
];

/** An option: its name, its axes, and a genre's point on them. */
export interface AtlasOption {
  readonly name: string;
  readonly axes: readonly string[];
  readonly point: (x: Genre) => readonly number[];
}

const bright = (x: Genre) => BRIGHTNESS[x.mode]!;
const mood = (x: Genre) => 0.6 * bright(x) + 0.4 * (1 - x.tension);

export const OPTIONS: readonly AtlasOption[] = [
  { name: 'v0.21', axes: ['sync', 'harm', 'artic', 'energy'], point: (x) => [x.sync, x.harm, x.attack, x.density] },
  { name: 'drive', axes: ['sync', 'harm', 'drive', 'bright'], point: (x) => [x.sync, x.harm, (x.attack + x.density) / 2, bright(x)] },
  { name: 'bite+mode', axes: ['sync', 'harm', 'bite', 'mood'], point: (x) => [x.sync, x.harm, x.attack, bright(x)] },
  { name: 'bite+mood', axes: ['sync', 'harm', 'bite', 'mood'], point: (x) => [x.sync, x.harm, x.attack, mood(x)] },
];

/** The distance between two points: the root mean square of their differences, as the repository's `pointDistance`. */
export const distance = (a: readonly number[], b: readonly number[]): number => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0) / a.length);

/** Pearson's correlation of two series. */
export function correlation(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i]! - mx) * (y[i]! - my);
    sxx += (x[i]! - mx) ** 2;
    syy += (y[i]! - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** What an option does with the atlas. */
export interface AtlasMeasure {
  readonly option: string;
  /** Each genre's nearest other genre's distance: its median and least. */
  readonly medianGap: number;
  readonly leastGap: number;
  /** Pairs nearer than `CONFUSED` (a third of the repository's miss distance, 0.3), nearest first. */
  readonly confused: readonly { readonly a: string; readonly b: string; readonly distance: number }[];
  /** Pairs of different families nearer than `CONFUSED`: a confusion a listener wouldn't make. */
  readonly crossFamily: number;
  /** The silhouette of the families: how much nearer a genre is to its own family than to the next (−1 to 1). */
  readonly silhouette: number;
  /** The largest correlation between two axes, over the atlas: how far the axes are from independent. */
  readonly worstCorrelation: { readonly axes: string; readonly r: number };
  /** Each axis's spread over the atlas (its standard deviation). */
  readonly spread: readonly number[];
  /** Each of the cube's 16 corners: the genre nearest it, and how far. */
  readonly corners: readonly { readonly corner: string; readonly genre: string; readonly distance: number }[];
}

/** Two genres nearer than this read as one style: a third of the repository's miss distance (0.3). */
export const CONFUSED = 0.1;

export function measure(option: AtlasOption, atlas: readonly Genre[] = ATLAS): AtlasMeasure {
  const points = atlas.map(option.point);
  const pairs: { a: number; b: number; distance: number }[] = [];
  for (let i = 0; i < atlas.length; i++) for (let j = i + 1; j < atlas.length; j++) pairs.push({ a: i, b: j, distance: distance(points[i]!, points[j]!) });
  const gaps = atlas.map((_, i) => Math.min(...pairs.filter((p) => p.a === i || p.b === i).map((p) => p.distance))).sort((x, y) => x - y);
  const confused = pairs.filter((p) => p.distance < CONFUSED).sort((x, y) => x.distance - y.distance);
  const families = [...new Set(atlas.map((x) => x.family))];
  const between = (i: number, j: number) => distance(points[i]!, points[j]!);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const silhouettes = atlas.map((x, i) => {
    const own = atlas.flatMap((y, j) => (j !== i && y.family === x.family ? [between(i, j)] : []));
    if (!own.length) return 0;
    const a = mean(own);
    const b = Math.min(...families.filter((f) => f !== x.family).map((f) => mean(atlas.flatMap((y, j) => (y.family === f ? [between(i, j)] : [])))));
    return (b - a) / Math.max(a, b);
  });
  let worst = { axes: '', r: 0 };
  const columns = option.axes.map((_, k) => points.map((p) => p[k]!));
  for (let k = 0; k < option.axes.length; k++)
    for (let l = k + 1; l < option.axes.length; l++) {
      const r = correlation(columns[k]!, columns[l]!);
      if (Math.abs(r) > Math.abs(worst.r)) worst = { axes: `${option.axes[k]}–${option.axes[l]}`, r };
    }
  const spread = columns.map((c) => Math.sqrt(mean(c.map((v) => (v - mean(c)) ** 2))));
  const corners = Array.from({ length: 2 ** option.axes.length }, (_, c) => {
    const corner = option.axes.map((_, k) => (c >> (option.axes.length - 1 - k)) & 1);
    const near = atlas.map((x, i) => ({ genre: x.name, distance: distance(points[i]!, corner) })).sort((x, y) => x.distance - y.distance)[0]!;
    return { corner: corner.join(''), ...near };
  });
  return {
    option: option.name,
    medianGap: gaps[Math.floor(gaps.length / 2)]!,
    leastGap: gaps[0]!,
    confused: confused.map((p) => ({ a: atlas[p.a]!.name, b: atlas[p.b]!.name, distance: p.distance })),
    crossFamily: confused.filter((p) => atlas[p.a]!.family !== atlas[p.b]!.family).length,
    silhouette: mean(silhouettes),
    worstCorrelation: worst,
    spread,
    corners,
  };
}

const f = (x: number, d = 3) => x.toFixed(d);

/** The tables the note quotes. */
export function report(atlas: readonly Genre[] = ATLAS): string {
  const all = OPTIONS.map((o) => measure(o, atlas));
  const lines = [
    `### The options over ${atlas.length} genres`,
    '',
    `| option | axes | median gap | least gap | pairs under ${CONFUSED} | across families | silhouette | most correlated axes | spread per axis |`,
    '|---|---|---|---|---|---|---|---|---|',
    ...all.map((m, i) => {
      const o = OPTIONS[i]!;
      return `| ${m.option} | ${o.axes.join(' ')} | ${f(m.medianGap)} | ${f(m.leastGap)} | ${m.confused.length} | ${m.crossFamily} | ${f(m.silhouette)} | ${m.worstCorrelation.axes} ${f(m.worstCorrelation.r, 2)} | ${m.spread.map((s) => f(s, 2)).join(' ')} |`;
    }),
    '',
  ];
  for (const m of all) {
    lines.push(`### ${m.option}: the pairs under ${CONFUSED}`, '');
    lines.push(m.confused.length ? m.confused.map((p) => `- ${p.a} and ${p.b}, ${f(p.distance)}`).join('\n') : '- none', '');
  }
  for (const m of all.slice(2)) {
    const o = OPTIONS.find((x) => x.name === m.option)!;
    lines.push(`### ${m.option}: each corner's nearest genre (axes in order: ${o.axes.join(' ')})`, '', '| corner | genre | distance |', '|---|---|---|');
    lines.push(...m.corners.map((c) => `| ${c.corner} | ${c.genre} | ${f(c.distance)} |`), '');
  }
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(report());
