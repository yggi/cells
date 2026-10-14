/**
 * Paths shared by lines (#381; docs/notes/disassembler-literature.md, topic 1): a passage that comes back again and
 * again, each time moved by the same step (a canon per tonos: the whole canon a tone higher each pass), found over all
 * the notes at once, voices and lines together, after SIA and SIATEC (Meredith, Lemström & Wiggins 2002; the
 * pseudocode in Meredith 2016, doi:10.1007/978-3-319-25931-4_13). Written here from the description; no reference
 * implementation's code.
 *
 * - **The points**: every note as (onset, pitch), its line beside it.
 * - **SIA**: every vector from a point to a later one, grouped; the points a vector maps onto points are its maximal
 *   translatable pattern (MTP).
 * - **SIATEC**: a pattern's translators are the vectors that map all of it onto points (its translational equivalence
 *   class, TEC). Asked here only of a step's multiples, which is all a path needs: the full TEC of every pattern costs
 *   minutes on a long piece.
 * - **A path**: a pattern whose translators hold (kT, kΔp) for k = 1 … K−1 with Δp ≠ 0 and K ≥ 3: the pattern K times,
 *   each a step T later and Δp higher (the MTPs of v, 2v … intersected). Shared by lines: the pattern has notes in two
 *   lines or more.
 *
 * What a path is worth, said as a key cell (`saving`): every note from the pattern's start on, in pass k, written k·Δp
 * lower, and a cell of the key's steps (0, Δp, 2Δp …) summed into the lines (`examples/pertonos.cells` writes its
 * canon so). The folder judges both; the difference is the key cell's worth, its own characters counted.
 */
import type { Smf } from '../../src/engine/midifile';
import { cellsFromMidi } from '../../src/engine/midiimport';
import { bare } from '../../src/engine/fold/score';

/** A note as a point: when (ticks), its pitch (a MIDI key), its line (a track and channel). */
interface Point {
  readonly t: number;
  readonly p: number;
  readonly line: number;
}

/** A path: its pattern (the notes of the first pass), the step between passes (ticks, semitones), how many passes,
 * and the lines the pattern has notes in. */
export interface Path {
  readonly start: number;
  /** Where each line's part of the pattern starts (ticks; a line a key, `pointsOf`'s line numbers): a canon's
   * voices enter one after another, so each line's passes begin at its own phase. */
  readonly phases: ReadonlyMap<number, number>;
  readonly step: number;
  readonly by: number;
  readonly passes: number;
  readonly notes: number;
  readonly lines: number;
}

/** A pattern this small is not a passage (and the n² vectors' patterns are mostly small). */
const SMALLEST = 8;
/** A path's step, at most (semitones): an octave. */
const MOST_STEP = 12;

/** Every melodic note of a file as a point, by onset then pitch. */
function pointsOf(smf: Smf): Point[] {
  const out: Point[] = [];
  smf.tracks.forEach((tr, i) => {
    for (const n of tr.notes) if (n.channel !== 10) out.push({ t: n.tick, p: n.key, line: i * 16 + n.channel });
  });
  return out.sort((a, b) => a.t - b.t || a.p - b.p);
}

/** A vector as one number: ticks and semitones (a pitch step within ±127). */
const vec = (dt: number, dp: number) => dt * 256 + dp + 128;
const dtOf = (v: number) => Math.floor(v / 256);
const dpOf = (v: number) => (v % 256) - 128;

/**
 * The paths shared by lines in a file: each pattern in two lines or more that comes back moved by one step (an octave
 * at most) three times or more, the longest run of passes for each step, the largest pattern for each run. `least`: a pattern's least notes (a share of the piece's notes,
 * at least `SMALLEST`).
 */
export function pathsIn(smf: Smf, least = 0.05): Path[] {
  const pts = pointsOf(smf);
  const n = pts.length;
  const min = Math.max(SMALLEST, Math.ceil(least * n));
  // SIA: each forward vector, the points it maps onto points (its MTP), kept where large enough
  const mtp = new Map<number, number[]>();
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const dt = pts[j]!.t - pts[i]!.t;
      const dp = pts[j]!.p - pts[i]!.p;
      // (a path moves: a vector with no pitch step is a plain repeat, Re-Pair's)
      if (dt <= 0 || dp === 0) continue;
      const v = vec(dt, dp);
      const at = mtp.get(v);
      if (at) at.push(i);
      else mtp.set(v, [i]);
    }
  // a path of step v: the points whose images under v, 2v … (K−1)v are all points (the MTPs of v, 2v … intersected:
  // SIATEC's translators, asked only of a step's multiples); kept for the most passes K whose pattern is still large
  const found: Path[] = [];
  for (const [v, ps] of mtp) {
    const [T, by] = [dtOf(v), dpOf(v)];
    if (by === 0 || Math.abs(by) > MOST_STEP || ps.length < min || (mtp.get(vec(2 * T, 2 * by))?.length ?? 0) < min) continue;
    let pattern = new Set(ps);
    let passes = 2;
    for (;;) {
      const next = mtp.get(vec(passes * T, passes * by));
      if (!next || next.length < min) break;
      const both = new Set(next.filter((i) => pattern.has(i)));
      if (both.size < min) break;
      [pattern, passes] = [both, passes + 1];
    }
    if (passes < 3) continue;
    const notes = [...pattern].map((i) => pts[i]!);
    const phases = new Map<number, number>();
    for (const x of notes) phases.set(x.line, Math.min(phases.get(x.line) ?? Infinity, x.t));
    // (shared by lines: one line's path is Re-Pair's to fold, as it does: higher.ts)
    if (phases.size < 2) continue;
    found.push({ start: Math.min(...notes.map((x) => x.t)), phases, step: T, by, passes, notes: notes.length, lines: phases.size });
  }
  // (one a step: the most passes, then the largest pattern, then the earliest)
  const best = new Map<number, Path>();
  for (const f of found) {
    const k = vec(f.step, f.by);
    const b = best.get(k);
    if (!b || f.passes > b.passes || (f.passes === b.passes && (f.notes > b.notes || (f.notes === b.notes && f.start < b.start)))) best.set(k, f);
  }
  // (a step m times another's, m·Δp, is that path seen coarser: looked up, not compared with every other)
  const coarser = (p: Path) => {
    for (let m = 2; m <= p.passes; m++) {
      const q = p.step % m === 0 && p.by % m === 0 ? best.get(vec(p.step / m, p.by / m)) : undefined;
      if (q && q.passes >= p.passes) return true;
    }
    return false;
  };
  return [...best.values()].filter((p) => !coarser(p)).sort((a, b) => b.passes * b.notes - a.passes * a.notes);
}

/**
 * What a path is worth as key cells: the file folded as it is, and folded with every note of a line in the path's pass
 * k written k·Δp lower (each line's passes from its own phase: a canon's voices enter one after another), plus a key
 * cell for each phase (0 until it, each pass's step, 0 after). Their characters (`bare`) both ways: the difference is
 * what the key cells would save (negative: they cost). The key cells' text is an estimate of how the folder would write
 * them. `tempo`: the tempo map's characters, in both (a piece's map written a step at a time can outweigh its notes).
 * `folded`: the file folded already, where the caller has it.
 */
export function saving(
  smf: Smf,
  path: Path,
  title = 'piece',
  folded = cellsFromMidi(smf, title, { shorten: true }).source,
): { folded: number; withKey: number; key: number; tempo: number } {
  const moved: Smf = {
    ...smf,
    tracks: smf.tracks.map((tr, i) => ({
      ...tr,
      notes: tr.notes.map((nt) => {
        const phase = path.phases.get(i * 16 + nt.channel);
        const k = phase === undefined || nt.tick < phase ? -1 : Math.floor((nt.tick - phase) / path.step);
        return nt.channel === 10 || k < 1 || k >= path.passes ? nt : { ...nt, key: nt.key - k * path.by };
      }),
    })),
  };
  const rest = bare(cellsFromMidi(moved, title, { shorten: true }).source);
  // (the tempo map, the same both ways: written out a step at a time, it can outweigh the notes)
  const tempo = (/^&tempo .*$/m.exec(folded)?.[0].length ?? 0) + 1;
  // a key cell a phase: 0 until it, each pass's step, 0 after (in the passes' own unit: their gcd in ticks)
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  // (from the start, a running total of the step, `scan(2!12)`, as the canon per tonos writes its key; else 0 until
  // the phase, each pass's step and 0 after, in the passes' own unit, their gcd in ticks)
  const keyCell = (start: number) => {
    if (!start) return `&key step=&tempo/${path.step} scan(${path.by}!${path.passes})`.length + 1;
    const unit = gcd(start, path.step);
    const steps = [`0@${start / unit}`, ...Array.from({ length: path.passes }, (_, k) => `${k * path.by}@${path.step / unit}`), '0'];
    return `&key step=&tempo/${unit} ${steps.join(' ')}`.length + 1;
  };
  const key = [...new Set(path.phases.values())].reduce((a, start) => a + keyCell(start), 0);
  return { folded: bare(folded), withKey: rest + key, key, tempo };
}
