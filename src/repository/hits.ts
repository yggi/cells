/**
 * A rhythm fragment's hits (#715): each line of a groove with the role it declares, and its hits, over the groove's lap on a
 * bench: what a frontend read by text surgery. It ran a regex over the mix line (`&groove [&kick, &hat]`), rewrote the mix
 * as a MIDI card of one line to compile each alone, dropped the signature and `from` lines with `split('\n')`, and
 * guessed a role from the note where the line wrote none. Here the fragment's body is the lines (`bodyOf`: its signature
 * aside, as `sameText` reads a held template), united with the bench (`unionOf`), the mix given the card the kit's notes go
 * out on, compiled once, and each hit read from its output: the line it strikes from (`kit:voices:<line>`), its role as the
 * line's `role=` declares it (`readerOf`: none guessed), its key, its step on the bench's clock and its velocity. Pure.
 */
import { declarations, unionOf } from './fit';
import { holesOf } from './holes';
import { setAttr } from '../engine/edit';
import { clocking } from '../engine/clocking';
import { compileSource } from '../engine/compile';
import { planOf } from '../engine/host';
import { mainMeter } from '../engine/midiclock';
import { notesOf } from '../engine/notesof';
import type { DrumRole } from '../engine/perform/feel';
import type { Resolve } from '../engine/program';
import { bodyOf } from '../engine/use';

/** A hit of a line: the line it comes from, the role the line declares (null where it declares none), its key, its step and its velocity. */
export interface Hit {
  readonly line: string;
  readonly role: DrumRole | null;
  readonly note: number;
  /** The step in `1/grid` notes from the bar's start (sixteenths by default), whole where the hit falls on one (within a millionth), else the fraction. */
  readonly step: number;
  readonly velocity: number;
}

/** A line of the groove and the role it declares. */
export interface HitLine {
  readonly name: string;
  readonly role: DrumRole | null;
}

/** A groove read: the bars of its lap (`cycle=` of its longest line, at least one), each of its lines, and its hits by step then key. */
export interface HitsRead {
  readonly bars: number;
  readonly lines: readonly HitLine[];
  readonly hits: readonly Hit[];
}

/** How `hitsOf` reads: the library's resolve for the fragment's `from` lines, and the grid a step is on. */
export interface HitsOptions {
  readonly resolve: Resolve;
  /** Steps a whole note: a hit's `step` counts 1/`grid` notes from the bar's start (16: sixteenths, 4/4 has 16, 6/8 has 12). */
  readonly grid?: number;
}

/** The channel the kit's notes are read on: General MIDI's drums. */
const KIT_CHANNEL = 10;

/** Within a millionth of a step. */
const whole = (x: number): number => (Math.abs(x - Math.round(x)) < 1e-6 ? Math.round(x) : x);

/**
 * A rhythm fragment's hits on a bench (a text with a meter and its tempo: `&bar meter("4/4") step=120bpm`), its `from` lines
 * read through `resolve`; null where it has no mix of lines (a `[ ... ]` cell), or the bench no meter to step on. A line
 * that declares no `role=` is listed with a null role, and its hits carry none: no role is guessed.
 */
export function hitsOf(fragment: string, bench: string, { resolve, grid = 16 }: HitsOptions): HitsRead | null {
  const body = bodyOf(fragment);
  const union = unionOf(body, bench).text;
  const mix = declarations(union).find((l) => /^&\w+ \[.*\]$/.test(l.code));
  if (!mix) return null;
  const plan = planOf(setAttr(union, mix.name, 'map', `midi(${KIT_CHANNEL})`), undefined, { resolve });
  const meter = mainMeter(plan.result);
  if (!meter) return null;
  const clock = clocking(plan.result, plan.statics).played(meter.cell);
  const bar = plan.result.cells.get(meter.cell)?.meter;
  if (!bar) return null;
  // (a step of the meter's own is a pulse, or a part of one: its length in whole notes, then in `grid` steps)
  const cellSteps = bar.levels.length;
  const stepWhole = bar.pulses / (cellSteps * bar.unit);
  const bars = Math.max(1, ...holesOf(body, (text) => compileSource(text, undefined, { resolve }), resolve).clock.map((need) => need.bars));
  const read = notesOf(plan, { to: clock.q(cellSteps * bars) }).filter((n) => n.channel === KIT_CHANNEL);
  const hits: Hit[] = [];
  const lines = new Map<string, DrumRole | null>();
  for (const n of read) {
    const [first, second, third] = (n.output ?? '').split(':');
    if (first !== 'kit' || second !== 'voices' || third === undefined) continue;
    const role = n.reading?.role ?? null;
    if (!lines.has(third)) lines.set(third, role);
    hits.push({ line: third, role, note: n.note, step: whole(clock.stepAt(n.at) * stepWhole * grid), velocity: n.velocity });
  }
  return {
    bars,
    lines: [...lines].map(([name, role]) => ({ name, role })),
    hits: hits.sort((a, b) => a.step - b.step || a.note - b.note),
  };
}
