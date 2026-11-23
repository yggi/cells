/**
 * A fragment's progressions as Vary reads them (decision 052, point 8, rung 3): the line one level up (#51). A
 * progression is a harmony the fragment defines itself, a cell no line plays, stepped on the meter, each step a stack of
 * degrees of the table it reads (`&harm over=&key step=1m cycle=8 [0,2,4] [5,7,9]`), a run of one written `!n`, or a
 * step's two halves, a subsequence of two stacks (`[[1,3,5] [4,6#,8]]`). A tone is a whole degree with at most one
 * accidental (`6#`, `1b`). A progression written any other way (a rest, a splice, a hold, a choice) is not read, and so
 * not varied.
 *
 * Its anchor is the cadence: every step that sounds in the last bar of a four-bar phrase (bars 4, 8, 12 … of a lap that
 * is a multiple of four bars), else in the lap's last bar. Around it, four operators, each giving every variation it can:
 *
 *  - **rotate**: each span between two cadence steps one step later, its last step to its first (the line's rotate, a
 *    level up);
 *  - **reverse**: each span between two cadence steps in reverse order (the line's retrograde, a level up);
 *  - **third**: one step's chord moved a third, every tone n degrees, n each of `THIRDS` (−2, 2): I to vi or iii;
 *  - **dominant**: the secondary dominant of the next step's chord on the second half of a step (Jambot's `themes.ts` at
 *    high harmony): a major triad a fifth above the next chord's root, a dominant seventh where that chord has four tones
 *    or more, each tone the stack's degree with the accidental that makes it so; none where the next chord is the same
 *    root, a diminished triad, or the step's chord is already its dominant.
 *
 * `third` and `dominant` act on a step that holds one chord. Pure.
 */
import { declWords } from '../edit';
import { resolveIn } from '../helix';
import type { Meter } from '../meter';
import { codeShifts, type CompileResult } from '../program';
import { tapWhole } from './lines';

/** A tone of a stack: a degree of the table read, and its accidental in the table's grid steps (−1, 0, 1). */
export interface Tone {
  readonly degree: number;
  readonly alter: number;
}

/** A chord: its tones, as written. */
export type Chord = readonly Tone[];

/** A progression's step: one chord, or its two halves. */
export type Slot = readonly Chord[];

/** A progression as read: its cell, the table its degrees read, its steps on the meter, each a slot. */
export interface Progression {
  /** Its cell, as a line is named: `&harm`. */
  readonly name: string;
  /** The table it reads, bare: `key`. */
  readonly table: string;
  readonly slots: readonly Slot[];
  /** A step's length in whole notes. */
  readonly stepWhole: number;
  readonly meter: Meter | null;
  /** Its steps that sound in a cadence bar: no operator moves them. */
  readonly cadence: readonly number[];
}

/** A progression's candidate variation: the operator, its amounts (for `by`), its slots, and what it does, in words. */
export interface Candidate {
  readonly operator: 'rotate' | 'reverse' | 'third' | 'dominant';
  readonly amounts: readonly number[];
  readonly slots: readonly Slot[];
  readonly what: string;
}

/** A third's amounts, in degrees of the table read: a third down, a third up. */
export const THIRDS: readonly number[] = [-2, 2];

/** The bars of a phrase whose last bar cadences. */
export const PHRASE_BARS = 4;

const TONE = /^(-?\d+)([#b])?$/;
const STACK = /^\[(-?\d+[#b]?(?:,-?\d+[#b]?)+)\]$/;
const HALVES = /^\[(\[[^[\]]+\])\s+(\[[^[\]]+\])\]$/;
const RUN = /^(.*?)(?:!(\d+))?$/;

function chordOf(text: string): Chord | null {
  const m = STACK.exec(text);
  if (!m) return null;
  const tones: Tone[] = [];
  for (const t of m[1]!.split(',')) {
    const n = TONE.exec(t)!;
    tones.push({ degree: Number(n[1]), alter: n[2] === '#' ? 1 : n[2] === 'b' ? -1 : 0 });
  }
  return tones;
}

/** A step's token as a slot (`[0,2,4]`, `[[1,3,5] [4,6#,8]]`), and how many steps it runs (`!n`); null where it is neither. */
function slotOf(token: string): { slot: Slot; run: number } | null {
  const [, body, run] = RUN.exec(token)!;
  const halves = HALVES.exec(body!);
  const slot = halves ? [chordOf(halves[1]!), chordOf(halves[2]!)] : [chordOf(body!)];
  if (slot.some((c) => c === null)) return null;
  return { slot: slot as Chord[], run: run ? Number(run) : 1 };
}

const toneText = (t: Tone) => `${t.degree}${t.alter > 0 ? '#' : t.alter < 0 ? 'b' : ''}`;
const chordText = (c: Chord) => `[${c.map(toneText).join(',')}]`;
const slotText = (s: Slot) => (s.length === 1 ? chordText(s[0]!) : `[${s.map(chordText).join(' ')}]`);

/** A progression's steps as a braid: each slot's text, a run of one written `!n`. */
export function progressionBraid(slots: readonly Slot[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < slots.length;) {
    const text = slotText(slots[i]!);
    let n = 1;
    while (i + n < slots.length && slotText(slots[i + n]!) === text) n++;
    out.push(n > 1 ? `${text}!${n}` : text);
    i += n;
  }
  return out;
}

/**
 * The progressions among a fragment's own cells: each a harmony no line plays (`played`), stepped on the meter, some
 * step of which is a stack, its braid read as slots. Those written otherwise are left out.
 */
export function progressionsOf(text: string, result: CompileResult, own: ReadonlySet<string>, played: ReadonlySet<string>): Progression[] {
  const out: Progression[] = [];
  for (const name of own) {
    const cell = result.cells.get(name);
    if (!cell?.step || played.has(name) || cell.voice) continue;
    const meter = result.cells.get(cell.step.driver)?.meter ?? null;
    const stepWhole = tapWhole(cell.step.tap, meter);
    const words = declWords(text, name);
    const over = words?.attrs.find((a) => a.startsWith('over=&'))?.slice('over=&'.length);
    if (stepWhole === null || !words || !over || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(over)) continue;
    const slots: Slot[] = [];
    let read = true;
    for (const token of words.braid) {
      const s = slotOf(token);
      if (!s) {
        read = false;
        break;
      }
      for (let k = 0; k < s.run; k++) slots.push(s.slot);
    }
    if (!read || !slots.length || slots.length !== cell.steps) continue;
    out.push({ name: `&${name}`, table: over, slots, stepWhole, meter, cadence: cadenceOf(slots.length, stepWhole, meter) });
  }
  return out;
}

/** The steps that sound in a cadence bar: the last of each four-bar phrase in a lap of 4k bars, else the lap's last. */
function cadenceOf(steps: number, stepWhole: number, meter: Meter | null): number[] {
  const bar = meter ? meter.pulses / meter.unit : 1;
  const lap = (steps * stepWhole) / bar;
  const whole = Math.abs(lap - Math.round(lap)) < 1e-9 ? Math.round(lap) : null;
  const bars = whole !== null && whole % PHRASE_BARS === 0 ? Array.from({ length: whole / PHRASE_BARS }, (_, k) => (k + 1) * PHRASE_BARS - 1) : [Math.ceil(lap) - 1];
  const eps = 1e-9;
  return Array.from({ length: steps }, (_, s) => s).filter((s) => {
    const [from, to] = [(s * stepWhole) / bar, ((s + 1) * stepWhole) / bar];
    return bars.some((b) => from < b + 1 - eps && to > b + eps);
  });
}

/** A progression's chords as recognition compares them: each tone at its onset, keyed as `harmoniesOf` keys an event. */
export function progressionNotes(p: Progression, slots: readonly Slot[], k: number): { at: number; key: string }[] {
  return slots.flatMap((slot, step) =>
    slot.flatMap((chord, h) => {
      const length = p.stepWhole / slot.length;
      return chord.map((t) => ({ at: step * p.stepWhole + h * length, key: `${length} chords#${k} ${p.table}:0:${t.degree}:${t.alter}:0` }));
    }),
  );
}

/** What a progression plays, for S2: each chord's onset and length, its tones sorted as they sound. */
export function progressionKey(p: Progression, slots: readonly Slot[]): string {
  return slots
    .map((slot, step) =>
      slot
        .map(
          (chord, h) =>
            `${step}.${h}/${slot.length}:${[...chord]
              .map((t) => `${t.degree}${t.alter}`)
              .sort()
              .join(',')}`,
        )
        .join(' '),
    )
    .join('|');
}

/** Each span between two cadence steps, cyclically (the whole lap where there is none). */
function spansOf(p: Progression): number[][] {
  const n = p.slots.length;
  if (!p.cadence.length) return [Array.from({ length: n }, (_, s) => s)];
  return p.cadence.map((start, k) => {
    const end = p.cadence[(k + 1) % p.cadence.length]! + (k + 1 === p.cadence.length ? n : 0);
    return Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % n);
  });
}

/** The slots with each span's places filled from `place` (the span and a place in it to the place it takes). */
function respanned(p: Progression, place: (span: readonly number[], j: number) => number): Slot[] {
  const slots = [...p.slots];
  for (const span of spansOf(p)) for (const [j, step] of span.entries()) slots[step] = p.slots[span[place(span, j)]!]!;
  return slots;
}

/**
 * Every candidate variation of a progression by the operators asked, in their order: for each, its rotation, its
 * retrograde, its thirds by step and then by `THIRDS`, its dominants by step. Each moves no cadence step. Whether a
 * candidate plays other notes than its source and the ones before it is the caller's to judge.
 */
export function progressionCandidates(p: Progression, operators: readonly string[], result: CompileResult): Candidate[] {
  const out: Candidate[] = [];
  const free = (s: number) => !p.cadence.includes(s);
  const shifts = codeShifts(result);
  const at = (degree: number, alter = 0) => resolveIn(result, p.table, 0, degree, alter, shifts).position;
  for (const operator of operators) {
    if (operator === 'rotate')
      out.push({ operator, amounts: [], slots: respanned(p, (span, j) => (j + span.length - 1) % span.length), what: 'each phrase a step later, its last chord to its first' });
    else if (operator === 'reverse')
      out.push({ operator, amounts: [], slots: respanned(p, (span, j) => span.length - 1 - j), what: 'each phrase in reverse order, the cadences kept' });
    else if (operator === 'third')
      p.slots.forEach((slot, s) => {
        if (!free(s) || slot.length !== 1) return;
        for (const n of THIRDS) {
          const slots = [...p.slots];
          slots[s] = [slot[0]!.map((t) => ({ ...t, degree: t.degree + n }))];
          out.push({ operator, amounts: [s, n], slots, what: `its chord on step ${s} a third ${n > 0 ? 'up' : 'down'}` });
        }
      });
    else if (operator === 'dominant')
      p.slots.forEach((slot, s) => {
        if (!free(s) || slot.length !== 1) return;
        const here = slot[0]!;
        const next = p.slots[(s + 1) % p.slots.length]![0]!;
        const dominant = dominantOf(next, here, at);
        if (!dominant) return;
        const slots = [...p.slots];
        slots[s] = [here, dominant];
        out.push({ operator, amounts: [s], slots, what: `the dominant of the next chord on step ${s}'s second half` });
      });
  }
  return out;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** Whether two pitches, in semitones, are one pitch class. */
const samePitchClass = (a: number, b: number) => near((((a - b + 0.5) % 12) + 12) % 12, 0.5);

/**
 * The secondary dominant of `target`: the stack on the degree a fifth above its root (root + 4) or a fourth below it
 * (root − 3), whichever lies nearer the chord before it (`here`), each tone the stack's degree with the accidental, at
 * most one, that puts it 0, 4, 7 (and 10, for a target of four tones or more) semitones above the fifth over the target's
 * root. Null where `here` is on the target's root or already its dominant's, the target is diminished, or a tone needs
 * more than one accidental.
 */
function dominantOf(target: Chord, here: Chord, at: (degree: number, alter?: number) => number): Chord | null {
  const [root, third, fifth] = target;
  if (!root || !third || !fifth) return null;
  const base = at(root.degree, root.alter);
  const from = at(here[0]!.degree, here[0]!.alter);
  if (samePitchClass(from, base) || samePitchClass(from, base + 7) || near(at(fifth.degree, fifth.alter) - base, 6)) return null;
  const intervals = target.length >= 4 ? [0, 4, 7, 10] : [0, 4, 7];
  const spelled = (first: number, five: number): Tone[] | null => {
    const tones: Tone[] = [];
    for (const [k, iv] of intervals.entries()) {
      const degree = first + 2 * k;
      const alter = [0, 1, -1].find((a) => near(at(degree, a), five + iv));
      if (alter === undefined) return null;
      tones.push({ degree, alter });
    }
    return tones;
  };
  const ways = [spelled(root.degree + 4, base + 7), spelled(root.degree - 3, base - 5)].filter((t): t is Tone[] => t !== null);
  const away = (t: Tone[]) => Math.abs(at(t[0]!.degree, t[0]!.alter) - from);
  return ways.sort((a, b) => away(a) - away(b))[0] ?? null;
}
