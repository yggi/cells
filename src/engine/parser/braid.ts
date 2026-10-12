/** A braid's steps: numbers, rests, chords, choices, cells (picked, shifted, transposed) and their modifiers. */
import type { Atom, Token, ValueMap } from '../ast';
import { MAX_REPS, type LineScanner } from './scanner';
import { isMixChord, parseMixChord } from './mix';
import { syntax, type Syntax } from './syntax';

/** What a braid's steps can be. */
export const STEP_SYNTAX: readonly Syntax[] = [
  syntax(
    'step',
    'n',
    "A number: an index into the table it reads (over=), or a value (a volume, a waveform's level). Negative and decimal numbers work. A note by name (C, F#, Bb3; octave 4 left out) is a pitch instead: a place on the grid at the root of its tables, whatever they are.",
    ['&tune step=2 0 2 4 -1 .5', '&tune step=2 C E G C5'],
    'cell.md',
  ),
  syntax(
    'step',
    'n# · nb',
    'A number with accidentals: one step up (#) or down (b) on the grid below the table it reads — 6# over a scale is its 7th degree raised a semitone.',
    ['&tune over=&major step=2 0 4 6# 7 3b'],
    'tables.md',
  ),
  syntax('step', 'n/d', 'A fraction: 9/8, 3/2 (the ratios of a map=ratios grid).', ['&just map=ratios 1 9/8 5/4 3/2 2'], 'tuning.md'),
  syntax('step', '~', 'A rest: a step that plays nothing.', ['&tune step=2 0 ~ 4 ~'], 'cell.md'),
  syntax(
    'step',
    '_',
    "In a cell with base=: the base's step here, as it is there (_@2: its pitch, held 2; _!n: n of them). A value in its place changes that step.",
    ['&answer base=&subject^$7 _!3 12@2'],
    'braid.md',
  ),
  syntax(
    'step',
    '[a, b, c] · [a b c]',
    'A chord: the numbers sound together, in one step. Its notes can be names, pitches whatever the tables: [C, E, G].',
    ['&chords step=1 [0,2,4] [3 5 7]', '&chords step=1 [C, E, G] [F, A, C5]'],
    'time.md',
  ),
  syntax('step', '[a|b|c]', 'A choice: one of them, chosen afresh each time round (the same every time it is played).', ['&tune step=2 0 [2|4|7] 4'], 'braid.md'),
  syntax(
    'step',
    '&x',
    "A cell, spliced in: its braid plays in this one's step (as long as its own steps). Picks, shifts and transposing are under References.",
    ['&theme step=2 &motif &motif^$7 0'],
    'braid.md',
  ),
  syntax(
    'step',
    '&voice (stepped)',
    'In a stepped braid of voices (and rests), each step plays its voice: a drum pattern by name. Chords of voices sound together, [&bd, &hh]; modifiers work as on any step. Unstepped, a braid of voices is a kit, read by number.',
    ['&groove step=4 &bd ~ &hh [&bd, &sd] &hh*2 ~'],
    'sound.md',
  ),
];

/** Operations on a reference's values, by name: degree(&x, n), inverse(&x) — nested as you like. */
export const OPERATIONS = ['degree', 'inverse'] as const;
const OPERATION = /(degree|inverse)\(/y;

type RefAtom = Extract<Atom, { kind: 'ref' }>;

/** &x, or an operation on one: its values moved before its tables read them (v → mul·v + add, the outer after the inner). */
function parseRefOrOperation(s: LineScanner): RefAtom {
  const op = s.match(OPERATION);
  if (op === null) {
    const r = s.ref('a cell like &motif');
    // (^n: a degree, as degree(&x, n) is)
    return {
      kind: 'ref',
      name: r.name,
      pick: r.pick,
      shift: r.shift,
      ...(r.transpose ? { transpose: r.transpose } : {}),
      ...(r.degree ? { values: { mul: 1, add: r.degree } } : {}),
    };
  }
  const name = op.slice(0, -1);
  s.skipSpace();
  if (s.peek() !== '&' && !s.text.startsWith('degree(', s.i) && !s.text.startsWith('inverse(', s.i))
    s.fail(name === 'degree' ? 'degree(&cell, n): a cell, then how many steps of its table up (−n down)' : 'inverse(&cell): a cell, mirrored round 0', s.i);
  const inner = parseRefOrOperation(s);
  s.skipSpace();
  const was: ValueMap = inner.values ?? { mul: 1, add: 0 };
  let m: ValueMap;
  if (name === 'degree') {
    s.expect(',', `',' then the steps: degree(&${inner.name}, 1)`);
    s.skipSpace();
    // (a sign may stand apart from its number, as the spaces round the whole are free)
    const n = s.match(/[-+]?\s*[0-9]+(?![0-9.])/y);
    if (n === null) s.fail(`degree(&${inner.name}, n) moves it n whole steps of its table, a whole number: degree(&${inner.name}, 1), degree(&${inner.name}, -2)`, s.i);
    m = { mul: was.mul, add: was.add + parseInt(n!.replace(/\s+/g, ''), 10) };
  } else m = { mul: was.mul === 1 ? -1 : 1, add: -was.add };
  s.skipSpace();
  s.expect(')', `')' to close ${name}(…)`);
  return {
    kind: 'ref',
    name: inner.name,
    pick: inner.pick,
    shift: inner.shift,
    ...(inner.transpose ? { transpose: inner.transpose } : {}),
    ...(m.mul === 1 && m.add === 0 ? {} : { values: m }),
  };
}

function parseAtom(s: LineScanner): Atom {
  const c = s.peek();
  if (c === '&' || s.text.startsWith('degree(', s.i) || s.text.startsWith('inverse(', s.i)) return parseRefOrOperation(s);
  if (c === '~') {
    s.i++;
    return { kind: 'rest' };
  }
  // (_: the base's step, in a cell with base=: parser/base.ts puts it there)
  if (c === '_') {
    s.i++;
    return { kind: 'rest', keep: true };
  }
  if (c === '[') {
    const start = s.i;
    if (isMixChord(s.text, s.i)) return parseMixChord(s);
    // [a|b|c]: one of them, each time round
    const close = s.text.indexOf(']', s.i);
    if (s.text.slice(s.i, close < 0 ? undefined : close).includes('|')) {
      s.i++;
      const values: number[] = [];
      const alters: number[] = [];
      for (;;) {
        s.skipSpace();
        const n = s.num('a number to choose from, like [0|4|7]');
        values.push(n.value);
        alters.push(n.alter);
        s.skipSpace();
        if (s.peek() === '|') {
          s.i++;
          continue;
        }
        if (s.peek() !== ']') s.fail(`A choice is numbers between bars, closed: [0|4|7]`, start, s.i - start + 1);
        s.i++;
        break;
      }
      if (values.length < 2) s.fail('A choice needs at least two: [0|4]', start, s.i - start);
      return { kind: 'choice', values, alters };
    }
    s.i++;
    const notes: number[] = [];
    const alters: number[] = [];
    const pitched: boolean[] = [];
    for (;;) {
      s.skipSpace();
      if (s.peek() === ']') break;
      if (notes.length > 0 && s.peek() === ',') {
        s.i++;
        s.skipSpace();
      }
      // a number (an index into the table) or a note by name (a pitch): [0, 2, 4], [C, E, G]
      const name = s.noteName();
      const n = name === null ? s.num('a number or a note name in a chord') : { value: name, alter: 0 };
      notes.push(n.value);
      alters.push(n.alter);
      pitched.push(name !== null);
    }
    s.i++;
    if (notes.length === 0) s.fail('Chord is empty', start, s.i - start);
    return { kind: 'chord', notes, alters, ...(pitched.some(Boolean) ? { pitched } : {}) };
  }
  if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
    const n = s.num('a number');
    return { kind: 'note', value: n.value, alter: n.alter };
  }
  // a note by name: a pitch, whatever the tables (C, F#, Bb3; octave 4 left out)
  const name = s.noteName();
  if (name !== null) return { kind: 'note', value: name, alter: 0, pitched: true };
  return s.fail(`Unexpected '${c}' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value`);
}

/** A step's modifiers, each at most once; the parser reads them through this table (and ? for chance). */
export const MODIFIERS = {
  '!': { field: 'repeat', syntax: syntax('modifier', 'x!n', 'Repeat: n copies of the step, each as long as one.', ['&beat step=4 0!4 2!2'], 'cell.md') },
  '*': { field: 'subdivide', syntax: syntax('modifier', 'x*n', 'Ratchet: the step played n times within its own length.', ['&hats step=2 0 0*2 0 0*3'], 'cell.md') },
  '@': { field: 'elongate', syntax: syntax('modifier', 'x@n', 'Hold: the step lasts n steps.', ['&tune step=2 0@2 2 4@3'], 'cell.md') },
} as const;
type ModKey = keyof typeof MODIFIERS;
export const CHANCE_SYNTAX = syntax(
  'modifier',
  'x? · x?p',
  "Chance: the step sounds with probability p (x? alone: the cell's chance=, ½ unless set). Reproducible: the same every time the piece is played; seed= gives another sequence.",
  ['&hats step=4 0 0? 0?.3 0', '&ghost chance=.2 step=4 0? 0? 0? 0?'],
  'cell.md',
);

export function parseToken(s: LineScanner): Token {
  const start = s.i;
  const atom = parseAtom(s);
  const mods = { repeat: 1, subdivide: 1, elongate: 1 };
  let chance: number | null | undefined;
  const seen = new Set<string>();
  while (s.peek() in MODIFIERS || s.peek() === '?') {
    if (s.peek() === '?') {
      // x?p: it sounds with probability p; x? alone: the cell's chance=
      if (chance !== undefined) s.fail(`'?' can only appear once per step`);
      s.i++;
      const at = s.i;
      const p = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
      chance = p === null ? null : parseFloat(p);
      if (p === null && /[0-9]/.test(s.peek() ?? '')) s.fail('A probability is from 0 to 1: x?.3', at, 1);
      continue;
    }
    const op = s.peek() as ModKey;
    if (seen.has(op)) s.fail(`'${op}' can only appear once per step`);
    seen.add(op);
    s.i++;
    const at = s.i;
    const n = s.int(`a count after ${op}`);
    if (n < 1 || n > MAX_REPS) s.fail(`Count must be between 1 and ${MAX_REPS}`, at, s.i - at);
    mods[MODIFIERS[op].field] = n;
  }
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}' — separate steps with spaces`);
  return { atom, ...mods, ...(chance !== undefined ? { chance } : {}), span: s.span(start) };
}
