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
 * Rung 3 has a progression's operators (`progression.ts`, decision 052, point 8): a harmony the fragment defines, varied
 * as a line one level up around its cadence (the last bar of each four-bar phrase): rotate and reverse each phrase, a
 * chord moved a third (`third`), a secondary dominant on a step's second half (`dominant`), two adjacent chords swapped
 * (`swap`), a chord replaced by another it holds (`substitute`); only where a frontend asks
 * for one of the slot levels' own, after every line. `variationBy` gives back one variation from its `by:` (point 9).
 *
 * Point 10 has a form's (`form.ts`): a form's letters or a song plan's sections (with its plan of who plays, carried slot
 * for slot), varied two levels up around its first and last slot. The operators a progression and a form share are one
 * set, `slots.ts` (rotate, reverse, swap, substitute), and a frontend's mask (`fixed`) fixes other slots at any scale.
 * Point 11 takes them down to a line: its steps, rests among them, are its slots (its rotate and its reverse are
 * `slots.ts`'s; swap and substitute act on it where asked), and the mask fixes a line's steps in place of its anchors.
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
import { codeShifts, type CompileResult, type Resolve } from '../program';
import { declWords, setBraid } from '../edit';
import type { Rewrite } from '../rewrite';
import { anchorsAmong, type Anchor } from './anchors';
import { drumNoteOf, linesOf, moved, pitchKey, pitchOf, tapWhole, written, type Line, type LineNote } from './lines';
import { referenceOf, type Reference } from './reference';
import { answeredIn } from '../use';
import { formsOf, FORM_FIXED, type Form } from './form';
import { fixedOf, shiftMoves, SLOT_OPERATORS, slotMoves, slotReference } from './slots';
import { progressionBraid, progressionCandidates, progressionKey, progressionNotes, progressionReference, progressionsOf, type Progression } from './progression';

export { backbeatOf, type Anchor } from './anchors';
export type { Reference } from './reference';
export { THIRDS, PHRASE_BARS } from './progression';

/** The operators: the rhythm ones (rung 1), the pitched ones (rung 2) and the harmony's own (rung 3). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse' | 'bend' | 'trim' | 'third' | 'dominant' | 'swap' | 'substitute' | 'shift';

/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export const RHYTHM_OPERATORS: readonly Operator[] = ['rotate', 'drop', 'add'];

/** The pitched operators, in their order: for a bass, a lead. */
export const PITCHED_OPERATORS: readonly Operator[] = ['transpose', 'invert', 'reverse', 'bend', 'trim'];

/**
 * The operators on a progression (rung 3), in their order: the line's rotate and reverse a level up, each phrase between
 * its cadences, then a chord a third away and a secondary dominant. A progression is varied by these alone, and only
 * where a frontend asks for one of them: rotate and reverse act on a progression only beside `third` or `dominant`.
 */
export const HARMONY_OPERATORS: readonly Operator[] = ['rotate', 'reverse', 'third', 'dominant', 'swap', 'substitute'];

/**
 * The operators on a form's letters or a song plan's sections (point 10), the slot operators every level shares
 * (`slots.ts`): rotate and reverse between its anchors, swap two adjacent slots, substitute a slot by another it holds.
 * A form is varied only where a frontend asks for `swap` or `substitute`, as a progression where it asks for one of its own.
 */
export const FORM_OPERATORS: readonly Operator[] = SLOT_OPERATORS;

/** The slot operators a line takes beside its own, on its steps: whatever it strikes or plays, where a frontend asks. */
const LINE_SLOT_OPERATORS: readonly Operator[] = ['swap', 'substitute'];

/**
 * One slot moved n degrees of the table it reads, n each of `degrees` (#910): a note of a pitched line
 * (`shift &bass 2 1`), a chord of a progression (`shift &harm 1 -1`; its `third` is its shift by a third), a letter of
 * a form on a grid (`&a` to `&a^1`, a sequence: `shift &chorus 1 2`). Asked by name: no list of a level's holds it.
 */
export const SHIFT: Operator = 'shift';

/** The operators that vary a line of slots (a progression, a form) where a frontend asks for one: none of the lines' own. */
const SLOT_LEVEL: readonly Operator[] = ['third', 'dominant', 'swap', 'substitute', 'shift'];

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
  /**
   * The library a fragment's `from` lines take from (a groove's drums, `&bd, &sd from gm_kit`, decision 075): the host's
   * resolver. A fragment read without one compiles only where it takes nothing.
   */
  readonly resolve?: Resolve;
  /**
   * A mask over a line of slots (a progression, a form, a song plan), by its name (`&harm` or `harm`): the slots no
   * operator moves, in place of the level's own anchors (a progression's cadence, a form's first and last slot); a
   * negative counts from the end, −1 the last. `{ '&harm': [] }` fixes none; `{ '&chorus': [0, 1, -1] }` keeps a form's
   * first two letters and its last. The same at every scale.
   */
  readonly fixed?: { readonly [line: string]: readonly number[] };
}

/** A fragment read under its workbench: the workbench's lines it doesn't write itself, then its own. */
function read(
  source: string,
  workbench = '',
  resolve?: Resolve,
): { lines: Line[]; anchors: Anchor[]; result: CompileResult | null; own: ReadonlySet<string>; progressions: Progression[]; forms: Form[] } {
  // (a plugin's from line read as the lines it answers, so a groove's levels a plugin writes are lines to vary by, #799)
  const fragment = resolve ? answeredIn(source, resolve) : source;
  const own = new Set(declarations(fragment).map((l) => l.name));
  const bench = declarations(workbench)
    .filter((l) => !own.has(l.name))
    .map((l) => l.written);
  const text = [...bench, fragment].join('\n');
  const result = compileSource(text, undefined, resolve ? { resolve } : {});
  if (!result.ok) return { lines: [], anchors: [], result: null, own, progressions: [], forms: [] };
  const lines = linesOf(text, result);
  const progressions = progressionsOf(fragment, result, own, playedBy(lines));
  const cadences = progressions.flatMap((p) => p.cadence.map((step): Anchor => ({ line: p.name, step, reason: 'cadence' })));
  const forms = formsOf(
    own,
    (name) => declWords(fragment, name),
    new Set([...playedBy(lines), ...progressions.map((p) => p.name.slice(1))]),
    (name) => !!result.cells.get(name)?.voice,
  );
  return { lines, anchors: [...anchorsAmong(lines, result), ...cadences], result, own, progressions, forms };
}

/** The cells a fragment's lines play: their triggers, their cards and their cells of levels. */
const playedBy = (lines: readonly Line[]): ReadonlySet<string> => new Set(lines.flatMap((l) => [l.trigger, l.card.name, ...(l.levels ? [l.levels.cell] : [])]));

/**
 * A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line, the backbeat's,
 * the roots on chord changes, and a progression's cadence (each step in the last bar of a four-bar phrase, point 8).
 */
export const anchorsOf = (fragment: string, workbench?: string, resolve?: Resolve): readonly Anchor[] => read(fragment, workbench, resolve).anchors;

/**
 * What no operator moves, one shape at every level (decision 052, point 3 and #909): a line's fixed steps, a progression's
 * or a form's fixed slots. A line the frontend keeps is every step fixed; else the frontend's mask, where it gives one
 * (`VaryOptions.fixed`); else the level's own anchors: a whole-line anchor (a kick, a backbeat) every step, a pitched
 * line's roots their steps, and `own` for a line of slots (a progression's cadence, a form's first and last slot).
 */
function fixedLookup(anchors: readonly Anchor[], keep: readonly string[], mask: VaryOptions['fixed']): (name: string, n: number, own?: readonly number[]) => number[] {
  const kept = new Set(keep.map(named));
  return (name, n, own) => {
    const every = Array.from({ length: n }, (_, s) => s);
    if (kept.has(name)) return every;
    const given = mask?.[name] ?? mask?.[name.slice(1)];
    if (given) return fixedOf(given, n);
    if (own) return fixedOf(own, n);
    const mine = anchors.filter((a) => a.line === name);
    return mine.some((a) => a.step === undefined)
      ? every
      : fixedOf(
          mine.map((a) => a.step!),
          n,
        );
  };
}

/**
 * Every line's fixed steps on its workbench, in the mask's own shape (`VaryOptions.fixed`, #909): its lines', its
 * progressions' and its forms', as the options give them (the frontend's `keep` and mask, else each level's anchors).
 * Handed back as the mask, it varies the fragment as it is varied with none: `variations(text, { ...o, fixed: fixedStepsOf(text, o) })`.
 */
export function fixedStepsOf(fragment: string, options: VaryOptions = {}): { readonly [line: string]: readonly number[] } {
  const { lines, anchors, own, progressions, forms } = read(fragment, options.workbench, options.resolve);
  const fixedFor = fixedLookup(anchors, options.keep ?? [], options.fixed);
  return Object.fromEntries([
    ...lines.filter((l) => own.has(l.trigger)).map((l) => [l.name, fixedFor(l.name, l.steps)] as const),
    ...progressions.map((p) => [p.name, fixedFor(p.name, p.slots.length, p.cadence)] as const),
    ...forms.map((f) => [f.name, fixedFor(f.name, f.slots.length, FORM_FIXED)] as const),
  ]);
}

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
  return readSome(fragment, options);
}

/** `readVariations`, or only one line's by one operator (`variationBy`): the same variations, made alike. */
function readSome(fragment: string, options: VaryOptions, only?: { line: string; operator: Operator }): Readings {
  const { workbench, keep = [], fewest = 1, degrees = DEGREES, resolve } = options;
  const operators = only ? [only.operator] : (options.operators ?? RHYTHM_OPERATORS);
  const { lines, anchors, result, own, progressions, forms } = read(fragment, workbench, resolve);
  if (!result) return { notes: null, span: null, bar: null, variations: [] };
  // (what no operator moves, at every level one shape: each line's fixed steps, `fixedLookup`)
  const fixedFor = fixedLookup(anchors, keep, options.fixed);
  const lineFixed = new Map(lines.map((l) => [l.name, fixedFor(l.name, l.steps)]));
  const fixedOfLine = (line: Line) => lineFixed.get(line.name)!;
  const pinned = (line: Line, n: LineNote) => fixedOfLine(line).includes(n.step);
  // (each note's onset in whole notes where its line's grid is the meter's, else its line's own step; its sound, the
  // drum note it strikes or its voice; and what a note is for S2: its onset, length and voice, and a pitched note's pitch)
  const onset = (i: number, step: number) => {
    const w = lines[i]!.stepWhole;
    return w === null ? `${i}@${step}` : (step * w).toFixed(9);
  };
  const sound = (voice: string) => String(drumNoteOf(result, voice) ?? voice);
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
  const chords = harmoniesOf(result, own, lines, progressions);
  const laps = [...lines.map((l) => (l.stepWhole === null ? null : l.steps * l.stepWhole)), ...chords.map((h) => h.lap)];
  const meter = lines.find((l) => l.meter)?.meter ?? chords.find((h) => h.meter)?.meter ?? null;
  const span = laps.length && laps.every((l) => l !== null) ? laps.reduce((a, b) => lcm(a!, b!)) : null;
  const bar = meter ? meter.pulses / meter.unit : null;
  // (a form's slots as notes, with no onset: each slot's place and what it plays, so a form varied is other notes)
  const played = slotsPlayed(forms, fragment, workbench, resolve, degrees);
  const formNotes = (f: Form, after: FormSlots, k: number): HeardNote[] =>
    [after.main, ...(after.partner ? [after.partner] : [])].flatMap((tokens, h) =>
      tokens.map((token, i) => ({ at: null, key: `form#${k}.${h} ${i} ${played(h ? f.partner! : f, token)}` })),
    );
  const asWritten = (f: Form): FormSlots => ({ main: f.slots, ...(f.partner ? { partner: f.partner.slots } : {}) });
  const fixed = [...chords.flatMap((h) => h.notes), ...forms.flatMap((f, k) => formNotes(f, asWritten(f), k))];
  const fixedBut = (name: string, notes: readonly HeardNote[]) => [
    ...chords.flatMap((h) => (h.name === name ? notes : h.notes)),
    ...forms.flatMap((f, k) => (f.name.slice(1) === name ? notes : formNotes(f, asWritten(f), k))),
  ];
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
    amount: number | string | null,
    braids: Map<string, string[]> | null,
    what: string,
    about: number | null = typeof amount === 'number' ? amount : null,
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

  const inOrder = (notes: LineNote[]) => notes.sort((a, b) => a.step - b.step || pitchOf(result, a.voice) - pitchOf(result, b.voice));
  const first = (i: number) => {
    const n = lines[i]!.notes[0]!;
    return [n.step * (lines[i]!.stepWhole ?? 1), pitchOf(result, n.voice)] as const;
  };
  const order = lines
    .map((_, i) => i)
    // (a line of the fragment's own: the workbench's are what it is read on, never varied)
    // (a line every step of which is fixed, a kick's, one the frontend keeps, is left as it is)
    .filter((i) => lines[i]!.notes.length > 0 && own.has(lines[i]!.trigger) && fixedOfLine(lines[i]!).length < lines[i]!.steps && (!only || only.line === lines[i]!.name))
    .sort((a, b) => first(a)[0] - first(b)[0] || first(a)[1] - first(b)[1]);
  for (const i of order) {
    const line = lines[i]!;
    const levels = line.levels?.tokens;
    // (the last note in time, and the one before it: what bend and trim act on, unless the last is anchored)
    const [before, last] = line.notes.slice(-2);
    const ends = line.notes.length >= 2 && !pinned(line, last!);
    // (the line's steps as slots, rests among them, for the slot operators every level shares, `slots.ts`: each step's
    // notes as written, and the steps fixed, the frontend's mask or else the anchored notes')
    const stepKeys = Array.from({ length: line.steps }, (_, s) => JSON.stringify(line.notes.filter((n) => n.step === s)));
    const fixedSteps = fixedOfLine(line);
    const movedFrom = (from: readonly number[]) => inOrder(from.flatMap((src, t) => line.notes.filter((n) => n.step === src).map((n) => ({ ...n, step: t }))));
    const levelsFrom = (from: readonly number[]) => levels && levels.map((_, t) => levels[from[t]!]!);
    for (const operator of operators) {
      // (each operator on the lines it is for: the rhythm ones on hits, the pitched ones on pitches, swap and substitute on both)
      if (!LINE_SLOT_OPERATORS.includes(operator) && [...PITCHED_OPERATORS, SHIFT].includes(operator) !== !!line.pitched) continue;
      // (a line with a held note is moved in pitch alone: reverse, bend and trim would move where its notes fall and end)
      if (line.notes.some((n) => n.hold) && !['transpose', 'invert', 'shift'].includes(operator)) continue;
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
      } else if (operator === 'shift')
        // (one note moved n degrees of its table, each free note by each of `degrees`: `slots.ts`'s shift on the line's steps)
        for (const { slot, by } of shiftMoves(line.steps, fixedSteps, degrees, (s) => line.notes.some((x) => x.step === s))) {
          const notes = line.notes.map((x) => (x.step === slot ? { ...x, pitch: moved(x.pitch!, 1, by) } : x));
          offer(
            i,
            operator,
            notes,
            `${slot} ${by}`,
            written(line, notes),
            `its note on step ${slot} ${by > 0 ? 'up' : 'down'} ${Math.abs(by)} degree${Math.abs(by) === 1 ? '' : 's'}`,
            null,
          );
        }
      else if (operator === 'transpose')
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
        // (the slot operators' reverse on the line's steps: each span between two fixed steps read backwards)
        for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
          const notes = movedFrom(m.from);
          offer(i, operator, notes, null, written(line, notes), 'its notes in reverse order between its anchors');
        }
      } else if (operator === 'rotate') {
        // (the slot operators' rotate on the line's steps: each span between two fixed steps a step later; with none fixed,
        // every note a step later, the last to the first, and a Euclid stays one, turned)
        for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
          const notes = movedFrom(m.from);
          offer(i, operator, notes, null, written(line, notes, levelsFrom(m.from) ?? undefined, !fixedSteps.length), 'every note a step later, the last to the first');
        }
      } else if (operator === 'swap' || operator === 'substitute') {
        // (the slot operators on the line's steps, rests among them: two adjacent steps exchanged, a step given another's)
        for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
          const notes = movedFrom(m.from);
          offer(i, operator, notes, m.amounts.join(' '), written(line, notes, levelsFrom(m.from) ?? undefined), m.what, null);
        }
      } else if (operator === 'drop')
        for (const dropped of line.notes.filter((n) => !pinned(line, n))) {
          const notes = line.notes.filter((n) => n !== dropped);
          offer(i, operator, notes, dropped.step, written(line, notes), `its ${dropped.voice} on step ${dropped.step} left out`);
        }
      else {
        const voice = line.notes[0]!.voice;
        const loudest = line.notes.reduce((a, b) => (b.level > a.level ? b : a));
        for (let step = 0; step < line.steps; step++) {
          if (fixedSteps.includes(step) || line.notes.some((n) => n.step === step && sound(n.voice) === sound(voice))) continue;
          const notes = inOrder([...line.notes, { step, voice, own: loudest.own, level: loudest.level }]);
          const louder = levels && levels.map((t, s) => (s === step ? levels[loudest.step]! : t));
          offer(i, operator, notes, step, written(line, notes, louder), `a ${voice} on step ${step}, as loud as its loudest`);
        }
      }
    }
  }
  // (then each line of slots, after every line, each progression and then each form: by the operators of its level, where
  // one of the slot levels' own is asked; S2 against the source and every variation before it, a progression's chords keyed
  // as they sound, a form's slots as they splice)
  const base = signature(-1, []);
  const slotLevel = !!only || operators.some((o) => SLOT_LEVEL.includes(o));
  const formKey = (g: Form, after: FormSlots) => after.main.map((t, i) => `${played(g, t)}${g.partner ? `/${played(g.partner, after.partner![i]!)}` : ''}`).join(' ');
  const keyOf = (p: Progression | null, slots: Progression['slots'] | null, f: Form | null, after: FormSlots | null) =>
    [base, ...progressions.map((q) => (q === p ? progressionKey(q, slots!) : progressionKey(q, q.slots))), ...forms.map((g) => formKey(g, g === f ? after! : asWritten(g)))].join(
      '#',
    );
  if (progressions.length || forms.length) seen.add(keyOf(null, null, null, null));
  const offerSlots = (
    name: string,
    rule: Operator,
    amounts: readonly number[],
    what: string,
    braids: ReadonlyMap<string, readonly string[]>,
    sig: string,
    notes: readonly HeardNote[],
    reference: Reference | null,
  ) => {
    if (seen.has(sig)) return;
    seen.add(sig);
    const code = (cell: string, braid?: readonly string[]) => {
      const w = wordsOf(cell);
      return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
    };
    const variation: Variation = {
      id: `vary:${rule}:${name}${amounts.map((a) => `:${a}`).join('')}:${out.length}`,
      tool: 'vary',
      rule,
      title: `${name}: ${what}`,
      before: [...braids.keys()].map((cell) => code(cell)).join('\n'),
      after: [...braids].map(([cell, braid]) => code(cell, braid)).join('\n'),
      apply: (source) => [...braids].reduce((text, [cell, braid]) => setBraid(text, cell, [...braid]), source),
      line: name,
      by: `${rule} ${name}${amounts.length ? ` ${amounts.join(' ')}` : ''}`,
      ...(reference ? { reference } : {}),
    };
    out.push({ variation, notes: [...heardKeys.flat(), ...notes] });
  };
  for (const p of progressions) {
    if (!slotLevel || (only && only.line !== p.name)) continue;
    const k = chords.findIndex((h) => h.name === p.name.slice(1));
    const asked = operators.filter((o) => HARMONY_OPERATORS.includes(o) || o === SHIFT);
    for (const c of progressionCandidates(p, asked, result, fixedFor(p.name, p.slots.length, p.cadence), degrees)) {
      const braid = progressionBraid(c.slots);
      const w = wordsOf(p.name.slice(1));
      const reference = w && progressionReference(p, c.slots, [...w.head, ...w.attrs, ...braid]);
      offerSlots(
        p.name,
        c.operator,
        c.amounts,
        c.what,
        new Map([[p.name.slice(1), braid]]),
        keyOf(p, c.slots, null, null),
        fixedBut(p.name.slice(1), progressionNotes(p, c.slots, k)),
        reference || null,
      );
    }
  }
  for (const [k, f] of forms.entries()) {
    if (!slotLevel || (only && only.line !== f.name)) continue;
    const keys = f.slots.map((t, i) => `${played(f, t)}${f.partner ? `/${played(f.partner, f.partner.slots[i]!)}` : ''}`);
    const fixedSlots = fixedFor(f.name, f.slots.length, FORM_FIXED);
    const offerForm = (operator: Operator, amounts: readonly number[], what: string, after: FormSlots) => {
      const braids = new Map([[f.name.slice(1), after.main]]);
      if (f.partner && after.partner) braids.set(f.partner.name.slice(1), after.partner);
      offerSlots(f.name, operator, amounts, what, braids, keyOf(null, null, f, after), fixedBut(f.name.slice(1), formNotes(f, after, k)), formReference(f, after));
    };
    for (const operator of operators) {
      if (operator === 'shift') {
        // (a letter moved n degrees, a sequence: on a form on a grid, a letter a bare splice or one moved already)
        if (!f.partner && f.attrs.some((a) => a.startsWith('step=')))
          for (const { slot, by } of shiftMoves(f.slots.length, fixedSlots, degrees, (s) => shiftedToken(f.slots[s]!, 1) !== null)) {
            const main = f.slots.map((t, s) => (s === slot ? shiftedToken(t, by)! : t));
            offerForm(operator, [slot, by], `its letter on slot ${slot} moved ${by} degree${Math.abs(by) === 1 ? '' : 's'}`, { main });
          }
      } else if (FORM_OPERATORS.includes(operator))
        for (const m of slotMoves(keys, fixedSlots, [operator])) {
          const main = m.from.map((i) => f.slots[i]!);
          offerForm(m.operator, m.amounts, m.what, { main, ...(f.partner ? { partner: m.from.map((i) => f.partner!.slots[i]!) } : {}) });
        }
    }
  }
  return { notes: [...heardKeys.flat(), ...fixed], span, bar, variations: out };
}

/**
 * What each slot of the forms plays, so two slots that splice alike are one (`&bridge^1` and `&close`, both `&call^-2`):
 * each distinct slot spliced alone, at its form's rate, in one compile beside the fragment, its events as `flatten`
 * gives them. Only a form on a grid (`step=`, a form's letters) is read so: a song plan's slots splice values (a
 * section's intensity, a sum, `[&song + -.3]`) that `flatten` doesn't read as played, so its slots, and any whose events
 * can't be read, are keyed by their text.
 */
function slotsPlayed(
  forms: readonly Form[],
  fragment: string,
  workbench = '',
  resolve?: Resolve,
  degrees: readonly number[] = DEGREES,
): (form: Pick<Form, 'attrs'>, token: string) => string {
  const cells = new Map<string, string>();
  const lines: string[] = [];
  for (const f of forms)
    for (const g of [f, ...(f.partner ? [f.partner] : [])])
      // (its slots, and each moved by each of `degrees`, as a shift writes it)
      for (const token of g.attrs.some((x) => x.startsWith('step='))
        ? [...g.slots, ...g.slots.flatMap((t) => degrees.map((n) => shiftedToken(t, n)).filter((x): x is string => x !== null))]
        : []) {
        const key = `${g.attrs.join(' ')}|${token}`;
        if (cells.has(key)) continue;
        const cell = `vary_slot_${cells.size}`;
        cells.set(key, cell);
        lines.push([`&${cell}`, ...g.attrs, token].join(' '));
      }
  const keys = new Map<string, string>();
  if (lines.length) {
    const own = new Set(declarations(fragment).map((l) => l.name));
    const bench = declarations(workbench)
      .filter((l) => !own.has(l.name))
      .map((l) => l.written);
    const result = compileSource([...bench, fragment, ...lines].join('\n'), undefined, resolve ? { resolve } : {});
    if (result.ok)
      for (const [key, cell] of cells)
        try {
          const events = flatten(result, cell, codeShifts(result));
          keys.set(key, events.map((e) => `${e.step}:${e.duration}:${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}`).join(' '));
        } catch {
          // (a slot the flattener can't read: keyed by its text below)
        }
  }
  return (g, token) => keys.get(`${g.attrs.join(' ')}|${token}`) || token;
}

/**
 * A form's variation by reference: each line it changes as a copy of itself changed on those slots (`base=&chorus = &b`),
 * its partner's beside it; null where the forms written are no shorter than the lines written out.
 */
function formReference(f: Form, after: FormSlots): Reference | null {
  const ref = slotReference(f.name, f.slots, after.main);
  if (!ref) return null;
  const written = (g: Pick<Form, 'head' | 'attrs'>, slots: readonly string[]) => [...g.head, ...g.attrs, ...slots].join(' ').length;
  const p = f.partner;
  const pref = p && after.partner && slotReference(p.name, p.slots, after.partner);
  const length = ref.line(f.name.slice(1)).length + (pref ? pref.line(p.name.slice(1)).length : 0);
  const whole = written(f, after.main) + (p && after.partner ? written(p, after.partner) : 0);
  if (length > whole) return null;
  return p && pref ? { ...ref, partner: { of: p.name, ...pref } } : ref;
}

/** A form's slots as a variation writes them: its own, and its partner's (a song's plan of who plays) beside them. */
interface FormSlots {
  readonly main: readonly string[];
  readonly partner?: readonly string[];
}

/** A letter moved n degrees, as a sequence writes it: `&a` to `&a^n`, `&a^k` to `&a^(k+n)`; null for any other splice. */
function shiftedToken(token: string, n: number): string | null {
  const m = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\^(-?\d+))?$/.exec(token);
  if (!m) return null;
  const k = Number(m[2] ?? 0) + n;
  return k === 0 ? `&${m[1]}` : `&${m[1]}^${k}`;
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
function harmoniesOf(
  result: CompileResult,
  own: ReadonlySet<string>,
  lines: readonly Line[],
  progressions: readonly Progression[],
): { name: string; notes: HeardNote[]; lap: number; meter: Meter | null }[] {
  const played = playedBy(lines);
  const out: { name: string; notes: HeardNote[]; lap: number; meter: Meter | null }[] = [];
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
    // (a progression Vary reads keys its chords as it writes them, so a variation's are keyed alike: the same keys)
    const p = progressions.find((q) => q.name === `&${name}`);
    const notes = p
      ? progressionNotes(p, p.slots, k)
      : events.map((e) => ({ at: e.step * whole, key: `${whole * e.duration} chords#${k} ${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}` }));
    out.push({ name, notes, lap: cell.steps * whole, meter });
  }
  return out;
}

/** The index a draw in [0, 1) takes of n: ⌊draw · n⌋, the one Jambot's `pick(draw, ones)` takes for every draw. */
export function drawn(draw: number, n: number): number {
  if (!(draw >= 0 && draw < 1)) throw new Error(`varied: draw ${draw} is outside [0, 1)`);
  return Math.floor(draw * n);
}

/** A `by:` as `Variation.by` writes it: the operator, the line, its amounts. */
const BY = /^([a-z]+) (&[A-Za-z_][A-Za-z0-9_]*)((?: -?\d+)*)$/;

/**
 * The variation a `by:` names (decision 052, point 9): `drop &hat 6`, `transpose &bass -1`, `third &harm 2 -2`, made on
 * the fragment's text under the same options as `variations`, without making the others: only that line's variations by
 * that operator. So a filed variation's text is rebuilt from its source, its `by:` and the options it was made with
 * (Jambot's rebuilt layer, a lineage replayed). Null where the text gives none of that name (its line anchored or kept,
 * or the variation playing its source). One `variations` leaves out as playing the notes of a variation before it, by
 * another operator or line, is still given here.
 */
export function variationBy(fragment: string, by: string, options: VaryOptions = {}): Variation | null {
  const m = BY.exec(by.trim());
  if (!m || !OPERATORS.includes(m[1] as Operator)) return null;
  const variations = readSome(fragment, options, { line: m[2]!, operator: m[1] as Operator }).variations;
  return variations.find((v) => v.variation.by === by.trim())?.variation ?? null;
}

/** Every operator, as a `by:` may name it. */
const OPERATORS: readonly Operator[] = [...new Set([...RHYTHM_OPERATORS, ...PITCHED_OPERATORS, ...HARMONY_OPERATORS, SHIFT])];

/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null {
  drawn(draw, 1);
  const all = variations(fragment, options);
  return all.length ? all[drawn(draw, all.length)]! : null;
}
