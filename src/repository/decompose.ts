/**
 * Decomposition (yggi/cells#512, rung 1; yggi/jambot#580, rung 4): a line of several bars, degrees of the key, written
 * as the motif it is made of and the form that plays it, the way a piece writes a tune whole (*Kinderlieder, in pieces*:
 * `&twinkleSong from ternary(answer=&wonder) &twinkle`). The Muse files what a player played so, a motif and a form
 * rather than bars of notes, and recognition then finds the motif again (decision 055).
 *
 * Every seed form (`FORM_FRAGMENTS`) is tried with every call that fills the line a whole number of times as it plays
 * it: the call the line's first bars, on the eighths a form splices at. Where a form's helper (its answer, its bridge)
 * doesn't play what the line plays, the helper is set to what the line plays where the helper first sounds (found by
 * playing the form with a probe in its place). A call or a helper that is a seed motif is written as that motif
 * (`&wonder from wonder &key`), any other as its own line. A decomposition is one whose notes are the line's: each
 * onset, degree and accidental, over the line's bars.
 *
 * Of the decompositions, and the line as it was, the one written with the least structure wins (decision 049's
 * measure, `structureOf`, the one Shorten ranks by): a line that is no form stays a line, and a form whose every
 * helper had to be set is no shorter than the line it states. Its lengths are the line's; what a decomposition says is
 * where each note starts and what it is. Pure.
 */
import { compileSource } from '../engine/compile';
import { flatten, tapped } from '../engine/flatten';
import { codeShifts } from '../engine/program';
import { structureOf } from '../engine/measure';
import { tapWhole } from '../engine/vary/lines';
import type { Fragment } from './fragments';
import { FORM_FRAGMENTS } from './forms';
import { resolveSeed } from './library';
import { MOTIF_FRAGMENTS } from './motifs';

/** A note of a line: where it starts in whole notes from the line's start, its degree and its accidental. */
export interface LineNote {
  readonly at: number;
  readonly degree: number;
  readonly alter: number;
}

/** A line written as a form and its motifs, or as it was. */
export interface Decomposition {
  /** The text, open on its meter and its key (no `&bar`, no `&key`): the line's cell, and every line it takes. */
  readonly text: string;
  /** The form's id, or null where the line stays a line. */
  readonly form: string | null;
  /** The call's seed motif id, or null where it is a line of its own (or the line stays a line). */
  readonly call: string | null;
  /** Each helper set, by its name, to a seed motif's id or to null where it is a line of its own. */
  readonly helpers: Readonly<Record<string, string | null>>;
  /** The structure it is written with (`structureOf`'s total). */
  readonly structure: number;
}

/** What a decomposition is tried with: the forms and the motifs, the seed's unless given. */
export interface DecomposeOptions {
  readonly forms?: readonly Fragment[];
  readonly motifs?: readonly Fragment[];
}

/** The workbench a line is read on: a meter by its signature, at 120 bpm, and a key nothing reads but its hole. */
const benchOf = (meter: string) => `&bar meter("${meter}") step=120bpm\n&key scale(ionian, C)`;

/** A note's key, for comparing notes: its start to a millionth of a whole note, its degree, its accidental. */
const keyOf = (n: LineNote) => `${Math.round(n.at * 1e6)}:${n.degree}:${n.alter}`;

/** Whether two lines play the same notes. */
const same = (a: readonly LineNote[], b: readonly LineNote[]) => a.length === b.length && a.every((n, i) => keyOf(n) === keyOf(b[i]!));

/** A cell's notes and its lap, in whole notes, on `meter`'s bench; null where the text doesn't compile or the cell plays no degrees of the key. */
function readCell(text: string, cell: string, meter: string): { notes: LineNote[]; lap: number; bar: number } | null {
  const result = compileSource(`${benchOf(meter)}\n${text}`, undefined, { resolve: resolveSeed });
  if (!result.ok) return null;
  const c = result.cells.get(cell);
  const bench = result.cells.get('bar')?.meter ?? null;
  if (!c?.step || !bench) return null;
  const whole = tapWhole(c.step.tap, bench);
  if (whole === null) return null;
  const shifts = codeShifts(result);
  const notes: LineNote[] = [];
  for (const e of flatten(result, cell, shifts)) {
    if (e.table !== 'key') return null;
    const { value, alter } = tapped(result, e, shifts);
    notes.push({ at: e.step * whole, degree: value + 0, alter: alter + 0 });
  }
  return { notes: notes.sort((a, b) => a.at - b.at || a.degree - b.degree), lap: c.steps * whole, bar: bench.pulses / bench.unit };
}

/** A note's token: its degree, and its accidental as `#` or `b`, one a semitone (decision 015). */
const tokenOf = (n: LineNote) => `${n.degree}${(n.alter > 0 ? '#' : 'b').repeat(Math.abs(n.alter))}`;

/**
 * Notes as a line of eighths over the key, `length` whole notes long: each note held to the next onset (`@n`), a
 * rest `~` before the first; null where a note falls between the eighths, or two start on one, which a form's splice
 * can't play.
 */
function eighthsText(cell: string, notes: readonly LineNote[], length: number): string | null {
  const slots = Math.round(length * 8);
  const at = notes.map((n) => n.at * 8);
  if (at.some((x) => Math.abs(x - Math.round(x)) > 1e-6)) return null;
  const steps = at.map(Math.round);
  if (new Set(steps).size !== steps.length) return null;
  const tokens: string[] = [];
  if (steps[0]! > 0) tokens.push(steps[0]! > 1 ? `~@${steps[0]}` : '~');
  steps.forEach((s, i) => {
    const held = (steps[i + 1] ?? slots) - s;
    tokens.push(held > 1 ? `${tokenOf(notes[i]!)}@${held}` : tokenOf(notes[i]!));
  });
  return `&${cell} over=&key step=8n ${tokens.join(' ')}`;
}

/**
 * A cell's notes written out as a line of eighths over the key, `cell` its name, as the Muse files what she heard: each
 * note held to the next, its lap the cell's. Null where the text doesn't compile on `meter`'s bench, the cell plays
 * other than degrees of the key, or a note falls between the eighths.
 */
export function writtenOut(text: string, cell: string, meter: string, as = cell): string | null {
  const read = readCell(text, cell, meter);
  return read && read.notes.length > 0 ? eighthsText(as, read.notes, read.lap) : null;
}

/** The notes within [from, from + length), from `from`. */
const window = (notes: readonly LineNote[], from: number, length: number) =>
  notes.filter((n) => n.at >= from - 1e-9 && n.at < from + length - 1e-9).map((n) => ({ ...n, at: n.at - from }));

/** Each library's motifs read on each meter, kept: the notes and the lap of each, which a segment is recognised as. */
type ReadMotif = { readonly id: string; readonly notes: LineNote[]; readonly lap: number; readonly bar: number };
const readMotifs = new WeakMap<readonly Fragment[], Map<string, ReadMotif[]>>();

function motifsRead(motifs: readonly Fragment[], meter: string): ReadMotif[] {
  const byMeter = readMotifs.get(motifs) ?? new Map<string, ReadMotif[]>();
  readMotifs.set(motifs, byMeter);
  if (!byMeter.has(meter))
    byMeter.set(
      meter,
      motifs.flatMap((m) => {
        const read = readCell(`&${m.id} from ${m.id} &key`, m.id, meter);
        return read ? [{ id: m.id, ...read }] : [];
      }),
    );
  return byMeter.get(meter)!;
}

/** A form's parts: its head, its helpers (its optional parameters) and its hole, from its signature. */
function partsOf(form: Fragment): { head: string; helpers: string[]; hole: string } | null {
  const signature = /^&(\w+) from (?:\(([^)]*)\) )?&(\w+)\s*$/m.exec(form.text);
  if (!signature) return null;
  const helpers = (signature[2] ?? '')
    .split(',')
    .map((h) => h.trim().replace(/^&/, ''))
    .filter(Boolean);
  return { head: signature[1]!, helpers, hole: signature[3]! };
}

/**
 * A line of several bars written as the form and the motifs that play it, or as it was: `line` is a text whose cell
 * `cell` plays degrees of the key (`over=&key`), read on `meter` (a signature, `4/4`).
 */
export function decompose(line: string, cell: string, meter: string, options: DecomposeOptions = {}): Decomposition {
  const forms = options.forms ?? FORM_FRAGMENTS;
  const motifs = options.motifs ?? MOTIF_FRAGMENTS;
  const asItWas: Decomposition = {
    text: line,
    form: null,
    call: null,
    helpers: {},
    structure: structureOf(line).total,
  };
  const target = readCell(line, cell, meter);
  if (!target || target.notes.length === 0) return asItWas;
  const { notes, lap, bar } = target;
  const bars = Math.round(lap / bar);
  if (Math.abs(lap - bars * bar) > 1e-9 || bars < 2) return asItWas;

  const known = motifsRead(motifs, meter);
  const motifOf = (segment: readonly LineNote[], length: number) => known.find((m) => Math.abs(m.lap - length) < 1e-9 && same(m.notes, segment))?.id ?? null;
  /** A segment's line, named as a seed motif's or as `name`: its text and the id it was found as. */
  const lineOf = (segment: readonly LineNote[], length: number, name: string) => {
    const id = motifOf(segment, length);
    if (id) return { name: id, text: `&${id} from ${id} &key`, id };
    const text = eighthsText(name, segment, length);
    return text ? { name, text, id: null } : null;
  };

  let best = asItWas;
  for (const form of forms) {
    const parts = partsOf(form);
    if (!parts) continue;
    for (let calls = 1; calls <= bars; calls++) {
      const length = (bars / calls) * bar;
      if (bars % calls !== 0) continue;
      const call = lineOf(window(notes, 0, length), length, `${cell}Call`);
      if (!call) continue;
      const play = (helpers: readonly { name: string; text: string; param: string }[]) => {
        const lines = [call.text, ...helpers.map((h) => h.text)];
        const args = helpers.length ? `(${helpers.map((h) => `${h.param}=&${h.name}`).join(', ')})` : '';
        const text = [...new Set(lines), `&${cell} from ${form.id}${args} &${call.name}`].join('\n');
        return { text, read: readCell(text, cell, meter) };
      };
      // (where each helper first sounds: the form played with a probe in its place, a line of degree 40 a call long)
      const firstAt = new Map<string, number>();
      for (const helper of parts.helpers) {
        const probe = { name: `${cell}Probe`, param: helper, text: `&${cell}Probe over=&key step=8n ${'40 '.repeat(Math.round(length * 8)).trim()}` };
        const at = play([probe]).read?.notes.find((n) => n.degree >= 30)?.at;
        if (at !== undefined) firstAt.set(helper, at);
      }
      // (every set of helpers to set, fewest first)
      const settable = parts.helpers.filter((h) => firstAt.has(h));
      for (let mask = 0; mask < 1 << settable.length; mask++) {
        const set = settable.filter((_, i) => mask & (1 << i));
        const helpers = set.map((param) => {
          const named = lineOf(window(notes, firstAt.get(param)!, length), length, `${cell}${param[0]!.toUpperCase()}${param.slice(1)}`);
          return named ? { ...named, param } : null;
        });
        if (helpers.some((h) => h === null)) continue;
        const { text, read } = play(helpers as { name: string; text: string; param: string; id: string | null }[]);
        if (!read || Math.abs(read.lap - lap) > 1e-9 || !same(read.notes, notes)) continue;
        const structure = structureOf(text).total;
        if (structure < best.structure)
          best = {
            text,
            form: form.id,
            call: call.id,
            helpers: Object.fromEntries((helpers as { param: string; id: string | null }[]).map((h) => [h.param, h.id])),
            structure,
          };
      }
    }
  }
  return best;
}
