/**
 * A variation's reference (#293): the varied line written as a form on the line it varies, so a text that plays the
 * variation keeps what was varied. Every operator has one in the forms the language already has:
 *
 *  - **rotate**: `&x[<<]`, the line one step later, a pick, which a mix reads as an entry (`[&kick, &hat[<<]]`), where
 *    its last token is one step (a last run, `~!7`, would wrap whole);
 *  - **transpose**: `&x^n`; with anchored notes, `base=&x^n` and the anchored ones written as they are (`base=&bassline^-1 0`);
 *  - **invert**: `inverse(&x)`, about a first note off 0 `degree(inverse(&x), 2f)`; with anchored notes the mirror moves,
 *    the line's picks around them mirrored (`&x[0] inverse(&x[1:])`);
 *  - **reverse**: `&x[::-1]`; with anchored notes, each span between two of them read backwards (`&x[0] &x[:0:-1]`);
 *  - **drop**, **add**, **trim**, **bend**: a copy of the line changed on the one step it changes (decision 026's
 *    `base=`): `base=&hat =!6 ~`, `base=&hat =!3 &hh:0:.4`, `base=&bassline =!3 1`.
 *
 * None where the line can't be read so (a Euclid, a subsequence on one step, a line with a cell of levels, a cut inside a
 * held note), and none where the form would be longer than the line written out (the folder's `bare` on one line: its
 * characters, a run's spaces one). A cell that splices a line of hits has no voice (`&r step=16n &hat[:4] ~ &hat[5:]`
 * is an error), so a line of hits is referred to by a pick in a mix or by `base=`, never by a braid of its slices. Pure.
 */
import type { Operator } from '.';
import { stepTokens, type Line, type LineNote } from './lines';

/** A variation's reference: its form on the line it varies, and a cell that plays it. */
export interface Reference {
  /** The form: `&hat[<<]`, `&bassline^-1`, `inverse(&bassline)`, `&bassline[0] &bassline[:0:-1]`, `base=&hat =!6 ~`. */
  readonly form: string;
  /**
   * A cell named `name` that plays it, to read where the line was read: `&hat2 [&hat[<<]]`, `&bass2 step=4n over=&harm
   * &bassline^-1`, `&hat2 base=&hat =!6 ~`. A pick (rotate's) may stand in a mix's entry as it is.
   */
  readonly line: (name: string) => string;
}

/** One token of the line as written: its first step and its length in steps. */
interface Token {
  readonly start: number;
  readonly len: number;
}

const HELD = /@(\d+)$/;
const RUN = /^(.+)!(\d+)$/;

/** The line's tokens with their steps; null where they don't add up to its lap. */
function tokensOf(braid: readonly string[], steps: number): Token[] | null {
  const out: Token[] = [];
  let at = 0;
  for (const text of braid) {
    const held = HELD.exec(text);
    const run = RUN.exec(text);
    const len = held ? Number(held[1]) : run ? Number(run[2]) : 1;
    out.push({ start: at, len });
    at += len;
  }
  return at === steps ? out : null;
}

/** Attributes that say nothing about what a line plays: a reference's cell leaves them out. */
const DISPLAY = /^(label|tags|show|about|title)=/;

/**
 * The reference of a variation of `line` (its braid as written, `braid`, and its attributes, `attrs`) by `operator`,
 * which gives it `notes`: `pinned` its anchored steps that the operator leaves where they are, `amount` its degrees
 * (transpose) or its mirror's (invert: twice the first note's degree). Null where there is none.
 */
export function referenceOf(
  line: Line,
  braid: readonly string[],
  attrs: readonly string[],
  operator: Operator,
  notes: readonly LineNote[],
  pinned: ReadonlySet<number>,
  amount: number | null,
): Reference | null {
  if (line.form !== 'steps' || line.levels || line.euclid || !notes.length) return null;
  const tokens = tokensOf(braid, line.steps);
  if (!tokens) return null;
  const x = line.name;
  const n = line.steps;
  const T = tokens.length;
  const before = stepTokens(line, line.notes);
  const after = stepTokens(line, notes);
  const writtenOut = (a: number, b: number, as = after) => as.slice(a, b).filter((t): t is string => t !== null);
  const own = attrs.filter((a) => !DISPLAY.test(a));
  const pins = [...pinned].sort((a, b) => a - b);

  /** A copy of the line, `base=` it moved (`&x^n`), written on the steps `at` gives a token for (`=!k` keeping the steps between). */
  const based = (base: string, at: (step: number) => string | null) => {
    const delta: string[] = [];
    let kept = 0;
    for (let s = 0; s < n; s++) {
      const token = at(s);
      if (token === null) {
        if (before[s] !== null) kept++;
        continue;
      }
      if (kept) delta.push(kept === 1 ? '=' : `=!${kept}`);
      delta.push(token);
      kept = 0;
    }
    return { form: `base=${base} ${delta.join(' ')}`.trim(), line: (name: string) => `&${name} base=${base} ${delta.join(' ')}`.trim() };
  };

  /** The tokens [i, j) as a pick of the line: `&x`, `&x[3]`, `&x[:6]`, `&x[7:]`, `&x[2:5]`. */
  const index = (k: number) => (k === T - 1 && T > 1 ? '-1' : String(k));
  const pickText = (i: number, j: number) =>
    i === 0 && j === T ? x : j - i === 1 ? `${x}[${index(i)}]` : i === 0 ? `${x}[:${j === T - 1 ? '-1' : j}]` : j === T ? `${x}[${index(i)}:]` : `${x}[${i}:${j}]`;
  /** Steps [a, b) as a pick of whole tokens; null where a cut falls inside one. */
  const pickOf = (a: number, b: number): readonly [number, number] | null => {
    const i = tokens.findIndex((t) => t.start === a);
    const j = tokens.findIndex((t) => t.start === b);
    return i < 0 || (j < 0 && b !== n) ? null : [i, j < 0 ? T : j];
  };
  /** Steps [a, b) picked and moved by `move`, or as the variation writes them where they aren't whole tokens. */
  const moved = (a: number, b: number, move: (pick: string) => string) => {
    const p = pickOf(a, b);
    return p ? [move(pickText(...p))] : writtenOut(a, b);
  };
  const braided = (parts: readonly string[]) => {
    const form = parts.join(' ');
    return { form, line: (name: string) => [`&${name}`, ...own, form].join(' ') };
  };

  let ref: Reference | null = null;
  if (operator === 'rotate') {
    if (tokens.at(-1)!.len === 1) ref = { form: `${x}[<<]`, line: (name) => `&${name} [${x}[<<]]` };
  } else if (operator === 'transpose') {
    ref = pins.length ? based(`${x}^${amount}`, (s) => (pinned.has(s) ? before[s]! : null)) : braided([`${x}^${amount}`]);
  } else if (operator === 'invert') {
    const mirror = (pick: string) => (amount ? `degree(inverse(${pick}), ${amount})` : `inverse(${pick})`);
    const parts: string[] = [];
    let at = 0;
    for (const p of [...pins, n]) {
      if (p > at) parts.push(...moved(at, p, mirror));
      if (p < n) parts.push(...moved(p, p + 1, (pick) => pick));
      at = p + 1;
    }
    ref = braided(parts);
  } else if (operator === 'reverse') {
    if (!pins.length) ref = braided([`${x}[::-1]`]);
    else {
      // (each span between two anchored steps read backwards; one across the lap's end, where no anchor is on step 0, written out)
      const wraps = pins[0]! > 0;
      const parts = wraps ? writtenOut(0, pins[0]!) : [];
      for (const [k, p] of pins.entries()) {
        parts.push(...moved(p, p + 1, (pick) => pick));
        const [a, b] = [p + 1, pins[k + 1] ?? n];
        const span = pickOf(a, b);
        if (b <= a) continue;
        if (wraps && k === pins.length - 1) parts.push(...writtenOut(a, b));
        else if (b - a === 1) parts.push(...moved(a, b, (pick) => pick));
        else if (span) parts.push(`${x}[${span[1] === T ? '' : span[1] - 1}:${span[0] - 1}:-1]`);
        else parts.push(...writtenOut(a, b));
      }
      ref = braided(parts);
    }
  } else ref = based(x, (s) => (before[s] === after[s] ? null : after[s]!));
  if (!ref || !ref.form.includes(x)) return null;
  // (no longer than the line written out, both under one name: what a text writes either way)
  return ref.line(line.trigger).length <= [x, ...own, ...writtenOut(0, n)].join(' ').length ? ref : null;
}
