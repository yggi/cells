/**
 * The meter finder measured (#648): `findMeter` (src/engine/time/cycles.ts) over benches whose meter is known, each a
 * row of how often it finds what was written.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/cycles.ts [bench …] [--rows]
 *
 * The benches:
 *  - `examples`: every example with a meter it doesn't bend, move or leave free, its first 40 s as played; the meter its
 *    text writes, the bar starting at 0.
 *  - `synthetic`: a kick on each group's start, a hat on every pulse, a snare on the bar's last group, over each of
 *    `contracts/meter`'s groupings of 2s and 3s up to 12 pulses, at 3 tempos and 3 swings (straight, .6, 2/3).
 *  - `bach`: the MIDI library's 88 files (midi/{wtc,inventions,anna,offering}), each its time signature and its bars
 *    from the file's start.
 *  - `groove`: the Groove MIDI fixtures (fixtures/groove), their swing as tools/groove.ts reads it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findMeter, type Found, type Onset } from '../src/engine/time/cycles';
import { compileSource } from '../src/engine/compile';
import { codeShifts } from '../src/engine/program';
import { eventsBetween, plan } from '../src/engine/realize';
import { clocking } from '../src/engine/clocking';
import { EXAMPLES } from '../src/engine/examples';
import { resolveSeed } from '../src/repository/library';
import { readMidi, secondsAt } from '../src/engine/midifile';
import { performanceOf, quantile, swingShares } from './groove';

/** What was written: the bar's length (seconds), its beats, its first start, the beat (seconds), the swing at 8n. */
export interface Truth {
  readonly bar: number;
  readonly beats: number;
  readonly start: number;
  readonly beat: number;
  readonly swing8: number;
  /** The groups of eighths, where the meter is one of them (`2+2+3`); empty where it isn't (2/2, 3/2, 9/16). */
  readonly groups: readonly number[];
}

/** A case: its name, its onsets and what was written. */
export interface Case {
  readonly name: string;
  readonly onsets: readonly Onset[];
  readonly truth: Truth;
}

/** How a found meter compares: the beat, the bar's length, its start, its beats and grouping, its swing. */
export interface Score {
  readonly beat: boolean;
  readonly bar: boolean;
  /**
   * The bar found, or one of its metrical variants (half of it, two of it), is the written one where it is written: its
   * length and its start. A bar and its half sound the same and differ in which strokes are bar lines, which the notes
   * tell only weakly; beat tracking counts the variants so too (AMLt, Davies et al. 2009).
   */
  readonly level: boolean;
  readonly start: boolean;
  readonly beats: boolean;
  readonly groups: boolean;
  readonly swing: boolean;
}

/** Within this share, two lengths are one. */
const SAME = 0.03;
/** A swing's share found within this of the one written. */
export const SWING_NEAR = 0.03;

const near = (a: number, b: number, tol = SAME) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b));

/** The found meter against the truth. */
export function score(f: Found | null, t: Truth): Score {
  if (!f) return { beat: false, bar: false, level: false, start: false, beats: false, groups: false, swing: false };
  const beat = 60 / f.bpm;
  const bar = f.bar;
  const swing8 = f.swing.find((s) => s.level === '8n')?.share ?? 0.5;
  return {
    beat: near(beat, t.beat),
    bar: near(bar, t.bar),
    level: [f, ...(f.variants ?? [])].some((v) => near(v.bar, t.bar) && startsAt(v.start, t)),
    // (the bar found where it starts, within a beat of it: a pickup read as a bar line a beat late is near, not right)
    start: near(bar, t.bar) && startsAt(f.start, t),
    beats: f.groups.length === t.beats,
    groups: t.groups.length > 0 && f.groups.join('+') === t.groups.join('+') && near(bar, t.bar),
    swing: Math.abs(swing8 - t.swing8) <= SWING_NEAR,
  };
}

/** A bar found starting at `start` starts where the written one does, within half a beat (a pickup read as a bar line a beat late is near, not right). */
function startsAt(start: number, t: Truth): boolean {
  const off = ((((start - t.start) / t.bar) % 1) + 1) % 1;
  return Math.min(off, 1 - off) * t.bar <= t.beat * 0.5;
}

/** Groups of eighths a signature writes (cells' signatures by rule), or none where it isn't a grouping of eighths. */
export function groupsOf(num: number, den: number): number[] {
  if (den === 4 && num <= 12) return Array.from({ length: num }, () => 2);
  if (den === 8 && num % 3 === 0 && num > 3) return Array.from({ length: num / 3 }, () => 3);
  if (den === 8 && num === 3) return [3];
  const odd: Record<string, number[]> = { '5/8': [3, 2], '7/8': [3, 2, 2], '10/8': [3, 2, 3, 2] };
  return odd[`${num}/${den}`] ?? [];
}

/** The beats a signature counts: 4/4 four, 6/8 two, 3/8 one, 2/2 two, 9/16 three. */
export function beatsOf(num: number, den: number): number {
  if (den >= 8 && num % 3 === 0) return num / 3;
  const odd: Record<string, number> = { '5/8': 2, '7/8': 3, '10/8': 4 };
  return odd[`${num}/${den}`] ?? num;
}

/** A case from a text: its main meter as the truth, its first `seconds` as played; null where its meter isn't fixed. */
export function caseOf(name: string, source: string, seconds = 40): Case | null {
  const r = compileSource(source, undefined, { resolve: resolveSeed });
  const m = r.mainMeter;
  const me = m ? r.cells.get(m)?.meter : undefined;
  if (!m || !me || me.written !== 'meter') return null;
  const line = source.split('\n').find((l) => new RegExp(`^&${m}\\s`).test(l)) ?? '';
  if (/free\(|bend=|motor=|wind=/.test(line)) return null;
  const shifts = codeShifts(r);
  const map = clocking(r, plan(r, shifts).statics).map(m);
  const bar = map.q(me.levels.length) - map.q(0);
  const played = eventsBetween(plan(r, shifts), 0, seconds);
  // (a note's weight its level against the piece's loudest: a kick at .6 and one at 1 are two weights, not both 1)
  const level = (e: (typeof played)[number]) => (e.gains[0] + e.gains[1]) / 2;
  const loudest = Math.max(1e-9, ...played.map(level));
  const onsets = played.map((e) => ({ at: e.at, weight: level(e) / loudest, dur: e.dur, pitch: 69 + 12 * Math.log2(e.freq / 440) }));
  const groups = me.unit === 8 && me.beats.every((b) => b === 2 || b === 3) ? [...me.beats] : groupsOf(me.pulses, me.unit);
  // (a swing leans pairs alone, decision 071: a meter of threes plays straight whatever its swing says)
  const share = me.swing?.find((s) => s.level === '8n')?.share ?? 0.5;
  const swing8 = me.unit === 8 && !me.beats.includes(2) ? 0.5 : share;
  return { name, onsets, truth: { bar, beats: me.beats.length, start: map.q(0), beat: bar / me.beats.length, swing8, groups } };
}

/** The examples whose meter is fixed: written, not bent, not moved by a motor, its rate and signature no slider. */
export function exampleCases(seconds = 40): Case[] {
  return Object.entries(EXAMPLES).flatMap(([name, { source }]) => caseOf(name, source, seconds) ?? []);
}

/** The tempos and swings the synthetic bench plays each grouping at. */
export const SYNTHETIC = { bpm: [80, 110, 150], swing: [0.5, 0.6, 2 / 3] } as const;

/**
 * A drum pattern over each of `contracts/meter`'s groupings up to 12 eighths and four groups: a low kick on the bar
 * line, a kick on each other group's start, a snare on the last group's, a quiet hat on every eighth.
 */
export function syntheticCases(seconds = 24): Case[] {
  const contract = JSON.parse(readFileSync('fixtures/contracts/meter.json', 'utf8')) as { vectors: { groups: number[] }[] };
  const seen = new Set<string>();
  const out: Case[] = [];
  for (const { groups } of contract.vectors) {
    const key = groups.join('+');
    const n = groups.reduce((a, b) => a + b, 0);
    if (seen.has(key) || n > 12 || groups.length > 4) continue;
    seen.add(key);
    const starts = groups.reduce<number[]>((s, g, i) => [...s, i ? s[i - 1]! + groups[i - 1]! : 0], []);
    const hits = (on: (k: number) => boolean) => Array.from({ length: n }, (_, k) => (on(k) ? '0' : '~')).join(' ');
    for (const bpm of SYNTHETIC.bpm)
      for (const swing of SYNTHETIC.swing) {
        const source = [
          `&bar meter("${key}") step=${bpm}bpm${swing === 0.5 ? '' : ` swing=8n:${+swing.toFixed(4)}`}`,
          `&down step=8n ${hits((k) => k === 0)}`,
          `&kick step=8n ${hits((k) => k > 0 && starts.includes(k))}`,
          `&snare step=8n ${hits((k) => k === starts.at(-1) && k > 0)}`,
          `&hat step=8n ${hits(() => true)}`,
          '&k s=sine loop=C2 env=&(map=adsr 0 .1 0 .05)',
          '&h s=white hpf=8000 env=&(map=adsr 0 .03 0 .02)',
          '&s s=white hpf=1500 env=&(map=adsr 0 .08 0 .05)',
          '&mix map=sample [&down * &k, &kick * &k * .6, &snare * &s * .7, &hat * &h * .25]',
        ].join('\n');
        const c = caseOf(`${key} ${bpm}bpm sw${swing.toFixed(2)}`, source, seconds);
        if (c) out.push(c);
      }
  }
  return out;
}

/** The MIDI library: each file's notes as onsets, its first time signature as the truth, bars from its start. */
export function bachCases(root = 'midi'): Case[] {
  const out: Case[] = [];
  for (const dir of ['wtc', 'inventions', 'anna', 'offering'])
    for (const f of readdirSync(join(root, dir)).filter((x) => x.endsWith('.mid'))) {
      const smf = readMidi(new Uint8Array(readFileSync(join(root, dir, f))));
      const sig = smf.meters[0];
      if (!sig) continue;
      const onsets = smf.tracks.flatMap((t) =>
        t.notes.map((n) => ({ at: secondsAt(smf, n.tick), weight: n.velocity / 127, dur: secondsAt(smf, n.end) - secondsAt(smf, n.tick), pitch: n.key })),
      );
      const barTicks = (smf.ppq * 4 * sig.num) / sig.den;
      const bar = secondsAt(smf, sig.tick + barTicks) - secondsAt(smf, sig.tick);
      const beats = beatsOf(sig.num, sig.den);
      out.push({
        name: `${dir}/${f.replace(/\.mid$/, '')} ${sig.num}/${sig.den}`,
        onsets,
        truth: { bar, beats, start: secondsAt(smf, sig.tick), beat: bar / beats, swing8: 0.5, groups: groupsOf(sig.num, sig.den) },
      });
    }
  return out;
}

/**
 * The Groove MIDI fixtures (#19): each performance's drums as onsets (a kick's key the lowest), its truth its file's tempo
 * map in 4/4 from beat 0, its swing the median share of its eighths' pairs as tools/groove.ts reads them.
 */
export function grooveCases(root = 'fixtures/groove'): Case[] {
  const rows = readFileSync(join(root, 'info.csv'), 'utf8').trim().split('\n').slice(1);
  return rows.map((row) => {
    const cols = row.split(',');
    const file = cols[7]!;
    const p = performanceOf(new Uint8Array(readFileSync(join(root, file))), file, cols[3]);
    const shares = swingShares(p, 1).sort((a, b) => a - b);
    const beat = p.beats[1]! - p.beats[0]!;
    return {
      name: file,
      onsets: p.onsets.map((o) => ({ at: o.time, weight: o.velocity / 127, pitch: o.key })),
      truth: { bar: 4 * beat, beats: 4, start: p.beats[0]!, beat, swing8: shares.length ? quantile(shares, 0.5) : 0.5, groups: [2, 2, 2, 2] },
    };
  });
}

/** A bench's rows: each case's name, what was found, and how it compares. */
export function run(cases: readonly Case[]): { name: string; found: Found | null; truth: Truth; score: Score }[] {
  return cases.map((c) => {
    const found = findMeter(c.onsets);
    return { name: c.name, found, truth: c.truth, score: score(found, c.truth) };
  });
}

/** The share of rows right on each measure. */
export function summary(rows: readonly { score: Score }[]): Record<keyof Score, number> {
  const keys = ['beat', 'bar', 'start', 'level', 'beats', 'groups', 'swing'] as const;
  return Object.fromEntries(keys.map((k) => [k, rows.filter((r) => r.score[k]).length])) as Record<keyof Score, number>;
}

/** The benches by name. */
export const BENCHES: Readonly<Record<string, () => Case[]>> = {
  examples: () => exampleCases(),
  synthetic: () => syntheticCases(),
  groove: () => grooveCases(),
  bach: () => bachCases(),
};

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const args = process.argv.slice(2);
  const show = args.includes('--rows');
  const benches = args.filter((a) => !a.startsWith('--'));
  const all: Record<string, () => Case[]> = BENCHES;
  for (const b of benches.length ? benches : Object.keys(all)) {
    const rows = run(all[b]!());
    console.log(`## ${b} (${rows.length})`, summary(rows));
    if (show)
      for (const r of rows)
        console.log(
          `${Object.values(r.score)
            .map((x) => (x ? '✓' : '·'))
            .join(
              '',
            )}  ${r.name} [${Math.round(60 / r.truth.beat)}bpm ${r.truth.beats}b ${r.truth.bar.toFixed(2)}s sw${r.truth.swing8.toFixed(2)}]  →  ${r.found ? `${r.found.signature} ${Math.round(r.found.bpm)}bpm start ${r.found.start.toFixed(2)} ${r.found.swing.map((s) => `${s.level}:${s.share.toFixed(2)}`).join(',')}` : 'none'}`,
        );
  }
}
