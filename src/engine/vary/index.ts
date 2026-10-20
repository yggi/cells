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
 *  - **invert**: every other note mirrored about the line's first note f, in degrees, as `degree(inverse(&x), 2f)`;
 *  - **reverse**: the notes of each span between two anchored notes (the whole lap where there are none) in reverse
 *    order, as `&x[::-1]` reads a span.
 *
 * Each operator acts on the lines it is for: the rhythm ones on lines of hits, the pitched ones on pitched lines.
 * In Jambot's order (yggi/jambot `variations`, so its draws pick the same one): the lines in the order the lap first plays
 * them (by onset, then pitch), and for each its rotation, its drops in the order its notes play, its adds by step, then
 * its transpositions in the order of `degrees`, its inversion, its retrograde. None
 * plays the notes of its source or of one given before it (compared as its steps write them: each note's onset, length
 * and voice; nothing is compiled per variation), none strikes one sound twice at one onset, none keeps fewer than
 * `fewest` notes. The anchors (`anchors.ts`: the kick's line and the backbeat's), and the lines the frontend keeps, are
 * never varied. A variation rewrites only its line's braid (and its cell of levels), as plain steps on its own grid. Pure.
 */
import { declarations } from '../../repository/fit';
import { compileSource } from '../compile';
import { declWords, setBraid } from '../edit';
import { gmDrumNote } from '../midi';
import type { Rewrite } from '../rewrite';
import { anchorsAmong, type Anchor } from './anchors';
import { linesOf, moved, pitchKey, pitchOf, written, type Line, type LineNote } from './lines';

export { backbeatOf, type Anchor } from './anchors';

/** The operators: the rhythm ones (rung 1) and the pitched ones (rung 2). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse';

/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export const RHYTHM_OPERATORS: readonly Operator[] = ['rotate', 'drop', 'add'];

/** The pitched operators, in their order: for a bass, a lead. */
export const PITCHED_OPERATORS: readonly Operator[] = ['transpose', 'invert', 'reverse'];

/** Transposition's amounts where a frontend names none, in degrees of the table read. */
export const DEGREES: readonly number[] = [-2, -1, 1, 2];

/** One change to one line: a rewrite of the tool `vary`, whose `apply` gives the varied fragment. */
export interface Variation extends Rewrite<Operator> {
  /** The line it varies, as the card names it: `&hat`. */
  readonly line: string;
  /** For a frontmatter's `by:`: the operator, the line and its amount (a step, degrees), `drop &hat 6`, `rotate &hat`, `transpose &bass -1`. */
  readonly by: string;
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
function read(fragment: string, workbench = ''): { lines: Line[]; anchors: Anchor[] } {
  const own = new Set(declarations(fragment).map((l) => l.name));
  const bench = declarations(workbench)
    .filter((l) => !own.has(l.name))
    .map((l) => l.written);
  const text = [...bench, fragment].join('\n');
  const result = compileSource(text);
  if (!result.ok) return { lines: [], anchors: [] };
  const lines = linesOf(text, result);
  return { lines, anchors: anchorsAmong(lines, result) };
}

/** A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line, the backbeat's, the roots on chord changes. */
export const anchorsOf = (fragment: string, workbench?: string): readonly Anchor[] => read(fragment, workbench).anchors;

/** A line's name as an option may write it: `&fill` or `fill`. */
const named = (name: string) => (name.startsWith('&') ? name : `&${name}`);

/** Every variation by one operator on one line, in Jambot's order, none playing the notes of its source or of one before it. */
export function variations(fragment: string, options: VaryOptions = {}): readonly Variation[] {
  const { workbench, operators = RHYTHM_OPERATORS, keep = [], fewest = 1, degrees = DEGREES } = options;
  const { lines, anchors } = read(fragment, workbench);
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
  const noteKeys = lines.map((l, i) => keysOf(i, l.notes));
  const strikeKeys = lines.map((l, i) => strikesOf(i, l.notes));
  const total = lines.reduce((sum, l) => sum + l.notes.length, 0);
  const signature = (i: number, notes: readonly LineNote[]) =>
    lines
      .flatMap((_, j) => (j === i ? keysOf(i, notes) : noteKeys[j]!))
      .sort()
      .join('|');
  const seen = new Set([signature(-1, [])]);

  const out: Variation[] = [];
  const words = new Map<string, ReturnType<typeof declWords>>();
  /** A candidate kept where it is a variation: enough notes, no sound struck twice at an onset, other notes than any before. */
  const offer = (i: number, operator: Operator, notes: readonly LineNote[], amount: number | null, braids: Map<string, string[]> | null, what: string) => {
    if (!braids || total - lines[i]!.notes.length + notes.length < fewest) return;
    const strikes = lines.flatMap((_, j) => (j === i ? strikesOf(i, notes) : strikeKeys[j]!));
    if (new Set(strikes).size < strikes.length) return;
    const sig = signature(i, notes);
    if (seen.has(sig)) return;
    seen.add(sig);
    const line = lines[i]!.name;
    const code = (name: string, braid?: readonly string[]) => {
      if (!words.has(name)) words.set(name, declWords(fragment, name));
      const w = words.get(name);
      return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
    };
    out.push({
      id: `vary:${operator}:${line}${amount === null ? '' : `:${amount}`}:${out.length}`,
      tool: 'vary',
      rule: operator,
      title: `${line}: ${what}`,
      before: [...braids.keys()].map((name) => code(name)).join('\n'),
      after: [...braids].map(([name, braid]) => code(name, braid)).join('\n'),
      apply: (source) => [...braids].reduce((text, [name, braid]) => setBraid(text, name, braid), source),
      line,
      by: `${operator} ${line}${amount === null ? '' : ` ${amount}`}`,
    });
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
    for (const operator of operators) {
      if (PITCHED_OPERATORS.includes(operator) !== !!line.pitched) continue;
      if (operator === 'transpose')
        for (const n of degrees) {
          const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch!, 1, n) }));
          offer(i, operator, notes, n, written(line, notes), `every note ${n > 0 ? 'up' : 'down'} ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'}`);
        }
      else if (operator === 'invert') {
        const f = line.notes[0]!.pitch!.written;
        if (typeof f !== 'number') continue;
        const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch!, -1, 2 * f) }));
        offer(i, operator, notes, null, written(line, notes), `every note mirrored about its first`);
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
