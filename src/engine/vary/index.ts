/**
 * Vary (decision 052): the ladder's variations as operators over a fragment's text, a fifth tool beside Migrate,
 * Normalise and Shorten, sharing their `Rewrite`. Where those promise the same notes (S1), Vary promises other notes
 * (S2-distinct from the source and from every variation before it), its anchors and its holes kept; so `rewriteAll`
 * never runs it. An operator gives **every** variation it can make and chooses none: a frontend picks one by a draw of
 * its own (`varied`), or shows them all. Which operators, which lines to leave alone (`keep`), when to vary and what to
 * file stay the frontend's.
 *
 * Rung 1 has the rhythm operators, each on one line of hits (an entry of a card's mix, `lines.ts`):
 *
 *  - **rotate**: every note one step later on the line's grid, the last wrapping to the first (a Euclid stays one, turned);
 *  - **drop**: one note left out, where the fragment keeps `fewest` notes;
 *  - **add**: a note of the voice the line strikes first, on a step that voice is silent on, at the line's loudest level.
 *
 * Rung 2 has the pitched operators, each on one pitched line (degrees of the table it reads, times a voice), around its
 * anchored notes (the roots on its chord changes, which keep their place and their pitch):
 *
 *  - **transpose**: every other note n degrees of its table, n each of `degrees` (−2, −1, 1, 2), as `&x^n` plays them;
 *  - **invert**: every other note mirrored about the line's first note f, in degrees, as `degree(inverse(&x), 2f)`, an
 *    accidental flipped as `inverse` flips it (`4b` about 0 is `-4#`); none where f is a splice or has an accidental;
 *  - **reverse**: the notes of each span between two anchored notes (the whole lap where there are none) in reverse
 *    order, as `&x[::-1]` reads a span;
 *  - **bend**: the last note moved to the note before it, n degrees of its table from it, n each of `BENDS` (−2, −1, 1,
 *    2), as `&x^n` plays the note before (the lead's bend, yggi/jambot#424);
 *  - **trim**: the last note left out, the note before it then held to the lap's end (a line holds a note to the next
 *    onset), where the line keeps `TRIM_FEWEST` notes (the lead's drop: a rhythm `drop` leaves any one note out).
 *
 * Each operator acts on the lines it is for: the rhythm ones on lines of hits, the pitched ones on pitched lines.
 * In Jambot's order (yggi/jambot `variations`, so its draws pick the same one): the lines in the order the lap first plays
 * them (by onset, then pitch), and for each its rotation, its drops in the order its notes play, its adds by step, then
 * its transpositions in the order of `degrees`, its inversion, its retrograde, its bends in the order of `BENDS`, its trim. None
 * plays the notes of its source or of one given before it (compared as its steps write them: each note's onset, length
 * and voice; nothing is compiled per variation), none strikes one sound twice at one onset, none keeps fewer than
 * `fewest` notes. The anchors (`anchors.ts`: the kick's line and the backbeat's), and the lines the frontend keeps, are
 * never varied. A variation rewrites only its line's braid (and its cell of levels), as plain steps on its own grid; beside
 * it, its reference (`reference.ts`, #293): the varied line as a form on the line it varies, `&hat[<<]`, `base=&hat =!6 ~`.
 * Pure.
 */
import { declarations } from '../../repository/fit';
import { compileSource } from '../compile';
import { flatten } from '../flatten';
import type { Meter } from '../meter';
import { codeShifts, type CompileResult } from '../program';
import { declWords, setBraid } from '../edit';
import { gmDrumNote } from '../midi';
import type { Rewrite } from '../rewrite';
import { anchorsAmong, type Anchor } from './anchors';
import { linesOf, moved, pitchKey, pitchOf, tapWhole, written, type Line, type LineNote } from './lines';
import { referenceOf, type Reference } from './reference';

export { backbeatOf, type Anchor } from './anchors';
export type { Reference } from './reference';

/** The operators: the rhythm ones (rung 1) and the pitched ones (rung 2). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse' | 'bend' | 'trim';

/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export const RHYTHM_OPERATORS: readonly Operator[] = ['rotate', 'drop', 'add'];

/** The pitched operators, in their order: for a bass, a lead. */
export const PITCHED_OPERATORS: readonly Operator[] = ['transpose', 'invert', 'reverse', 'bend', 'trim'];

/** Transposition's amounts where a frontend names none, in degrees of the table read. */
export const DEGREES: readonly number[] = [-2, -1, 1, 2];

/** A bend's amounts, in degrees of the table read from the note before the last: 1 or 2, either way (yggi/jambot#424). */
export const BENDS: readonly number[] = [-2, -1, 1, 2];

/** The fewest notes a trimmed line keeps: its last note left out, at least two stay (the lead's shapes, yggi/jambot#424). */
export const TRIM_FEWEST = 2;

/** One change to one line: a rewrite of the tool `vary`, whose `apply` gives the varied fragment. */
export interface Variation extends Rewrite<Operator> {
  /** The line it varies, as the card names it: `&hat`. */
  readonly line: string;
  /** For a frontmatter's `by:`: the operator, the line and its amount (a step, degrees), `drop &hat 6`, `rotate &hat`, `transpose &bass -1`. */
  readonly by: string;
  /**
   * The varied line as forms on the line it varies (#293), for a text that keeps what was varied: `&hat[<<]`,
   * `&bassline^-1`, `&hat[:6] ~ &hat[7:]`; absent where the line can't be spliced or the forms would be longer than the
   * line written out (`reference.ts`).
   */
  readonly reference?: Reference;
}

/** The frontend's policy: cells knows none of it. */
export interface VaryOptions {
  /** The text the fragment is read under (the host's `&bar`, `key`, `&harm`): its meter sets the backbeat, its harmony the roots. */
  readonly workbench?: string;
  /** Which operators, in this order for each line; by default the rhythm ones. */
  readonly operators?: readonly Operator[];
  /** Lines left alone for the frontend's own reasons, beside the anchors (Jambot: `&fill`). */
  readonly keep?: readonly string[];
  /** The fewest notes the fragment keeps over its lap (Jambot: 3, `GROOVE_FEWEST`); by default 1. */
  readonly fewest?: number;
  /** Transposition's amounts, in degrees of the table read; by default −2, −1, 1, 2. */
  readonly degrees?: readonly number[];
}

/** A fragment read under its workbench: the workbench's lines it doesn't write itself, then its own. */
function read(fragment: string, workbench = ''): { lines: Line[]; anchors: Anchor[]; result: CompileResult | null; own: ReadonlySet<string> } {
  const own = new Set(declarations(fragment).map((l) => l.name));
  const bench = declarations(workbench)
    .filter((l) => !own.has(l.name))
    .map((l) => l.written);
  const text = [...bench, fragment].join('\n');
  const result = compileSource(text);
  if (!result.ok) return { lines: [], anchors: [], result: null, own };
  const lines = linesOf(text, result);
  return { lines, anchors: anchorsAmong(lines, result), result, own };
}

/** A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line, the backbeat's, the roots on chord changes. */
export const anchorsOf = (fragment: string, workbench?: string): readonly Anchor[] => read(fragment, workbench).anchors;

/** A line's name as an option may write it: `&fill` or `fill`. */
const named = (name: string) => (name.startsWith('&') ? name : `&${name}`);

/** Every variation by one operator on one line, in Jambot's order, none playing the notes of its source or of one before it. */
export const variations = (fragment: string, options?: VaryOptions): readonly Variation[] => readVariations(fragment, options).variations.map((v) => v.variation);

/**
 * One note as recognition compares it (#224, decision 055): its onset in whole notes from its lap's start (null where
 * its line's grid is none of the meter's, its line's own step then in `key`), and the rest of what it is for S2: its
 * length (its line's step), the sound it strikes (a drum's General MIDI note, else its voice) and a pitched note's pitch,
 * its voice by its place among the pitched voices (`&bassV` is the first), as S1 numbered voices before decision 057.
 */
export interface HeardNote {
  readonly at: number | null;
  readonly key: string;
}

/**
 * A fragment's notes on its workbench and each variation's, as recognition compares them, with the lap they come round
 * after and the bar, in whole notes (null where a line's grid is none of the meter's). A harmony the fragment defines
 * itself (a braid of stacks no card plays, `&harm`) counts its chords' degrees as notes, beside its lines, so a vamp is
 * recognised as a bass line is. Null notes where the fragment doesn't compile on its workbench. One compile, as
 * `variations`.
 */
export interface Readings {
  readonly notes: readonly HeardNote[] | null;
  readonly span: number | null;
  readonly bar: number | null;
  readonly variations: readonly { readonly variation: Variation; readonly notes: readonly HeardNote[] }[];
}

/** `variations`, each with its notes as recognition compares them, and the source's. */
export function readVariations(fragment: string, options: VaryOptions = {}): Readings {
  const { workbench, operators = RHYTHM_OPERATORS, keep = [], fewest = 1, degrees = DEGREES } = options;
  const { lines, anchors, result, own } = read(fragment, workbench);
  if (!result) return { notes: null, span: null, bar: null, variations: [] };
  const left = new Set([...anchors.filter((a) => a.step === undefined).map((a) => a.line), ...keep.map(named)]);
  const pinned = (line: Line, n: LineNote) => anchors.some((a) => a.line === line.name && a.step === n.step);
  // (each note's onset in whole notes where its line's grid is the meter's, else its line's own step; its sound, the
  // drum note it strikes or its voice; and what a note is for S2: its onset, length and voice, and a pitched note's pitch)
  const onset = (i: number, step: number) => {
    const w = lines[i]!.stepWhole;
    return w === null ? `${i}@${step}` : (step * w).toFixed(9);
  };
  const sound = (voice: string) => String(gmDrumNote(voice.slice(1)) ?? voice);
  const pitch = (n: LineNote) => (n.pitch ? ` ${pitchKey(n.pitch)}` : '');
  const keysOf = (i: number, notes: readonly LineNote[]) => notes.map((n) => `${onset(i, n.step)} ${lines[i]!.stepWhole ?? i} ${n.voice}${pitch(n)}`);
  const strikesOf = (i: number, notes: readonly LineNote[]) => notes.map((n) => `${onset(i, n.step)} ${sound(n.voice)}${pitch(n)}`);
  const places = new Map([...new Set(lines.flatMap((l) => (l.pitched ? [l.pitched.voice] : [])))].map((v, k) => [v, `voice#${k}`]));
  const heardOf = (i: number, notes: readonly LineNote[]): HeardNote[] => {
    const { stepWhole, name } = lines[i]!;
    return notes.map((n) => {
      const what = `${stepWhole ?? name} ${n.pitch ? `${places.get(n.voice)} ${pitchKey(n.pitch)}` : sound(n.voice)}`;
      return stepWhole === null ? { at: null, key: `${name}@${n.step} ${what}` } : { at: n.step * stepWhole, key: what };
    });
  };
  const heardKeys = lines.map((l, i) => heardOf(i, l.notes));
  const chords = harmoniesOf(result, own, lines);
  const laps = [...lines.map((l) => (l.stepWhole === null ? null : l.steps * l.stepWhole)), ...chords.map((h) => h.lap)];
  const meter = lines.find((l) => l.meter)?.meter ?? chords.find((h) => h.meter)?.meter ?? null;
  const span = laps.length && laps.every((l) => l !== null) ? laps.reduce((a, b) => lcm(a!, b!)) : null;
  const bar = meter ? meter.pulses / meter.unit : null;
  const fixed = chords.flatMap((h) => h.notes);
  const noteKeys = lines.map((l, i) => keysOf(i, l.notes));
  const strikeKeys = lines.map((l, i) => strikesOf(i, l.notes));
  const total = lines.reduce((sum, l) => sum + l.notes.length, 0);
  // (the other lines' keys sorted, and their strikes, once for each line: a candidate's signature merges its line's keys
  // into them, and its strikes are checked against them, rather than sorting and counting every line's again)
  const others = new Map<number, { keys: readonly string[]; strikes: ReadonlySet<string> | null }>();
  const othersOf = (i: number) => {
    let o = others.get(i);
    if (!o) {
      const strikes = lines.flatMap((_, j) => (j === i ? [] : strikeKeys[j]!));
      const set = new Set(strikes);
      o = { keys: lines.flatMap((_, j) => (j === i ? [] : noteKeys[j]!)).sort(), strikes: set.size < strikes.length ? null : set };
      others.set(i, o);
    }
    return o;
  };
  const signature = (i: number, notes: readonly LineNote[]) => {
    const a = othersOf(i).keys;
    const b = i < 0 ? [] : keysOf(i, notes).sort();
    const merged: string[] = [];
    let x = 0;
    let y = 0;
    while (x < a.length || y < b.length) merged.push(y >= b.length || (x < a.length && a[x]! <= b[y]!) ? a[x++]! : b[y++]!);
    return merged.join('|');
  };
  /** Whether a candidate on line `i` strikes no sound twice at an onset. */
  const struckOnce = (i: number, notes: readonly LineNote[]) => {
    const other = othersOf(i).strikes;
    if (!other) return false;
    const mine = new Set<string>();
    for (const k of strikesOf(i, notes)) {
      if (other.has(k) || mine.has(k)) return false;
      mine.add(k);
    }
    return true;
  };
  const seen = new Set([signature(-1, [])]);

  const out: { variation: Variation; notes: HeardNote[] }[] = [];
  const words = new Map<string, ReturnType<typeof declWords>>();
  const wordsOf = (name: string) => {
    if (!words.has(name)) words.set(name, declWords(fragment, name));
    return words.get(name)!;
  };
  /** A candidate kept where it is a variation: enough notes, no sound struck twice at an onset, other notes than any before. */
  const offer = (
    i: number,
    operator: Operator,
    notes: readonly LineNote[],
    amount: number | null,
    braids: Map<string, string[]> | null,
    what: string,
    about: number | null = amount,
  ) => {
    if (!braids || total - lines[i]!.notes.length + notes.length < fewest) return;
    if (!struckOnce(i, notes)) return;
    const sig = signature(i, notes);
    if (seen.has(sig)) return;
    seen.add(sig);
    const line = lines[i]!.name;
    const code = (name: string, braid?: readonly string[]) => {
      const w = wordsOf(name);
      return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
    };
    // (its reference: the line's anchored steps kept, but for an inversion the ones its mirror leaves where they are)
    const own = wordsOf(lines[i]!.trigger);
    const pins = new Set(
      lines[i]!.notes.filter((n) => pinned(lines[i]!, n) && !(operator === 'invert' && n.pitch?.written === (about ?? 0) / 2 && !n.pitch.alter)).map((n) => n.step),
    );
    const reference = own && referenceOf(lines[i]!, own.braid, own.attrs, operator, notes, pins, about);
    const variation: Variation = {
      id: `vary:${operator}:${line}${amount === null ? '' : `:${amount}`}:${out.length}`,
      tool: 'vary',
      rule: operator,
      title: `${line}: ${what}`,
      before: [...braids.keys()].map((name) => code(name)).join('\n'),
      after: [...braids].map(([name, braid]) => code(name, braid)).join('\n'),
      apply: (source) => [...braids].reduce((text, [name, braid]) => setBraid(text, name, braid), source),
      line,
      by: `${operator} ${line}${amount === null ? '' : ` ${amount}`}`,
      ...(reference ? { reference } : {}),
    };
    out.push({ variation, notes: [...lines.flatMap((_, j) => (j === i ? heardOf(i, notes) : heardKeys[j]!)), ...fixed] });
  };

  const inOrder = (notes: LineNote[]) => notes.sort((a, b) => a.step - b.step || pitchOf(a.voice) - pitchOf(b.voice));
  const first = (i: number) => {
    const n = lines[i]!.notes[0]!;
    return [n.step * (lines[i]!.stepWhole ?? 1), pitchOf(n.voice)] as const;
  };
  const order = lines
    .map((_, i) => i)
    .filter((i) => lines[i]!.notes.length > 0 && !left.has(lines[i]!.name))
    .sort((a, b) => first(a)[0] - first(b)[0] || first(a)[1] - first(b)[1]);
  for (const i of order) {
    const line = lines[i]!;
    const levels = line.levels?.tokens;
    // (the last note in time, and the one before it: what bend and trim act on, unless the last is anchored)
    const [before, last] = line.notes.slice(-2);
    const ends = line.notes.length >= 2 && !pinned(line, last!);
    for (const operator of operators) {
      if (PITCHED_OPERATORS.includes(operator) !== !!line.pitched) continue;
      // (a line with a held note is moved in pitch alone: reverse, bend and trim would move where its notes fall and end)
      if (line.notes.some((n) => n.hold) && !['transpose', 'invert'].includes(operator)) continue;
      if (operator === 'bend') {
        if (ends)
          for (const n of BENDS) {
            const notes = line.notes.map((x) => (x === last ? { ...x, pitch: moved(before!.pitch!, 1, n) } : x));
            offer(
              i,
              operator,
              notes,
              n,
              written(line, notes),
              `its last note bent to ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'} ${n > 0 ? 'above' : 'below'} the one before it`,
            );
          }
      } else if (operator === 'trim') {
        if (!ends || line.notes.length - 1 < TRIM_FEWEST) continue;
        const notes = line.notes.filter((x) => x !== last);
        offer(i, operator, notes, last!.step, written(line, notes), `its last note, on step ${last!.step}, left out: the one before it held`);
      } else if (operator === 'transpose')
        for (const n of degrees) {
          const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch!, 1, n) }));
          offer(i, operator, notes, n, written(line, notes), `every note ${n > 0 ? 'up' : 'down'} ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'}`);
        }
      else if (operator === 'invert') {
        // (about its first note's degree: a first note that is a splice, or bent off it by an accidental, is no axis)
        const { written: f, alter } = line.notes[0]!.pitch!;
        if (typeof f !== 'number' || alter) continue;
        const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch!, -1, 2 * f) }));
        offer(i, operator, notes, null, written(line, notes), `every note mirrored about its first`, 2 * f);
      } else if (operator === 'reverse') {
        const notes = inOrder(reversed(line, (n) => pinned(line, n)));
        offer(i, operator, notes, null, written(line, notes), 'its notes in reverse order between its anchors');
      } else if (operator === 'rotate') {
        const notes = inOrder(line.notes.map((n) => ({ ...n, step: (n.step + 1) % line.steps })));
        const turned = levels && [levels.at(-1)!, ...levels.slice(0, -1)];
        offer(i, operator, notes, null, written(line, notes, turned, true), 'every note a step later, the last to the first');
      } else if (operator === 'drop')
        for (const dropped of line.notes) {
          const notes = line.notes.filter((n) => n !== dropped);
          offer(i, operator, notes, dropped.step, written(line, notes), `its ${dropped.voice} on step ${dropped.step} left out`);
        }
      else {
        const voice = line.notes[0]!.voice;
        const loudest = line.notes.reduce((a, b) => (b.level > a.level ? b : a));
        for (let step = 0; step < line.steps; step++) {
          if (line.notes.some((n) => n.step === step && sound(n.voice) === sound(voice))) continue;
          const notes = inOrder([...line.notes, { step, voice, own: loudest.own, level: loudest.level }]);
          const louder = levels && levels.map((t, s) => (s === step ? levels[loudest.step]! : t));
          offer(i, operator, notes, step, written(line, notes, louder), `a ${voice} on step ${step}, as loud as its loudest`);
        }
      }
    }
  }
  return { notes: [...heardKeys.flat(), ...fixed], span, bar, variations: out };
}

/** The least common multiple of two laps in whole notes, on a grid of 1/3840 of one (every tap's, triplets and fives too). */
function lcm(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  const [x, y] = [Math.round(a * 3840), Math.round(b * 3840)];
  return x && y ? ((x / gcd(x, y)) * y) / 3840 : Math.max(a, b);
}

/**
 * The harmonies a fragment defines itself: each cell of its own that no line plays, stepped on the meter, some step of
 * which is a stack (`[0,2,4]`); its chords' degrees as notes (its name, the table it reads, the degree, its accidental),
 * each a step long, its lap and its meter.
 */
function harmoniesOf(result: CompileResult, own: ReadonlySet<string>, lines: readonly Line[]): { notes: HeardNote[]; lap: number; meter: Meter | null }[] {
  const played = new Set(lines.flatMap((l) => [l.trigger, l.card.name, ...(l.levels ? [l.levels.cell] : [])]));
  const out: { notes: HeardNote[]; lap: number; meter: Meter | null }[] = [];
  for (const name of own) {
    const cell = result.cells.get(name);
    if (!cell?.step || played.has(name) || cell.voice) continue;
    const meter = result.cells.get(cell.step.driver)?.meter ?? null;
    const whole = tapWhole(cell.step.tap, meter);
    if (whole === null) continue;
    const events = flatten(result, name, codeShifts(result));
    const at = new Map<number, number>();
    for (const e of events) at.set(e.step, (at.get(e.step) ?? 0) + 1);
    if (![...at.values()].some((n) => n > 1)) continue;
    const k = out.length;
    const notes = events.map((e) => ({ at: e.step * whole, key: `${whole * e.duration} chords#${k} ${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}` }));
    out.push({ notes, lap: cell.steps * whole, meter });
  }
  return out;
}

/**
 * A line's notes reversed within each span between two anchored notes, cyclically (the whole lap where none is
 * anchored): the step of each free place takes what the span's mirror place held, a rest or a note.
 */
function reversed(line: Line, anchored: (n: LineNote) => boolean): LineNote[] {
  const at = new Map(line.notes.map((n) => [n.step, n]));
  const fixed = line.notes.filter(anchored).map((n) => n.step);
  const spans: number[][] = [];
  if (!fixed.length) spans.push(Array.from({ length: line.steps }, (_, s) => s));
  else
    for (const [k, start] of fixed.entries()) {
      const end = fixed[(k + 1) % fixed.length]! + (k + 1 === fixed.length ? line.steps : 0);
      spans.push(Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % line.steps));
    }
  const out = line.notes.filter(anchored);
  for (const span of spans)
    for (const [j, step] of span.entries()) {
      const n = at.get(span[span.length - 1 - j]!);
      if (n) out.push({ ...n, step });
    }
  return out;
}

/** The index a draw in [0, 1) takes of n: ⌊draw · n⌋, the one Jambot's `pick(draw, ones)` takes for every draw. */
export function drawn(draw: number, n: number): number {
  if (!(draw >= 0 && draw < 1)) throw new Error(`varied: draw ${draw} is outside [0, 1)`);
  return Math.floor(draw * n);
}

/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null {
  drawn(draw, 1);
  const all = variations(fragment, options);
  return all.length ? all[drawn(draw, all.length)]! : null;
}
