/**
 * A text read back: where its bars start and the chord in force at each moment, with no line of the frontend's (#715). A
 * frontend that wants them added lines of its own to every text it compiled, a cell stepping `1m` and a voice, each read
 * through a MIDI card on channels it reserved, and found each bar's start in the notes of one and the chord in the other.
 * `readBack` writes those lines itself, under names the text doesn't use, as sound outputs that no card sends, compiles the
 * text with them, and returns the plan (to play the text's own notes: `notesOf`, none of them is one) with what they read.
 *
 * The bar starts are where the main meter's `1m` tap comes round, through its swing, bends and tempo, in seconds. The chord
 * is the notes a cell sounds through a voice on C4, as the cell is read through one (`[&harm * &voice]`): a played table turns
 * for the lines read through it (cells v0.6.0), so the cell named is read as the text plays it. No cell is read by its
 * name unless the caller names it (decision 075). Pure.
 */
import type { CompileOptions } from './program';
import { planOf } from './host';
import { declarations } from '../repository/fit';
import { noteOf } from './midi';
import { eventsBetween, type Plan } from './realize';

/** What a text read back is asked: the seconds read, the chord cell's name if one is to be read, and how its `from` lines resolve. */
export interface ReadBackOptions {
  /** The seconds read, from 0: the bar starts and chords before it. */
  readonly to: number;
  /** The cell to read as a chord (`&harm` or `harm`): none, none read. A name the text doesn't define reads none. */
  readonly chord?: string;
  /** How the text's `from` lines read (`CompileOptions.resolve`). */
  readonly resolve?: CompileOptions['resolve'];
}

/** The notes a cell sounds at one moment: the MIDI keys it sounds through a voice on C4, from `at` seconds. */
export interface ChordRead {
  readonly at: number;
  readonly notes: readonly number[];
}

/** A text compiled with its reading, and what was read: the plan, each bar's start in seconds, and the chords. */
export interface ReadBack {
  /** The plan of the text and its reading lines: the text's own notes are those of `notesOf`, the reading's none. */
  readonly plan: Plan;
  /** Where each bar starts, in seconds, in order, from the first. */
  readonly barStarts: readonly number[];
  /** The chord cell's notes at each moment it sounds, in order of time: the keys of one onset sorted. */
  readonly chords: readonly ChordRead[];
}

/** A name the text doesn't declare: `base`, else `base2`, … */
const unused = (taken: ReadonlySet<string>, base: string): string => {
  let name = base;
  for (let k = 2; taken.has(name); k++) name = `${base}${k}`;
  return name;
};

/** The reading's lines for a text: a bar tap, a voice for each, the sound outputs that play them, and the names it used. */
function readingFor(text: string, chord: string | undefined, readChord = true) {
  const taken = new Set(declarations(text).map((l) => l.name));
  const tap = unused(taken, '_barTap');
  const barV = unused(taken, '_barV');
  const chordV = unused(taken, '_chordV');
  const bars = unused(taken, '_bars');
  const chords = unused(taken, '_chords');
  const cell = chord?.replace(/^&/, '');
  const read = readChord && cell !== undefined;
  const lines = [
    `&${tap} step=1m 0`,
    `&${barV} loop=C4`,
    `&${bars} map=sample [&${tap} * &${barV}]`,
    ...(read ? [`&${chordV} loop=C4`, `&${chords} map=sample [&${cell} * &${chordV}]`] : []),
  ];
  return { lines, barV, chordV, read };
}

/**
 * The text compiled with its reading, and its bar starts and chords read from `0` to `to` seconds. The text is not changed: its
 * own notes are those `notesOf` gives of the plan, since the reading's outputs have no card.
 */
export function readBack(text: string, { to, chord, resolve }: ReadBackOptions): ReadBack {
  const compile = (readChord: boolean) => {
    const reading = readingFor(text, chord, readChord);
    return { ...reading, plan: planOf([text, ...reading.lines].join('\n'), undefined, resolve ? { resolve } : {}) };
  };
  let made = compile(true);
  // (a cell the text doesn't define, `from` lines included, is read as none: the text is compiled again without it)
  if (made.read && made.plan.result.unknown.some((u) => `&${u.name}` === `&${chord!.replace(/^&/, '')}`)) made = compile(false);
  const { plan, barV, chordV, read } = made;
  const events = eventsBetween(plan, 0, to, true).filter((e) => e.voice === barV || (read && e.voice === chordV));
  const barStarts = [...new Set(events.filter((e) => e.voice === barV).map((e) => e.at))].sort((a, b) => a - b);
  const byAt = new Map<number, number[]>();
  for (const e of events) if (e.voice === chordV) byAt.set(e.at, [...(byAt.get(e.at) ?? []), noteOf(e.freq).note]);
  return {
    plan,
    barStarts,
    chords: [...byAt].sort(([a], [b]) => a - b).map(([at, notes]) => ({ at, notes: notes.sort((a, b) => a - b) })),
  };
}
