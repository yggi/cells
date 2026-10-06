/** A mix chord, `[&theme * &lead, …]`: sums and products of cells and numbers, kept as written (compile types them: algebra.ts). */
import type { Atom, Expr } from '../ast';
import { NUM, type LineScanner } from './scanner';
import { parseFree } from './free';
import { syntax, type Syntax } from './syntax';

/** A mix's syntax (what it means is the algebra: decision 006, mix.md). */
export const MIX_SYNTAX: readonly Syntax[] = [
  syntax(
    'mix',
    '[a, b, …]',
    'A mix: one chord of sounds, each a product or a sum. On the sound card (map=sample), one chord is mono, two are left and right.',
    ['&mix [&theme * &lead, &bass * 0.5]'],
    'mix.md',
  ),
  syntax(
    'mix',
    'p * s · v * s',
    'A pitch or a volume acting on a sound: the voice is the factor that is a sound, wherever it is written. `*` is commutative and associative; two pitches multiplied add.',
    ['&mix [&theme * &lead]', '&mix [&lead * &accent * &theme]'],
    'mix.md',
  ),
  syntax(
    'mix',
    'a + b · a - b',
    "Pitches add (subtract) in semitones; sounds mix (they can't be subtracted).",
    ['&mix [(&theme + &vibrato - 12) * &lead]', '&mix [&a * &lead + &b * &organ]'],
    'mix.md',
  ),
  syntax(
    'mix',
    'n',
    "A number takes its operator's sort: semitones in a sum (0 changes nothing), a gain in a product (1 changes nothing).",
    ['&mix [(&pedal + 12) * &bass * 0.8]'],
    'mix.md',
  ),
  syntax('mix', 'free(v, lo..hi)', 'A gain left to the performer.', ['&mix [&theme * &lead * free(.8, 0..1)]'], 'free.md'),
  syntax('mix', '( … )', "Grouping. By the laws, grouping and order don't change what plays.", ['&mix [&theme * (&lead + &organ) * 0.5]'], 'mix.md'),
];

/** A chord holding cells (`[&theme * &lead, …]`) is a mix of sounds, not a chord of numbers. */
export function isMixChord(text: string, at: number): boolean {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']' && --depth === 0) return false;
    else if (text[i] === '&') return true;
  }
  return false;
}

export function parseMixChord(s: LineScanner): Atom {
  s.i++; // [
  const exprs: Expr[] = [];
  for (;;) {
    exprs.push(parseExpr(s));
    s.skipSpace();
    if (s.peek() === ',') {
      s.i++;
      continue;
    }
    s.expect(']', `',' or ']' in the mix`);
    return { kind: 'mix', exprs };
  }
}

function parseExpr(s: LineScanner): Expr {
  const start = s.i;
  const items: { e: Expr; sign: 1 | -1 }[] = [{ e: parseProduct(s), sign: 1 }];
  for (;;) {
    s.skipSpace();
    const op = s.peek();
    if (op !== '+' && op !== '-') break;
    s.i++;
    items.push({ e: parseProduct(s), sign: op === '-' ? -1 : 1 });
  }
  return items.length === 1 ? items[0].e : { k: 'sum', items, span: s.span(start) };
}

function parseProduct(s: LineScanner): Expr {
  s.skipSpace();
  const start = s.i;
  const factors: Expr[] = [parseFactor(s)];
  for (;;) {
    s.skipSpace();
    if (s.peek() !== '*') break;
    s.i++;
    factors.push(parseFactor(s));
  }
  return factors.length === 1 ? factors[0] : { k: 'prod', factors, span: s.span(start) };
}

function parseFactor(s: LineScanner): Expr {
  s.skipSpace();
  const start = s.i;
  if (s.peek() === '(') {
    s.i++;
    const e = parseExpr(s);
    s.skipSpace();
    s.expect(')', `')' to close the group`);
    return e;
  }
  if (s.peek() === '&') return { k: 'ref', ref: s.ref('a cell, like &theme') };
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, 'gain', false);
    return { k: 'num', value: f.value, span: s.span(start) };
  }
  const n = s.match(NUM);
  if (n !== null) return { k: 'num', value: parseFloat(n), span: s.span(start) };
  if (s.match(/gate\(/y)) s.fail('gate(…) is planned but not built yet: for now a step= term articulates, loop= terms bend', start, 5);
  return s.fail(`Expected a cell, a number or '(' here`);
}
