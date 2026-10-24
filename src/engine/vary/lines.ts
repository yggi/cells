/**
 * A fragment's lines as Vary reads them (decision 052, point 2): each entry of a card's mix (a cell, or a product of cells
 * on one grid, `&euclid * &euclidLevel`), its notes on its own grid, and how a changed set of notes is written back into
 * the line's own braid as plain steps on that grid. Rung 1 reads the lines a drum part writes: steps that are rests or
 * hits of a voice (`&hh`, `&hh:0:.25`, `~!5`, a chord of hits `[&bd,&hh]`), a subsequence of them on one step
 * (`step=1m [&rim ~ ~ &rim …]`), or a Euclid of a voice (`&rim(5,16,4)`), each times at most one `map=amp` cell of
 * levels, one a step. Rung 2 reads the lines a pitched part writes: a cell of degrees of the table it reads (`over=&harm`)
 * times one voice (`&bass * &bassV`), its steps rests, whole numbers with at most one accidental (`0`, `-1`, `0!8`, `4b`,
 * `2#!2`) or another cell spliced in
 * (`&bassNext`, `&bassNext^$-1`, and as the operators write one back, `degree(inverse(&bassNext), 2)`) that plays one note
 * on its step. A line written any other way (`@`, a choice, two
 * accidentals, a subsequence of degrees) is not read, and so not varied. Pure.
 */
import { declWords, splitWords } from '../edit';
import { flatten } from '../flatten';
import { gmDrumNote } from '../midi';
import { noteValue, type Meter } from '../meter';
import { bjorklund } from '../parser/generators';
import { codeShifts, type CompileResult } from '../program';

/** One note of a line: its step on the line's grid, the voice it strikes, its own level as written, its level in all. */
export interface LineNote {
  readonly step: number;
  /** The voice, as written: `&hh` (a pitched line's: the voice it is a product with, `&bassV`). */
  readonly voice: string;
  /** Its own level as written (`.25` of `&hh:0:.25`), or null: none, at 1. */
  readonly own: string | null;
  /** Its level: its own times its level cell's at its step. */
  readonly level: number;
  /** A pitched line's note: what it plays; absent on a line of hits. */
  readonly pitch?: Pitch;
}

/**
 * A pitched note: its step as written (a degree, or a splice), then mirrored and moved by the operators, so it plays
 * `sign · value + by` degrees of the table it reads (`inverse(…)` mirrors a splice in its own table, `degree(…)` moves it
 * there, as the language reads them).
 */
export interface Pitch {
  /** As written: a degree (`2`), or the splice (`&bassNext^$-1`). */
  readonly written: number | string;
  readonly sign: 1 | -1;
  readonly by: number;
  /** What its step plays as written, as the compiler flattens it: the table read and its shift, the value, its accidental, its grid steps. */
  readonly table: string;
  readonly value: number;
  readonly alter: number;
  readonly transpose: number;
}

/** The pitch moved: mirrored (`sign` −1) and then moved `by` degrees, after what it already was. */
export const moved = (p: Pitch, sign: 1 | -1, by: number): Pitch => ({ ...p, sign: (p.sign * sign) as 1 | -1, by: p.by * sign + by });

/** What a pitch plays, for S2: its table, its degree there, its accidental and its grid steps. */
export const pitchKey = (p: Pitch): string => `${p.table}:${p.sign * p.value + p.by}:${p.sign * p.alter}:${p.transpose}`;

/**
 * A pitch's text: a degree as a number, its accidental kept and, mirrored, flipped (`4b` mirrored about 0 is `-4#`), as
 * `inverse(…)` reads one; a splice wrapped in `inverse(…)` and moved by `^n` (on a bare reference) or `degree(…, n)`.
 */
export function pitchText(p: Pitch): string {
  if (typeof p.written === 'number') {
    const alter = p.sign * p.alter;
    return `${p.sign * p.written + p.by}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}`;
  }
  const inner = p.sign === -1 ? `inverse(${p.written})` : p.written;
  if (p.by === 0) return inner;
  return /^&[A-Za-z_][A-Za-z0-9_]*$/.test(inner) ? `${inner}^${p.by}` : `degree(${inner}, ${p.by})`;
}

/** How a line's trigger is written: steps, a subsequence on one step, or a Euclid of one voice. */
type Form = 'steps' | 'seq' | 'euclid';

/** A line of a fragment's card, as read. */
export interface Line {
  /** The line, as the card names it: its trigger cell, `&hat` (a product's first cell, `&euclid`). */
  readonly name: string;
  /** Its trigger cell's name, bare. */
  readonly trigger: string;
  readonly form: Form;
  /** Its Euclid as written (its form `euclid`): k hits in n, turned right by r. */
  readonly euclid?: { readonly voice: string; readonly k: number; readonly n: number; readonly r: number };
  /** The card it is an entry of, bare, and that card's entries as written (`&euclid * &euclidLevel`), its own among them. */
  readonly card: { readonly name: string; readonly entries: readonly string[]; readonly entry: string };
  /** Its cell of levels (`map=amp`), bare, and its steps as written, one a step of the line; absent, none. */
  readonly levels?: { readonly cell: string; readonly tokens: readonly string[] };
  /** How many steps its lap holds: the grid it rotates on. */
  readonly steps: number;
  /** Its notes, in the order it plays them (by step, then pitch: `pitchOf`). */
  readonly notes: readonly LineNote[];
  /** A step's length in whole notes (its tap's, over a subsequence's steps), or null where its tap is none of the meter's. */
  readonly stepWhole: number | null;
  /** The meter it taps, or null. */
  readonly meter: Meter | null;
  /** A pitched line's table (its `over=`, bare) and voice: its notes carry their pitch; absent, a line of hits. */
  readonly pitched?: { readonly table: string | null; readonly voice: string };
}

/** A voice's pitch, as the lines are ordered by it: its General MIDI drum note, else past every drum. */
export const pitchOf = (voice: string): number => gmDrumNote(voice.slice(1)) ?? 128;

const REST = /^~(?:!(\d+))?$/;
const HIT = /^&([A-Za-z_][A-Za-z0-9_]*)(?::0(?::([0-9]*\.?[0-9]+))?)?(?:!(\d+))?$/;
const CHORD = /^\[([^[\]]*,[^[\]]*)\]$/;
const SEQ = /^\[([^[\],]*)\]$/;
const EUCLID = /^&([A-Za-z_][A-Za-z0-9_]*)\((\d+),\s*(\d+)(?:,\s*(-?\d+))?\)$/;
const NUMBER = /^([0-9]*\.?[0-9]+)(?:!(\d+))?$/;
const DEGREE = /^(-?\d+)[#b]?(?:!(\d+))?$/;
const REF = String.raw`&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?`;
/** A splice, as written or as an operator writes it back (`pitchText`): `&x`, `&x^$-1`, `inverse(&x)`, `degree(inverse(&x), 2)`. */
const SPLICE = new RegExp(String.raw`^(?:${REF}|inverse\(${REF}\)|degree\((?:${REF}|inverse\(${REF}\)),\s*-?\d+\))$`);

/** A step as read: the hits it strikes (none: a rest), each its voice and own level. */
type Step = readonly { readonly voice: string; readonly own: string | null }[];

/** One hit's text, `&hh` or `&hh:0:.25`, as its voice and own level; null where it is no hit. */
function hitOf(token: string): { voice: string; own: string | null } | null {
  const m = HIT.exec(token);
  return m && !m[3] ? { voice: `&${m[1]}`, own: m[2] ?? null } : null;
}

/** Steps as written (`~!5`, `&hh:0:.25`, `[&bd,&hh]`), each repeat its own step; null where one is none of these. */
function stepsOf(tokens: readonly string[]): Step[] | null {
  const out: Step[] = [];
  for (const token of tokens) {
    const rest = REST.exec(token);
    const hit = HIT.exec(token);
    const chord = CHORD.exec(token);
    if (rest) for (let i = 0; i < Number(rest[1] ?? 1); i++) out.push([]);
    else if (hit) for (let i = 0; i < Number(hit[3] ?? 1); i++) out.push([{ voice: `&${hit[1]}`, own: hit[2] ?? null }]);
    else if (chord) {
      const hits = chord[1]!.split(',').map((t) => hitOf(t.trim()));
      if (hits.some((h) => !h)) return null;
      out.push(hits as Step);
    } else return null;
  }
  return out;
}

/** Numbers as written, each repeat its own step; null where one isn't. */
function numbersOf(tokens: readonly string[]): string[] | null {
  const out: string[] = [];
  for (const token of tokens) {
    const m = NUMBER.exec(token);
    if (!m) return null;
    for (let i = 0; i < Number(m[2] ?? 1); i++) out.push(m[1]!);
  }
  return out;
}

/** The steps of n a Euclid strikes, turned right by r, as the parser reads `x(k,n,r)` (`parser/braid.ts`). */
export const euclidHits = (k: number, n: number, r: number): number[] => {
  const p = bjorklund(k, n);
  return Array.from({ length: n }, (_, j) => j).filter((j) => p[(((j - r) % n) + n) % n]);
};

/** A tap's length in whole notes on a meter: a note value (`16n`), a bar (`1m`), a pulse; null for any other. */
export function tapWhole(tap: string | undefined, meter: Meter | null): number | null {
  if (!tap || !meter) return null;
  const bar = meter.pulses / meter.unit;
  if (tap === '1m') return bar;
  if (tap === 'pulse') return 1 / meter.unit;
  return noteValue(tap);
}

/** A card's entries as written: `[&kick, &euclid * &euclidLevel]` → `&kick`, `&euclid * &euclidLevel`. */
function entriesOf(source: string, card: string): string[] {
  const braid = declWords(source, card)?.braid ?? [];
  if (braid.length !== 1 || !/^\[.*\]$/.test(braid[0]!)) return [];
  return braid[0]!
    .slice(1, -1)
    .split(',')
    .map((entry) => entry.trim());
}

/**
 * The lines of a fragment, read off its text and its compile (the fragment under its workbench): every entry of every
 * card (a MIDI card, a sound card) whose trigger is a cell this module reads, in the order the cards write them.
 */
export function linesOf(source: string, result: CompileResult): Line[] {
  const cards = [...result.cells.values()].filter((c) => (c.map?.kind === 'midi' || c.sink) && !c.implicit);
  const out: Line[] = [];
  for (const card of cards) {
    const entries = entriesOf(source, card.name);
    for (const entry of entries) {
      const factors = entry.split('*').map((f) => f.trim());
      const refs = factors.filter((f) => f.startsWith('&'));
      if (factors.some((f) => !/^&[A-Za-z_][A-Za-z0-9_]*$/.test(f) && !NUMBER.test(f))) continue;
      const cells = refs.map((r) => result.cells.get(r.slice(1)));
      if (cells.some((c) => !c)) continue;
      const levelCells = cells.filter((c) => c!.map?.kind === 'amp');
      const triggers = cells.filter((c) => c!.map?.kind !== 'amp');
      const voices = triggers.filter((c) => c!.voice);
      const at = { name: card.name, entries, entry };
      if (triggers.length === 2 && voices.length === 1 && !levelCells.length) {
        const line = pitchedLineOf(source, result, triggers.find((c) => !c!.voice)!.name, voices[0]!.name, at);
        if (line) out.push(line);
        continue;
      }
      if (triggers.length !== 1 || levelCells.length > 1) continue;
      const line = lineOf(source, result, triggers[0]!.name, levelCells[0]?.name, at);
      if (line) out.push(line);
    }
  }
  return out;
}

/** One line: its trigger cell and its cell of levels, read; null where either is written in a way this module doesn't read. */
function lineOf(source: string, result: CompileResult, trigger: string, levelCell: string | undefined, card: Line['card']): Line | null {
  const words = declWords(source, trigger);
  const cell = result.cells.get(trigger)!;
  if (!words || !cell.step) return null;
  const meter = result.cells.get(cell.step.driver)?.meter ?? null;
  const tap = tapWhole(cell.step.tap, meter);
  const isVoice = (voice: string) => !!result.cells.get(voice.slice(1))?.voice;
  let form: Form = 'steps';
  let steps: Step[] | null;
  let euclid: Line['euclid'];
  if (words.braid.length === 1 && EUCLID.test(words.braid[0]!)) {
    const [, voice, k, n, r] = EUCLID.exec(words.braid[0]!)!;
    form = 'euclid';
    euclid = { voice: `&${voice}`, k: Number(k), n: Number(n), r: Number(r ?? 0) };
    const hits = new Set(euclidHits(euclid.k, euclid.n, euclid.r));
    steps = Array.from({ length: euclid.n }, (_, j) => (hits.has(j) ? [{ voice: euclid!.voice, own: null }] : []));
  } else if (words.braid.length === 1 && SEQ.test(words.braid[0]!)) {
    form = 'seq';
    steps = stepsOf(splitWords(SEQ.exec(words.braid[0]!)![1]!));
  } else steps = stepsOf(words.braid);
  if (!steps?.length || steps.some((s) => s.some((h) => !isVoice(h.voice)))) return null;
  if (form === 'steps' && steps.length !== cell.steps) return null;
  let levels: Line['levels'];
  if (levelCell) {
    const tokens = numbersOf(declWords(source, levelCell)?.braid ?? []);
    if (!tokens || tokens.length !== steps.length) return null;
    levels = { cell: levelCell, tokens };
  }
  const notes = steps
    .flatMap((hits, step) => hits.map((h) => ({ step, voice: h.voice, own: h.own, level: Number(h.own ?? 1) * Number(levels?.tokens[step] ?? 1) })))
    .filter((n) => n.level > 0)
    .sort((a, b) => a.step - b.step || pitchOf(a.voice) - pitchOf(b.voice));
  return {
    name: `&${trigger}`,
    trigger,
    card,
    form,
    ...(euclid ? { euclid } : {}),
    ...(levels ? { levels } : {}),
    steps: steps.length,
    notes,
    stepWhole: tap === null ? null : form === 'steps' ? tap : tap / steps.length,
    meter,
  };
}

/**
 * A pitched line: a cell of degrees and splices times one voice. Each step is a rest or one note, which its flattened
 * events say it plays (one event, one step long); null where a step is written any other way or plays otherwise.
 */
function pitchedLineOf(source: string, result: CompileResult, trigger: string, voice: string, card: Line['card']): Line | null {
  const words = declWords(source, trigger);
  const cell = result.cells.get(trigger)!;
  if (!words || !cell.step) return null;
  const meter = result.cells.get(cell.step.driver)?.meter ?? null;
  const written: (number | string | null)[] = [];
  for (const token of words.braid) {
    const rest = REST.exec(token);
    const degree = DEGREE.exec(token);
    if (rest) for (let i = 0; i < Number(rest[1] ?? 1); i++) written.push(null);
    else if (degree) for (let i = 0; i < Number(degree[2] ?? 1); i++) written.push(Number(degree[1]));
    else if (SPLICE.test(token)) written.push(token);
    else return null;
  }
  if (!written.length || written.length !== cell.steps) return null;
  const events = flatten(result, trigger, codeShifts(result));
  const notes: LineNote[] = [];
  for (const [step, w] of written.entries()) {
    const at = events.filter((e) => Math.abs(e.step - step) < 1e-9);
    if (w === null ? at.length : at.length !== 1 || Math.abs(at[0]!.duration - 1) > 1e-9) return null;
    if (w === null) continue;
    const e = at[0]!;
    const pitch: Pitch = { written: w, sign: 1, by: 0, table: `${e.table}:${e.tableShift}`, value: e.value, alter: e.alter, transpose: e.transpose ?? 0 };
    notes.push({ step, voice: `&${voice}`, own: null, level: 1, pitch });
  }
  if (events.length !== notes.length) return null;
  return {
    name: `&${trigger}`,
    trigger,
    card,
    form: 'steps',
    steps: written.length,
    notes,
    stepWhole: tapWhole(cell.step.tap, meter),
    meter,
    pitched: { table: cell.over, voice: `&${voice}` },
  };
}

/** A hit's text: its voice, and its own level where it has one. */
const hitText = (n: { voice: string; own: string | null }) => (n.own === null ? n.voice : `${n.voice}:0:${n.own}`);

/**
 * A line with these notes, as the braids to write: each cell's tokens. Its steps as plain steps on its grid (a step of
 * two hits a chord, `[&bd,&hh]`); a subsequence or a Euclid as a subsequence on its one step, but a Euclid turned
 * (`rotated`), which stays a Euclid with the next turn. Its levels as given. A line left with no note leaves its card (a
 * product with nothing to sound is an error), its cell kept, all rests, so the fragment defines what it did; null where
 * the card would be left with no entry.
 */
export function written(line: Line, notes: readonly LineNote[], levels?: readonly string[], rotated = false): Map<string, string[]> | null {
  const out = new Map<string, string[]>();
  if (!notes.length) {
    const entries = line.card.entries.filter((e) => e !== line.card.entry);
    if (!entries.length) return null;
    out.set(line.card.name, [`[${entries.join(', ')}]`]);
  }
  if (line.euclid && rotated) {
    const { voice, k, n, r } = line.euclid;
    out.set(line.trigger, [`${voice}(${k},${n},${(r + 1) % n})`]);
  } else {
    const tokens = Array.from({ length: line.steps }, (_, step) => {
      const hits = notes.filter((n) => n.step === step).map((n) => (n.pitch ? pitchText(n.pitch) : hitText(n)));
      return hits.length === 0 ? '~' : hits.length === 1 ? hits[0]! : `[${hits.join(',')}]`;
    });
    out.set(line.trigger, line.form === 'steps' ? tokens : [`[${tokens.join(' ')}]`]);
  }
  if (line.levels && levels) out.set(line.levels.cell, [...levels]);
  return out;
}
