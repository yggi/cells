/**
 * The analysis tools against an analyst's answer (#177, rung 2): a target is a piece written by hand as its structure
 * (BWV 847 first, `examples/bwv847.md`), with the sections an analyst marks in it (`fixtures/targets/<key>.json`). A
 * pipeline (the folder, Shorten) takes the piece's notes, flat, and writes a text; this module scores that text against
 * the target. `tools/targets.slow.test.ts` runs every pipeline over every target and holds the scores in a ratchet
 * (`tools/targets.ratchet.json`): each may only get better.
 *
 * What a text says about its structure is read off what it plays, so any spelling is scored alike: each note's onset
 * in the piece's sixteenths (through its `&tempo`), its voice, and the cell its number was written in (`flatten`'s
 * innermost), that cell's **family** (a copy's base, `base=&x`, all the way down) and its transposition.
 *
 * - **An occurrence** is a run of a voice's notes written in one cell at one transposition (`&subject^$-12` in the
 *   bass): a **part**, as the voice's line splices it (a cell, or a run of notes the line writes itself), or a **cell**,
 *   where each note is written, however deep.
 * - **A boundary** is a step where some voice's part starts or ends and every voice agrees: a part starts or ends there
 *   too (within `AGREE`: a note held across an entry), it rests between two parts there, or it doesn't play yet or any
 *   more. A text that writes a voice as one line
 *   of notes marks only where voices come in and go out.
 * - **Sections** (a): the target's boundaries an analyst marks, found within `TOLERANCE` steps (one bar), one to one:
 *   precision and recall.
 * - **Entries** (b): the target's occurrences of each theme's family (`&subject`, its copies `&answer`, …), and how
 *   many of them the text writes as an occurrence (a part or a cell) of one family of its own, in the same voice, from
 *   the same step.
 * - **Structure** (c): the text's measure (`tools/structure.ts`, decision 049) as a share of the target's.
 * - **Plays** (d): whether the text plays the target's notes, every one, over the whole piece: onset and length in
 *   sixteenths, and pitch (a MIDI file brings no voices, levels or sounds). A gate: a text that doesn't scores nothing
 *   else.
 */
import { readFileSync } from 'node:fs';
import { timeMap } from '../src/engine/clocking';
import { compileSource } from '../src/engine/compile';
import type { CellDecl } from '../src/engine/ast';
import { stepsOf } from '../src/engine/flatten';
import { parse } from '../src/engine/parser';
import { codeShifts } from '../src/engine/program';
import { eventsBetween, plan } from '../src/engine/realize';
import { structureOf } from './structure';

/** Steps a boundary may be off and still be found: a bar of sixteenths. */
export const TOLERANCE = 16;
/** Steps a voice's part may end or start from a boundary and still agree with it: an eighth, a note held across an entry. */
export const AGREE = 2;

/** An analyst's answer: the piece by hand, the sections marked in it (interior steps), and its themes (cells). */
export interface Target {
  readonly key: string;
  readonly text: string;
  readonly sections: readonly number[];
  readonly themes: readonly string[];
}

/** A run of a voice's notes written in one cell, at one transposition: as its line splices it (`part`), or innermost. */
export interface Occurrence {
  readonly voice: string;
  /** `part`: what the voice's line splices itself (a cell, or a run of notes it writes); `cell`: where a note is written. */
  readonly level: 'part' | 'cell';
  readonly cell: string;
  readonly family: string;
  readonly transpose: number;
  readonly from: number;
  readonly to: number;
  readonly notes: number;
}

/** A text's score against a target. */
export interface Score {
  readonly plays: boolean;
  readonly sections: { readonly precision: number; readonly recall: number; readonly found: readonly number[] };
  readonly entries: { readonly found: number; readonly of: number; readonly recall: number };
  readonly structure: number;
}

/** A target from its files: the piece (an example's key) and `fixtures/targets/<key>.json`. */
export function targetOf(key: string): Target {
  const file = readFileSync(`examples/${key}.md`, 'utf8');
  const text = /```cells\n([\s\S]*?)```/.exec(file)![1]!;
  const { sections, themes } = JSON.parse(readFileSync(`fixtures/targets/${key}.json`, 'utf8')) as { sections: number[]; themes: string[] };
  return { key, text, sections, themes };
}

/** What a text plays, whole: each note's onset and length in the piece's sixteenths and its pitch (a MIDI file brings no voices, levels or sounds), sorted. */
export function playedOf(text: string): string[] {
  const r = compileSource(text);
  const shifts = codeShifts(r);
  const p = plan(r, shifts);
  const tm = timeMap(r, r.clocks.get('tempo')!, shifts);
  return eventsBetween(p, 0, p.end + 1)
    .map((e) => {
      const at = Math.round(tm.stepAt(e.at));
      return `${at} ${Math.round(tm.stepAt(e.at + e.dur)) - at} ${Math.round(12 * Math.log2(e.freq / 261.6256))}`;
    })
    .sort();
}

/** A text's occurrences, voice by voice, in the piece's sixteenths (its `&tempo`'s steps): its lines' parts, and its cells. */
export function occurrencesOf(text: string): Occurrence[] {
  const r = compileSource(text);
  const shifts = codeShifts(r);
  const p = plan(r, shifts);
  const tempo = r.clocks.get('tempo');
  if (!tempo) throw new Error('a target is timed by its &tempo');
  const tm = timeMap(r, tempo, shifts);
  const decls = new Map(parse(text).cells.map((d) => [d.name, d]));
  const family = (cell: string) => {
    let c = cell;
    for (let guard = 0; decls.get(c)?.base && guard < 32; guard++) c = decls.get(c)!.base!.name;
    return c;
  };
  const played = eventsBetween(p, 0, p.end + 1);
  const out: Occurrence[] = [];
  for (const track of p.tracks) {
    const voice = track.output.voice;
    const parts = partsOf(r, decls.get(track.output.cell));
    // (the track's steps and what sounded, onset by onset: a step's notes are one token of one cell)
    const written = groups(track.events, (e) => e.step);
    const sounded = groups(
      played.filter((e) => e.voice === voice),
      (e) => e.at,
    );
    const runs: Record<'part' | 'cell', Occurrence | null> = { part: null, cell: null };
    // (a run ends where the cell, its transposition or the line's token changes: &coda &coda is two)
    const tokens: Record<'part' | 'cell', number> = { part: -1, cell: -1 };
    const extend = (level: 'part' | 'cell', cell: string, transpose: number, token: number, from: number, to: number) => {
      const run = runs[level];
      if (run && run.cell === cell && run.transpose === transpose && tokens[level] === token) runs[level] = { ...run, to: Math.max(run.to, to), notes: run.notes + 1 };
      else {
        if (run) out.push(run);
        runs[level] = { voice, level, cell, family: family(cell.split(':')[0]!), transpose, from, to, notes: 1 };
        tokens[level] = token;
      }
    };
    // (a line that loops is written once and sounded on every lap: the groups come round)
    sounded.forEach((notes, i) => {
      const step = written[i % written.length]![0]!;
      const from = Math.round(tm.stepAt(notes[0]!.at));
      const to = Math.round(Math.max(...notes.map((n) => tm.stepAt(n.at + n.dur))));
      const part = parts(step.step);
      extend('cell', step.cell, step.transpose ?? 0, part.token, from, to);
      extend('part', part.cell, part.transpose, part.token, from, to);
    });
    for (const run of Object.values(runs)) if (run) out.push(run);
  }
  return out;
}

/**
 * A line's parts, by its own step: the cell it splices there (`&answer`, with its `^$n`), or, where it writes notes
 * itself, the run of them (`&alto:3`: after its third splice).
 */
function partsOf(r: ReturnType<typeof compileSource>, line: CellDecl | undefined): (step: number) => { cell: string; transpose: number; token: number } {
  const spans: { from: number; to: number; cell: string; transpose: number; token: number }[] = [];
  if (line && line.braid.kind === 'list') {
    let at = 0;
    let splices = 0;
    for (const t of line.braid.tokens) {
      const a = t.atom;
      const ref = a.kind === 'ref' && r.cells.has(a.name);
      const length = (ref ? stepsOf(r, a.name, a.pick) : 1) * Math.max(1, t.elongate) * Math.max(1, t.repeat);
      if (ref) splices++;
      // (a run of notes the line writes itself is one part: its token, the splice before it)
      const token = ref ? spans.length : -splices - 1;
      spans.push(
        ref ? { from: at, to: at + length, cell: a.name, transpose: a.transpose ?? 0, token } : { from: at, to: at + length, cell: `${line.name}:${splices}`, transpose: 0, token },
      );
      at += length;
    }
  }
  const lap = spans.length ? spans[spans.length - 1]!.to : 1;
  return (step) => {
    const s = ((step % lap) + lap) % lap;
    return spans.find((x) => s >= x.from - 1e-9 && s < x.to - 1e-9) ?? { cell: line?.name ?? '', transpose: 0, token: 0 };
  };
}

/** Items grouped by a key, in the key's order. */
function groups<T>(items: readonly T[], key: (x: T) => number): T[][] {
  const by = new Map<number, T[]>();
  for (const x of items) {
    const k = Math.round(key(x) * 1e6);
    by.set(k, [...(by.get(k) ?? []), x]);
  }
  return [...by].sort((a, b) => a[0] - b[0]).map(([, xs]) => xs);
}

/** The steps a text's occurrences mark as boundaries, inside the piece. */
export function boundariesOf(all: readonly Occurrence[]): number[] {
  const occurrences = all.filter((o) => o.level === 'part');
  const voices = [...new Set(occurrences.map((o) => o.voice))].map((v) => occurrences.filter((o) => o.voice === v).sort((a, b) => a.from - b.from));
  const end = Math.max(...occurrences.map((o) => o.to));
  const edges = [...new Set(occurrences.flatMap((o) => [o.from, o.to]))].filter((t) => t > 0 && t < end).sort((a, b) => a - b);
  // (a voice agrees at t: an occurrence starts or ends there, it rests between two there, or it isn't playing)
  const near = (x: number, t: number) => Math.abs(x - t) <= AGREE;
  const agrees = (os: readonly Occurrence[], t: number) =>
    t <= os[0]!.from || t >= os[os.length - 1]!.to || os.some((o, i) => near(o.from, t) || near(o.to, t) || (i > 0 && os[i - 1]!.to <= t && t <= o.from));
  // (boundaries within AGREE of each other are one, the first)
  return edges.filter((t) => voices.every((os) => agrees(os, t))).filter((t, i, all) => i === 0 || t - all[i - 1]! > AGREE);
}

/** Boundaries found within the tolerance, one to one: how many of `found` match one of `truth`. */
function matched(found: readonly number[], truth: readonly number[]): number {
  const free = [...truth];
  let n = 0;
  for (const t of found) {
    const i = free.findIndex((x) => Math.abs(x - t) <= TOLERANCE);
    if (i >= 0) {
      free.splice(i, 1);
      n++;
    }
  }
  return n;
}

/** Each of a text's voices, by the voice of another whose notes (onset, pitch) it shares most. */
export function voicesLike(text: string, like: string): Map<string, string> {
  const notes = (src: string) => {
    const r = compileSource(src);
    const shifts = codeShifts(r);
    const p = plan(r, shifts);
    const tm = timeMap(r, r.clocks.get('tempo')!, shifts);
    const by = new Map<string, Set<string>>();
    for (const e of eventsBetween(p, 0, p.end + 1))
      by.set(e.voice, (by.get(e.voice) ?? new Set()).add(`${Math.round(tm.stepAt(e.at))} ${Math.round(12 * Math.log2(e.freq / 261.6256))}`));
    return by;
  };
  const theirs = [...notes(like)];
  const out = new Map<string, string>();
  for (const [voice, ns] of notes(text)) {
    const shared = theirs.map(([v, ts]) => [v, [...ns].filter((n) => ts.has(n)).length] as const).sort((a, b) => b[1] - a[1]);
    if (shared[0] && shared[0][1] > 0) out.set(voice, shared[0][0]);
  }
  return out;
}

/** A text's score against a target (its notes the target's, else nothing scored). */
export function scoreOf(target: Target, text: string): Score {
  const plays = playedOf(text).join('\n') === playedOf(target.text).join('\n');
  if (!plays) return { plays, sections: { precision: 0, recall: 0, found: [] }, entries: { found: 0, of: 0, recall: 0 }, structure: 0 };
  const theirs = occurrencesOf(target.text);
  // (the text's voices by the target's names: each the target voice whose notes it shares most, as a MIDI file names its own)
  const named = voicesLike(text, target.text);
  const mine = occurrencesOf(text).map((o) => ({ ...o, voice: named.get(o.voice) ?? o.voice }));
  const found = boundariesOf(mine);
  const hits = matched(found, target.sections);
  // each theme: the target's occurrences of its family, and the text's family that writes most of them
  let entries = 0;
  let of = 0;
  for (const theme of target.themes) {
    // (an entry once, whether its line splices it or it is written deeper)
    const truth = [...new Map(theirs.filter((o) => o.family === theme).map((o) => [`${o.voice}@${o.from}`, o])).values()];
    of += truth.length;
    const at = (v: string, step: number) => mine.filter((o) => o.voice === v && o.from === step).map((o) => o.family);
    const votes = new Map<string, number>();
    for (const e of truth) for (const f of new Set(at(e.voice, e.from))) votes.set(f, (votes.get(f) ?? 0) + 1);
    entries += Math.max(0, ...votes.values());
  }
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return {
    plays,
    sections: { precision: round(found.length ? hits / found.length : 0), recall: round(hits / target.sections.length), found },
    entries: { found: entries, of, recall: round(of ? entries / of : 0) },
    structure: round(structureOf(text).total / structureOf(target.text).total),
  };
}
