/**
 * Swing, agogic and velocity by metric level, measured in the Groove MIDI Dataset (#19): what drummers play, as
 * numbers the meter's defaults can be checked against. A measurement; it decides no language. The page is
 * docs/notes/groove-measure.md, and it says what each number means and how it was chosen.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/groove.ts \
 *     <dataset dir> [--list sample.txt]
 *
 * The dataset dir is the unzipped groove-v1.0.0-midionly.zip (Magenta, CC-BY 4.0; not committed): its `info.csv` names
 * each file's style and time signature. The sample is every 4-4 file with at least MIN_PLAYING seconds between its
 * first and last onset. The tables go to stdout as Markdown; `--list` writes the sample's file names, one a line.
 * The MIDI is read by `src/engine/midifile.ts`; `midiimport` is not used, since it lays the notes on a grid and drops
 * their velocities, which are what is measured here.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readMidi, secondsAt } from '../src/engine/midifile';

/** A drum struck: when (seconds), which key (as the dataset's Roland TD-11 maps its pads), how hard (1–127). */
export interface Onset {
  readonly time: number;
  readonly key: number;
  readonly velocity: number;
}

/** A performance: its file, its style (the first part of the dataset's label), its onsets by time and its beats' times. */
export interface Performance {
  readonly file: string;
  readonly style: string;
  readonly onsets: readonly Onset[];
  /** Beat k's time in seconds, from the tempo map: a quarter note each, beat 0 the file's start and a downbeat. */
  readonly beats: readonly number[];
}

/** The playing a performance needs to be in the sample: a minute between its first onset and its last. */
export const MIN_PLAYING = 60;

/** A slot takes the onset nearest it within this share of the span it divides (a pair for swing, a beat for agogic). */
export const WINDOW = 0.25;

/** A median is printed only over at least this many pairs (or bars) from at least MIN_PERFORMANCES performances. */
export const MIN_PAIRS = 100;
export const MIN_PERFORMANCES = 3;

/** A performance's own median is taken over at least this many pairs (or bars). */
export const MIN_OWN = 20;

/** A performance swings a level when its own median share there is at least this (between .5 straight and 2/3, 2:1). */
export const SWUNG = 0.55;

/** A performance leans a beat when its own median share of the bar is this far from a quarter, or further. */
export const LEANS = 0.01;

/** The swing levels: a pair of 8ths spans a beat, a pair of 16ths half a beat. */
export const SWING_LEVELS = [
  { name: '8ths', pair: 1 },
  { name: '16ths', pair: 0.5 },
] as const;

/** The metric levels of 4/4 on a 16th grid, by a 16th's place in the bar (cells' `meter("4/4", 4)` symbol beside). */
export const VELOCITY_LEVELS = ['downbeat (*)', 'beat 3 (+)', 'beats 2, 4 (+)', '8th off-beats (.)', '16th off-beats (,)'] as const;

/**
 * The keys that keep time, struck with a stick: the TD-11's hi-hat, closed and open, bow and edge (42 22 46 26), and its
 * ride, bow, edge and bell (51 59 53). Their velocities by level are an accent within one voice, apart from which drum
 * falls where. The hi-hat pedal (44), played with the foot, is left out.
 */
export const TIMEKEEPERS: ReadonlySet<number> = new Set([22, 26, 42, 46, 51, 53, 59]);

/** The second onset's share of a pair whose onsets are a, b and c (c the next pair's first): 0.5 straight, 2/3 for 2:1. */
export const swingShare = (a: number, b: number, c: number): number => (b - a) / (c - a);

/** A performance read from a MIDI file's bytes: every note's onset, on whichever track, and the beats through its last. */
export function performanceOf(bytes: Uint8Array, file = '', style = ''): Performance {
  const smf = readMidi(bytes);
  const notes = smf.tracks.flatMap((t) => t.notes);
  const onsets = notes.map((n) => ({ time: secondsAt(smf, n.tick), key: n.key, velocity: n.velocity })).sort((x, y) => x.time - y.time);
  const lastTick = Math.max(0, ...notes.map((n) => n.tick));
  const beats: number[] = [];
  for (let k = 0; k <= Math.ceil(lastTick / smf.ppq) + 4; k++) beats.push(secondsAt(smf, k * smf.ppq));
  return { file, style, onsets, beats };
}

/** Seconds of playing: from the first onset to the last. */
export const playing = (p: Pick<Performance, 'onsets'>): number => (p.onsets.length ? p.onsets[p.onsets.length - 1].time - p.onsets[0].time : 0);

/** The time of beat position x (in beats, fractional), within the beat grid; NaN past its end. */
function timeAt(beats: readonly number[], x: number): number {
  const k = Math.floor(x);
  if (k < 0 || k + 1 >= beats.length) return k + 1 === beats.length && x === k ? beats[k] : NaN;
  return beats[k] + (x - k) * (beats[k + 1] - beats[k]);
}

/** The onset nearest time t, if it is within tolerance seconds of it. */
function nearest(onsets: readonly Onset[], t: number, tolerance: number): Onset | undefined {
  let lo = 0;
  let hi = onsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (onsets[mid].time < t) lo = mid + 1;
    else hi = mid;
  }
  let best: Onset | undefined;
  for (const i of [lo - 1, lo]) {
    const o = onsets[i];
    if (o && Math.abs(o.time - t) <= tolerance && (!best || Math.abs(o.time - t) < Math.abs(best.time - t))) best = o;
  }
  return best;
}

/**
 * The swing shares of one performance at one level: for each pair of slots (`pair` beats long, from beat 0), the onsets
 * nearest its first slot, its second and the next pair's first, each within WINDOW of the pair; a pair is measured when
 * all three are there and distinct. The share is taken between the onsets themselves, so a drummer ahead of or behind
 * the click moves nothing.
 */
export function swingShares(p: Performance, pair: number, share = swingShare): number[] {
  const shares: number[] = [];
  for (let x = 0; x + pair < p.beats.length - 1 + 1e-9; x += pair) {
    const [ga, gb, gc] = [timeAt(p.beats, x), timeAt(p.beats, x + pair / 2), timeAt(p.beats, x + pair)];
    if (!Number.isFinite(gc)) break;
    const tolerance = WINDOW * (gc - ga);
    const [a, b, c] = [nearest(p.onsets, ga, tolerance), nearest(p.onsets, gb, tolerance), nearest(p.onsets, gc, tolerance)];
    if (a && b && c && a.time < b.time && b.time < c.time) shares.push(share(a.time, b.time, c.time));
  }
  return shares;
}

/**
 * Agogic: for each bar of four beats with an onset near each beat and the next downbeat (within WINDOW of a beat), the
 * four beats' lengths as shares of the bar, as `scan(27 23 26 24)` writes them by hand (in hundredths).
 */
export function agogicShares(p: Performance): number[][] {
  const bars: number[][] = [];
  for (let bar = 0; 4 * bar + 4 < p.beats.length; bar++) {
    const ts: number[] = [];
    for (let i = 0; i <= 4; i++) {
      const k = 4 * bar + i;
      const o = nearest(p.onsets, p.beats[k], WINDOW * ((p.beats[k + 1] ?? 2 * p.beats[k] - p.beats[k - 1]) - p.beats[k]));
      if (!o) break;
      ts.push(o.time);
    }
    if (ts.length === 5 && ts.every((t, i) => i === 0 || t > ts[i - 1])) bars.push([0, 1, 2, 3].map((i) => (ts[i + 1] - ts[i]) / (ts[4] - ts[0])));
  }
  return bars;
}

/** An onset's metric level (an index into VELOCITY_LEVELS): its nearest 16th in the bar. */
export function levelOf(beats: readonly number[], time: number): number {
  let k = 0;
  while (k + 2 < beats.length && beats[k + 1] <= time) k++;
  const x = k + (time - beats[k]) / (beats[k + 1] - beats[k]);
  const sixteenth = ((Math.round(x * 4) % 16) + 16) % 16;
  if (sixteenth === 0) return 0;
  if (sixteenth === 8) return 1;
  if (sixteenth % 4 === 0) return 2;
  return sixteenth % 2 === 0 ? 3 : 4;
}

/** The q-quantile of sorted values, interpolated between neighbours. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const at = q * (sorted.length - 1);
  const lo = Math.floor(at);
  return sorted[lo] + (at - lo) * ((sorted[Math.min(lo + 1, sorted.length - 1)] ?? sorted[lo]) - sorted[lo]);
}

/** What was measured over a group of performances: the values pooled, and how many performances gave any. */
interface Pool {
  values: number[];
  performances: number;
}

const pooled = (lists: readonly (readonly number[])[]): Pool => ({ values: lists.flat().sort((a, b) => a - b), performances: lists.filter((l) => l.length > 0).length });
const enough = (pool: Pool) => pool.values.length >= MIN_PAIRS && pool.performances >= MIN_PERFORMANCES;
const f3 = (x: number) => x.toFixed(3);

/** The sample out of a dataset dir: every 4-4 file in info.csv with MIN_PLAYING seconds of playing, by file name. */
export function sampleOf(dir: string): Performance[] {
  const [header, ...rows] = readFileSync(join(dir, 'info.csv'), 'utf8').trim().split(/\r?\n/);
  const column = Object.fromEntries(header.split(',').map((name, i) => [name, i]));
  const sample: Performance[] = [];
  for (const row of rows) {
    const cells = row.split(',');
    if (cells[column.time_signature] !== '4-4') continue;
    const file = cells[column.midi_filename];
    const p = performanceOf(readFileSync(join(dir, file)), file, cells[column.style].split('/')[0]);
    if (playing(p) >= MIN_PLAYING) sample.push(p);
  }
  return sample.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

/** A performance's own median over its values, when it has MIN_OWN of them. */
const ownMedian = (values: readonly number[]): number =>
  values.length >= MIN_OWN
    ? quantile(
        [...values].sort((a, b) => a - b),
        0.5,
      )
    : NaN;

/** Its tempo in beats a minute, at its start. */
const bpmOf = (p: Performance): number => 60 / (p.beats[1] - p.beats[0]);

/** The tables, as Markdown: swing per style and level, the performances that swing, agogic per style, velocity per level. */
export function report(sample: readonly Performance[], share = swingShare): string {
  const styles = [...new Set(sample.map((p) => p.style))].sort(
    (a, b) => sample.filter((p) => p.style === b).length - sample.filter((p) => p.style === a).length || (a < b ? -1 : 1),
  );
  const groups: [string, readonly Performance[]][] = [...styles.map((s): [string, Performance[]] => [s, sample.filter((p) => p.style === s)]), ['all', sample]];
  const shares = new Map(sample.map((p) => [p, SWING_LEVELS.map(({ pair }) => swingShares(p, pair, share))]));
  const out: string[] = [];
  const thin = (pool: Pool) => `too few (${pool.values.length} from ${pool.performances})`;
  const iqr = (sorted: readonly number[]) => `${f3(quantile(sorted, 0.25))}–${f3(quantile(sorted, 0.75))}`;

  out.push('### Swing: the second onset’s share of the pair, every pair pooled', '');
  out.push('| style | perf. | 8ths median | 8ths IQR | 8ths pairs (perf.) | 16ths median | 16ths IQR | 16ths pairs (perf.) |', '|---|--:|--:|--:|--:|--:|--:|--:|');
  for (const [style, ps] of groups) {
    const cells = SWING_LEVELS.map((_, level) => {
      const pool = pooled(ps.map((p) => shares.get(p)![level]));
      const counts = `${pool.values.length} (${pool.performances})`;
      return enough(pool) ? [f3(quantile(pool.values, 0.5)), iqr(pool.values), counts] : [thin(pool), '', counts];
    });
    out.push(`| ${style} | ${ps.length} | ${cells.flat().join(' | ')} |`);
  }

  out.push('', `### Swing per performance: how many swing (own median ≥ ${SWUNG}), and by how much`, '');
  out.push('| style | 8ths swung / measured | their medians: median (range) | 16ths swung / measured | their medians: median (range) |', '|---|--:|--:|--:|--:|');
  for (const [style, ps] of groups) {
    const cells = SWING_LEVELS.map((_, level) => {
      const own = ps.map((p) => ownMedian(shares.get(p)![level])).filter(Number.isFinite);
      const swung = own.filter((m) => m >= SWUNG).sort((a, b) => a - b);
      const spread = swung.length ? `${f3(quantile(swung, 0.5))} (${f3(swung[0])}–${f3(swung[swung.length - 1])})` : '—';
      return [`${swung.length} / ${own.length}`, spread];
    });
    out.push(`| ${style} | ${cells.flat().join(' | ')} |`);
  }

  out.push('', `### The performances that swing a level (own median ≥ ${SWUNG})`, '');
  out.push('| file | style | bpm | 8ths | 16ths |', '|---|---|--:|--:|--:|');
  for (const p of sample) {
    const own = shares.get(p)!.map(ownMedian);
    if (own.some((m) => m >= SWUNG)) out.push(`| ${p.file} | ${p.style} | ${Math.round(bpmOf(p))} | ${own.map((m) => (Number.isFinite(m) ? f3(m) : '—')).join(' | ')} |`);
  }

  out.push('', '### Agogic: each beat’s share of the bar, median (IQR) over the bars', '');
  out.push(`| style | perf. | bars (perf.) | beat 1 | beat 2 | beat 3 | beat 4 | as a scan | perf. leaning ≥ ${LEANS} |`, '|---|--:|--:|--:|--:|--:|--:|---|--:|');
  for (const [style, ps] of groups) {
    const perBar = ps.map((p) => agogicShares(p));
    const bars = perBar.flat();
    const pool: Pool = { values: bars.map((b) => b[0]), performances: perBar.filter((l) => l.length > 0).length };
    if (!enough(pool)) {
      out.push(`| ${style} | ${ps.length} | ${bars.length} (${pool.performances}) | ${thin(pool)} | | | | | |`);
      continue;
    }
    const beats = [0, 1, 2, 3].map((i) => bars.map((b) => b[i]).sort((x, y) => x - y));
    const medians = beats.map((b) => quantile(b, 0.5));
    const own = perBar.filter((b) => b.length >= MIN_OWN);
    const leaning = own.filter((b) => [0, 1, 2, 3].some((i) => Math.abs(ownMedian(b.map((bar) => bar[i])) - 0.25) >= LEANS));
    out.push(
      `| ${style} | ${ps.length} | ${bars.length} (${pool.performances}) | ${beats.map((b, i) => `${f3(medians[i])} (${iqr(b)})`).join(' | ')} | \`scan(${medians.map((m) => Math.round(m * 100)).join(' ')})\` | ${leaning.length} / ${own.length} |`,
    );
  }
  const leaners = sample.flatMap((p) => {
    const bars = agogicShares(p);
    const own = [0, 1, 2, 3].map((i) => ownMedian(bars.map((bar) => bar[i])));
    return own.some((m) => Math.abs(m - 0.25) >= LEANS) ? [`- ${p.file} (${p.style}, ${Math.round(bpmOf(p))} bpm, ${bars.length} bars): ${own.map(f3).join(' ')}`] : [];
  });
  if (leaners.length) out.push('', `The performances that lean a beat by ${LEANS} or more, their own medians:`, '', ...leaners);

  for (const [title, keep] of [
    ['every onset', () => true],
    ['hi-hat and ride, struck', (o: Onset) => TIMEKEEPERS.has(o.key)],
  ] as const) {
    out.push('', `### Velocity by metric level: median (onsets), ${title}`, '');
    out.push(`| style | ${VELOCITY_LEVELS.join(' | ')} |`, `|---|${VELOCITY_LEVELS.map(() => '--:').join('|')}|`);
    for (const [style, ps] of groups) {
      const byLevel = VELOCITY_LEVELS.map(() => [] as number[][]);
      for (const p of ps) {
        const mine = VELOCITY_LEVELS.map(() => [] as number[]);
        for (const o of p.onsets) if (keep(o)) mine[levelOf(p.beats, o.time)].push(o.velocity);
        mine.forEach((v, i) => byLevel[i].push(v));
      }
      const pools = byLevel.map(pooled);
      out.push(`| ${style} | ${pools.map((pool) => (enough(pool) ? `${quantile(pool.values, 0.5)} (${pool.values.length})` : thin(pool))).join(' | ')} |`);
      if (style !== 'all' || !pools.every(enough)) continue;
      // velocity = 127·√level (E31): a level is (v/127)², so a ratio of velocities is 40·log10 of it in dB
      const downbeat = quantile(pools[0].values, 0.5);
      const db = pools.map((pool) => 40 * Math.log10(quantile(pool.values, 0.5) / downbeat));
      out.push(`| all, in dB from the downbeat | ${db.map((d) => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1)).join(' | ')} |`);
    }
  }
  return out.join('\n') + '\n';
}

/** The command line (the header says how): returns the tables. */
export function main(args: readonly string[]): string {
  let list = '';
  const dirs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list') list = args[++i];
    else dirs.push(args[i]);
  }
  if (dirs.length !== 1) throw new Error('usage: tools/groove.ts <dataset dir> [--list sample.txt]');
  const sample = sampleOf(dirs[0]);
  if (list) writeFileSync(list, sample.map((p) => p.file).join('\n') + '\n');
  return `${sample.length} performances in 4/4 with at least ${MIN_PLAYING} s of playing, ${new Set(sample.map((p) => p.style)).size} styles.\n\n${report(sample)}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`groove: ${(error as Error).message}`);
    process.exit(1);
  }
}
