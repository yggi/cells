/**
 * Sections (#346, docs/notes/fold.md): a piece cut where its key changes, each part of a line a cell of its own read
 * through its section's key, the line splicing its parts in order. A fugue's exposition, its episodes, its returns: in
 * degrees of each section's key, an entry in the dominant is the same degrees as the one in the tonic, so the folder
 * finds it one phrase; and the piece reads as its sections. Pure.
 *
 * - **Key areas** (`keyAreas`): a bar a time, the accidentals its notes would need in each of the 36 collections (the
 *   twelve major scales, their relative minors with them, and the twelve harmonic and twelve melodic minors); the keys bar by bar that
 *   need fewest, a change of key costing `SWITCH` (a Viterbi path), so a key is taken where it lasts, not for a chord.
 *   Each area is named in its collection: a harmonic or melodic minor as itself; a major scale's notes as its major or its relative
 *   minor, whichever tonic the bass starts or ends the area on.
 * - **Cuts** (`cutLines`): each line is cut at each area's start, or, where a note is held across it, at the nearest
 *   step within a bar where none is.
 */
import { degreeOf, keyOf, type Key } from './degrees';
import type { Chord, Line } from './ir';

/** A section: from one step to another (the piece's), and its key. */
export interface Section {
  readonly from: number;
  readonly to: number;
  readonly key: Key;
}

/** What a change of key must save, in accidentals: a key is changed where the music stays in the new one. */
const SWITCH = 12;
/** An area this many bars long at least (a shorter one is its neighbours'). */
const SHORTEST = 2;

const pitched = (c: Chord) => c.values.map(Number).filter((v) => Number.isInteger(v));

/** The lines' notes from one step to another, as lines of their own (from 0). */
function within(lines: readonly Line[], from: number, to: number): Line[] {
  return lines.map((l) => ({ ...l, length: to - from, chords: l.chords.filter((c) => c.at >= from && c.at < to).map((c) => ({ ...c, at: c.at - from })) }));
}

/** The piece's key areas, a bar `bar` steps long: one section a key, from the first step to the last. */
export function keyAreas(lines: readonly Line[], bar: number): Section[] {
  const length = Math.max(0, ...lines.map((l) => l.length));
  const bars = Math.ceil(length / bar);
  const collections: Key[] = [];
  for (let t = 0; t < 12; t++) collections.push(keyOf('major', t), keyOf('harmonic', t), keyOf('melodic', t));
  // each bar's notes' accidentals in each collection
  const cost = Array.from({ length: bars }, () => new Array<number>(collections.length).fill(0));
  for (const l of lines)
    for (const c of l.chords)
      for (const p of pitched(c)) {
        const b = Math.min(bars - 1, Math.floor(c.at / bar));
        collections.forEach((k, i) => (cost[b]![i]! += Math.abs(degreeOf(k, p).alter)));
      }
  if (!bars) return [];
  // the path of fewest accidentals, a change costing SWITCH
  const best = cost.map(() => new Array<number>(collections.length).fill(0));
  const from = cost.map(() => new Array<number>(collections.length).fill(0));
  best[0] = [...cost[0]!];
  for (let b = 1; b < bars; b++) {
    const prev = best[b - 1]!;
    let low = 0;
    for (let i = 1; i < prev.length; i++) if (prev[i]! < prev[low]!) low = i;
    for (let i = 0; i < collections.length; i++) {
      const stay = prev[i]!;
      const move = prev[low]! + SWITCH;
      [best[b]![i], from[b]![i]] = stay <= move ? [stay + cost[b]![i]!, i] : [move + cost[b]![i]!, low];
    }
  }
  const path = new Array<number>(bars);
  let at = 0;
  for (let i = 1; i < collections.length; i++) if (best[bars - 1]![i]! < best[bars - 1]![at]!) at = i;
  for (let b = bars - 1; b >= 0; b--) {
    path[b] = at;
    at = from[b]![at]!;
  }
  // runs of a key, a run shorter than SHORTEST its neighbour's; each named by its own notes
  const runs: { from: number; to: number; k: number }[] = [];
  for (let b = 0; b < bars; b++) {
    const last = runs[runs.length - 1];
    if (last && last.k === path[b]) last.to = b + 1;
    else runs.push({ from: b, to: b + 1, k: path[b]! });
  }
  // (merged with a short neighbour, a run keeps the key of the longer)
  const merged: { from: number; to: number; k: number; most: number }[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && (r.to - r.from < SHORTEST || last.to - last.from < SHORTEST)) {
      if (r.to - r.from > last.most) [last.k, last.most] = [r.k, r.to - r.from];
      last.to = r.to;
    } else merged.push({ ...r, most: r.to - r.from });
  }
  // each named in its collection: a harmonic minor is one; a major scale's notes are its major or its relative minor,
  // the one whose tonic the bass starts or ends the section on
  const sections = merged.map((r) => {
    const [from, to] = [r.from * bar, Math.min(length, r.to * bar)];
    const k = collections[r.k]!;
    if (k.name !== 'major') return { from, to, key: k };
    const part = within(lines, from, to).flatMap((l) => l.chords.filter((c) => pitched(c).length));
    const bassAt = (at: number) => {
      const here = part.filter((c) => c.at === at);
      return here.length ? ((Math.min(...here.flatMap(pitched)) % 12) + 12) % 12 : null;
    };
    const ends = part.length ? [bassAt(Math.min(...part.map((c) => c.at))), bassAt(Math.max(...part.map((c) => c.at)))] : [];
    const minor = (k.tonic + 9) % 12;
    return { from, to, key: ends.includes(minor) && !ends.includes(k.tonic) ? keyOf('minor', minor) : k };
  });
  // (neighbours in the same key are one section; on one tonic, a minor natural, harmonic or melodic is one key, read
  // through the longer one's scale)
  const minor = (k: Key) => k.name !== 'major';
  const out: Section[] = [];
  for (const s of sections) {
    const last = out[out.length - 1];
    const same = last && last.key.tonic === s.key.tonic && (last.key.name === s.key.name || (minor(last.key) && minor(s.key)));
    if (last && same) out[out.length - 1] = { from: last.from, to: s.to, key: s.to - s.from > last.to - last.from ? s.key : last.key };
    else out.push(s);
  }
  return out;
}

/** A line cut into its sections' parts: each from where the line's section starts (no note held across it) to the
 * next, its chords from 0. */
export function cutLines(lines: readonly Line[], sections: readonly Section[], bar: number): { line: string; section: number; part: Line }[] {
  const out: { line: string; section: number; part: Line }[] = [];
  for (const l of lines) {
    // (a step no note is held across: the area's start, else the nearest within a bar)
    const free = (s: number) => !l.chords.some((c) => c.at < s && c.at + c.dur > s);
    const cut = (s: number) => {
      for (let d = 0; d <= bar; d++) {
        if (s + d <= l.length && free(s + d)) return s + d;
        if (s - d >= 0 && free(s - d)) return s - d;
      }
      return null;
    };
    const cuts = [0];
    for (const s of sections.slice(1)) {
      const c = cut(s.from);
      if (c !== null && c > cuts[cuts.length - 1]!) cuts.push(c);
      else cuts.push(cuts[cuts.length - 1]!);
    }
    cuts.push(l.length);
    sections.forEach((_, i) => {
      const [from, to] = [cuts[i]!, cuts[i + 1]!];
      if (to <= from) return;
      out.push({
        line: l.name,
        section: i,
        part: { name: `${l.name}§${i}`, length: to - from, chords: l.chords.filter((c) => c.at >= from && c.at < to).map((c) => ({ ...c, at: c.at - from })) },
      });
    });
  }
  return out;
}
