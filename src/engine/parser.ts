/**
 * Parser for the cell language. One cell or command per line:
 *
 *   cell     := REF item*                         (REF here: a name, &theme)
 *   item     := 'over=' (REF | 'scale(' INT ',' INT ')') | 'shift=' INT | 'cycle=' INT | ('step=' | 'loop=') STEP | 'stride=' INT
 *             | 'map=' (MAP | REF) | 'off' | KEY '=' VALUE | generator | token
 *               KEY and VALUE: every attribute is in attributes.ts (what it takes, what it acts on)
 *   STEP     := (REF | 'cycle(' REF ')') (('*' | '/') NUM)*   driven by another cell (*2/3: three per two)
 *             | NUM ('bpm' | 'hz' | 'k')?                     a rate per second
 *             | ENV                                          provided by the environment: SAMPLE_RATE, A4, C#3, Bb2 …
 *   generator:= 'scan(' (NUM ('!' INT)? | 'geo(' NUM ',' INT ',' NUM+ ')')+ ')' | 'sin(' INT ')' | 'euclid(' INT ',' INT (',' INT)? ')'
 *             | 'meter(' … ')' | 'spell(' … ')'
 *               scan: running totals of intervals (scales, meters); geo(r, n, k…): intervals r^(k/n)
 *   token    := atom (('!' | '*' | '@') INT)*     each modifier at most once
 *   atom     := REF | '~' | NUM | '[' NUM (','? NUM)* ']' | '[' EXPR (',' EXPR)* ']'    the last: a mix
 *   REF      := '&' (IDENT | '(' item* ')') ('[' INT ']' | '[' INT? ':' INT? (':' INT?)? ']' | '[' INT? ':' INT? ']' | '[' ('<<' | '>>') INT? ']')?
 *               a pick from the braid as written: &x[0] first, &x[-1] last, &x[-1:], &x[:-1]
 *               or a shift: &x[<<] back one, &x[>>2] forward two (relative, climbing the helix);
 *               then, in a braid, ^n: what it plays n grid steps up (&subject^7, &subject^-12)
 *   NUM      := '-'? (DIGITS ('.' DIGITS)? | '.' DIGITS) ('#' | 'b')*
 *   EXPR     := PRODUCT (('+' | '-') PRODUCT)*        inside a mix chord
 *   PRODUCT  := FACTOR ('*' FACTOR)*
 *   FACTOR   := REF | NUM | '(' EXPR ')'
 * A line ending in '+', '*', ',' or '[' continues on the next line.
 *
 * Comments: `//` anywhere, or `#` at the start of a line or after a space
 * (a `#` glued to a number is a sharp). Errors are collected per line.
 */
import type { Atom, Braid, CellDecl, Diagnostic, Expr, FreeSpec, MapSpec, ParamCells, ParseResult, Pick, Ref, Span, StepSpec, Token } from './ast';
import { RETIRED_PARAMS, TIME_PARAMS, canonical, isDoughParam } from './dough-params';
import { CELL_PARAMS, CORE, PARAMS, nearestAttribute } from './attributes';
import { agogic as agogicPositions, even as evenPositions, intervals } from '../theory/modes';

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/y;
const INT = /-?[0-9]+/y;
const NUM = /-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y;
// a long rest is legitimate (a voice waiting out a whole prelude: ~@617); this only guards against typos
const MAX_REPS = 4096;

class LineError extends Error {
  constructor(message: string, readonly col: number, readonly len = 1) {
    super(message);
  }
}

class LineScanner {
  i = 0;
  /**
   * `offset`: where this text starts in its line (unnamed cells are parsed from
   * inside one). `lambdas`: unnamed cells found so far, declared alongside.
   */
  /** free(…) found in this text. */
  frees: FreeSpec[] = [];
  constructor(
    readonly text: string,
    readonly line: number,
    readonly offset = 0,
    readonly lambdas: CellDecl[] = [],
    /** Where each original line starts in a joined (continued) line: to place a span in the source. */
    readonly parts: readonly { line: number; start: number }[] = [{ line, start: 0 }],
    /** Warnings found so far (shared with the unnamed cells inside). */
    readonly warnings: Diagnostic[] = [],
  ) {}
  warn(message: string, start: number, len: number): void {
    this.warnings.push({ severity: 'warning', message, span: { ...this.place(start), len } });
  }
  /** The source position of text from `start` to here (across continued lines). */
  place(start: number): Span {
    const at = start + this.offset;
    let part = this.parts[0];
    for (const p of this.parts) if (p.start <= at) part = p;
    return { line: part.line, col: at - part.start + 1, len: Math.max(1, this.i - start) };
  }

  skipSpace(): void {
    while (this.i < this.text.length && /\s/.test(this.text[this.i])) this.i++;
  }
  done(): boolean {
    this.skipSpace();
    return this.i >= this.text.length;
  }
  peek(): string {
    return this.text[this.i] ?? '';
  }
  span(start: number): Span {
    return { line: this.line, col: start + 1 + this.offset, len: Math.max(1, this.i - start) };
  }
  fail(message: string, start = this.i, len = 1): never {
    throw new LineError(message, start + this.offset, len);
  }
  match(re: RegExp): string | null {
    re.lastIndex = this.i;
    const m = re.exec(this.text);
    if (!m) return null;
    this.i += m[0].length;
    return m[0];
  }
  ident(what: string): string {
    const id = this.match(IDENT);
    if (id === null) this.fail(`Expected ${what}`);
    return id;
  }
  int(what: string): number {
    const n = this.match(INT);
    if (n === null) this.fail(`Expected ${what}`);
    return parseInt(n, 10);
  }
  num(what: string): { value: number; alter: number } {
    const n = this.match(NUM);
    if (n === null) this.fail(`Expected ${what}`);
    let value = parseFloat(n);
    // a fraction: 9/8, 3/2 (ratios for map=ratios grids)
    if (this.peek() === '/' && /[0-9.]/.test(this.text[this.i + 1] ?? '')) {
      this.i++;
      const d = this.match(NUM);
      if (d === null || !(parseFloat(d) !== 0)) this.fail('a fraction needs a denominator, like 9/8');
      value /= parseFloat(d);
    }
    let alter = 0;
    while (this.peek() === '#' || this.peek() === 'b') alter += this.text[this.i++] === '#' ? 1 : -1;
    return { value, alter };
  }
  expect(ch: string, what: string): void {
    if (this.peek() !== ch) this.fail(`Expected ${what}`);
    this.i++;
  }
  /**
   * `&( … )`: an unnamed cell, written where it's used — the same body as a
   * declaration (`&(even(7,12,5) over=&key)`). Declared alongside under a
   * name of its own; returns that name.
   */
  lambda(): string {
    const open = this.i;
    let depth = 0;
    let close = -1;
    for (let k = open; k < this.text.length; k++) {
      if (this.text[k] === '(') depth++;
      else if (this.text[k] === ')' && --depth === 0) {
        close = k;
        break;
      }
    }
    if (close < 0) this.fail(`')' to close &( … )`, open);
    const name = `λ${this.line}_${open + this.offset}`;
    const inner = new LineScanner(this.text.slice(open + 1, close), this.line, this.offset + open + 1, this.lambdas, this.parts, this.warnings);
    const decl = parseBody(inner, { name, pick: null, shift: 0, span: { line: this.line, col: open + this.offset, len: close - open + 2 } });
    this.lambdas.push({ ...decl, lambda: this.text.slice(open + 1, close).trim() });
    this.i = close + 1;
    return name;
  }

  /** `&name`, optionally picked: `&name[0]`, `&name[1:]`. */
  ref(what: string): Ref {
    const at = this.i;
    this.expect('&', what);
    const name = this.peek() === '(' ? this.lambda() : this.ident('a name after &');
    let pick: Pick | null = null;
    let shift = 0;
    if (this.peek() === '[') {
      this.i++;
      this.skipSpace();
      const dir = this.match(/<<|>>/y);
      if (dir) {
        this.skipSpace();
        const n = this.match(/[0-9]+/y);
        shift = (dir === '<<' ? -1 : 1) * (n === null ? 1 : parseInt(n, 10));
        this.skipSpace();
        this.expect(']', `']' to close &${name}[${dir}…]`);
        return { name, pick, shift, ...this.transposition(name), span: this.span(at) };
      }
      const a = this.match(INT);
      this.skipSpace();
      if (this.peek() === ':') {
        this.i++;
        this.skipSpace();
        const b = this.match(INT);
        this.skipSpace();
        // a third part is the step: [::-1] backwards, [::2] every other
        let step: number | null = null;
        if (this.peek() === ':') {
          this.i++;
          this.skipSpace();
          const at = this.i;
          const st = this.match(INT);
          if (st !== null && parseInt(st, 10) === 0) this.fail('A slice step of 0 never moves', at, st.length);
          step = st === null ? null : parseInt(st, 10);
          this.skipSpace();
        }
        pick = { kind: 'slice', from: a === null ? null : parseInt(a, 10), to: b === null ? null : parseInt(b, 10), ...(step !== null ? { step } : {}) };
      } else {
        if (a === null) this.fail(`Expected an index like &${name}[0], or a slice like &${name}[1:]`);
        pick = { kind: 'at', i: parseInt(a, 10) };
      }
      this.expect(']', `']' to close &${name}[…]`);
    } else if ((this.peek() === '+' || this.peek() === '-') && /[0-9]/.test(this.text[this.i + 1] ?? '')) {
      const sign = this.peek();
      const n = /[0-9]+/.exec(this.text.slice(this.i + 1))![0];
      this.fail(
        `&${name}${sign}${n}: write &${name}^${sign === '-' ? '-' : ''}${n} to transpose it (in a braid), &${name} ${sign} ${n} to add pitch (in a mix), &${name}[${sign === '-' ? '<<' : '>>'}${n === '1' ? '' : n}] to shift it, or &${name}[…] to pick from it`,
        at,
        this.i - at + 1 + n.length,
      );
    }
    return { name, pick, shift, ...this.transposition(name), span: this.span(at) };
  }
  /** `^n` after a reference: what it plays, n grid steps up (^-n down). */
  transposition(name: string): { transpose?: number } {
    if (this.peek() !== '^') return {};
    const at = this.i;
    this.i++;
    const n = this.match(/-?[0-9]+/y);
    if (n === null) this.fail(`&${name}^n transposes by n grid steps: &${name}^7, &${name}^-12`, at, 1);
    return parseInt(n!, 10) ? { transpose: parseInt(n!, 10) } : {};
  }
  atBoundary(): boolean {
    const c = this.peek();
    return c === '' || /\s/.test(c);
  }
}

/** Strip comments: `//` anywhere; `#` at line start or after whitespace. */
function stripComment(raw: string): string {
  // # (at line start or after a space) or // begin a comment — but not inside "…" (a label)
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === '/' && raw[i + 1] === '/') return raw.slice(0, i);
    else if (!quoted && ch === '#' && (i === 0 || /\s/.test(raw[i - 1]))) return raw.slice(0, i);
  }
  return raw;
}

function parseAtom(s: LineScanner): Atom {
  const c = s.peek();
  if (c === '&') {
    const r = s.ref('a cell like &motif');
    return { kind: 'ref', name: r.name, pick: r.pick, shift: r.shift, ...(r.transpose ? { transpose: r.transpose } : {}) };
  }
  if (c === '~') {
    s.i++;
    return { kind: 'rest' };
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
    for (;;) {
      s.skipSpace();
      if (s.peek() === ']') break;
      if (notes.length > 0 && s.peek() === ',') {
        s.i++;
        s.skipSpace();
      }
      const n = s.num('a number in chord');
      notes.push(n.value);
      alters.push(n.alter);
    }
    s.i++;
    if (notes.length === 0) s.fail('Chord is empty', start, s.i - start);
    return { kind: 'chord', notes, alters };
  }
  if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
    const n = s.num('a number');
    return { kind: 'note', value: n.value, alter: n.alter };
  }
  return s.fail(`Unexpected '${c}' — expected a number, ~, [chord], &cell or key=value`);
}

/** A chord holding cells (`[&theme * &lead, …]`) is a mix of sounds, not a chord of numbers. */
function isMixChord(text: string, at: number): boolean {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']' && --depth === 0) return false;
    else if (text[i] === '&') return true;
  }
  return false;
}

function parseMixChord(s: LineScanner): Atom {
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

const MODIFIERS = { '!': 'repeat', '*': 'subdivide', '@': 'elongate' } as const;
type ModKey = keyof typeof MODIFIERS;

function parseToken(s: LineScanner): Token {
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
    mods[MODIFIERS[op]] = n;
  }
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}' — separate steps with spaces`);
  return { atom, ...mods, ...(chance !== undefined ? { chance } : {}), span: s.span(start) };
}

/** Tempo markings for free(…): a range in bpm, centred. */
export const TEMPI: Readonly<Record<string, readonly [number, number]>> = {
  largo: [40, 60],
  larghetto: [60, 66],
  adagio: [66, 76],
  andante: [76, 108],
  moderato: [108, 120],
  allegro: [120, 156],
  vivace: [156, 176],
  presto: [168, 200],
};

/**
 * free(default, lo..hi) or free(marking) at the scanner (it's at 'free'):
 * the value, its range, and where it's written. `units`: what the value may
 * carry (a rate: bpm, hz, k).
 */
function parseFree(s: LineScanner, key: FreeSpec['key'], units: boolean): FreeSpec {
  const start = s.i;
  if (s.match(/free\(/y) === null) s.fail('free(…)');
  s.skipSpace();
  // a text left free: free("867 5309") — a field to type in (for spell(…))
  if (s.peek() === '"') {
    const q = s.match(/"[^"]*"/y)!;
    s.skipSpace();
    s.expect(')', `')' to close free("…")`);
    const spec: FreeSpec = { key: 'text', value: 0, unit: '', lo: 0, hi: 0, span: s.place(start), text: q.slice(1, -1) };
    s.frees.push(spec);
    return spec;
  }
  const word = s.match(/[a-z]+/y);
  let value: number;
  let unit = '';
  let lo: number;
  let hi: number;
  if (word !== null) {
    const range = TEMPI[word];
    if (!range || key === 'shift' || key === 'stride' || key === 'gain')
      s.fail(`free(${word}): a tempo marking (${Object.keys(TEMPI).join(', ')}) — for a rate`, start, s.i - start);
    [lo, hi] = range;
    value = Math.round((lo + hi) / 2);
    unit = 'bpm';
  } else {
    const n = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (n === null) s.fail('free(default, lo..hi), like free(90bpm, 60..240) or free(.8, 0..1)');
    value = parseFloat(n);
    if (units) unit = s.match(/bpm|hz|k/y) ?? '';
    s.skipSpace();
    s.expect(',', `',' then the range, like free(${n}${unit}, 60..240)`);
    s.skipSpace();
    const a = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (s.match(/\.\./y) === null) s.fail('a range lo..hi, like 60..240');
    const b = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (a === null || b === null) s.fail('a range lo..hi, like 60..240');
    lo = parseFloat(a);
    hi = parseFloat(b);
    if (!(lo < hi)) s.fail(`free(…): the range runs low to high (${lo}..${hi})`, start, s.i - start);
    if (value < lo || value > hi) s.fail(`free(…): ${value} is outside ${lo}..${hi}`, start, s.i - start);
  }
  s.skipSpace();
  // named choices: free(5, 0..15, "1 2 3 A …") — the names spread evenly over the range, a keypad
  let labels: string[] | undefined;
  if (s.peek() === ',') {
    s.i++;
    s.skipSpace();
    const q = s.match(/"[^"]*"/y);
    if (q === null) s.fail('names for the choices, in quotes: free(0, 0..3, "a b c d")');
    labels = q!.slice(1, -1).trim().split(/\s+/).filter(Boolean);
    // the names spread evenly over the range: one per value, or every 2nd (chords of two in a table) …
    const gap = labels.length > 1 ? (hi - lo) / (labels.length - 1) : 0;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || labels.length < 2 || !Number.isInteger(gap) || gap < 1)
      s.fail(`free(…, "${labels.join(' ')}"): the names spread evenly over ${lo}..${hi} — ${labels.length} names need ${labels.length - 1} equal whole steps (${lo}..${lo + labels.length - 1}, or every 2nd: ${lo}..${lo + 2 * (labels.length - 1)})`, start, s.i - start);
    s.skipSpace();
  }
  s.expect(')', `')' to close free(…)`);
  const spec: FreeSpec = { key, value, unit, lo, hi, span: s.place(start), ...(labels ? { labels } : {}) };
  s.frees.push(spec);
  return spec;
}

/** scan(…): intervals, separated by spaces or commas; any positive numbers. */
function parseScan(s: LineScanner, start: number): Braid {
  s.i++; // (
  const steps: number[] = [];
  for (;;) {
    s.skipSpace();
    if (s.peek() === ')') break;
    const at = s.i;
    if (s.text.startsWith('geo(', s.i)) {
      // geometric intervals: geo(r, n, k …) is r^(k/n) for each k — a series, as in Studie II
      s.i += 4;
      s.skipSpace();
      const r = s.num('a ratio, like geo(5, 25, 0 10 5)').value;
      s.skipSpace();
      s.expect(',', `',' then the steps per ratio: geo(${r}, 25, 0 10 5)`);
      s.skipSpace();
      const n = s.int('the steps per ratio');
      s.skipSpace();
      s.expect(',', `',' then the exponents: geo(${r}, ${n}, 0 10 5)`);
      const ks: number[] = [];
      for (;;) {
        s.skipSpace();
        if (s.peek() === ')') break;
        ks.push(s.num('an exponent').value);
      }
      s.i++;
      if (!(r > 0) || n < 1 || ks.length === 0) s.fail('geo(r, n, k …): r above 0, n ≥ 1, at least one k', at, s.i - at);
      for (const k of ks) steps.push(+Math.pow(r, k / n).toFixed(9));
      continue;
    }
    if (s.text.startsWith('free(', s.i)) {
      // an interval left to the performer: scan(free(2, 1..3) 1) — swing
      const f = parseFree(s, 'interval', false);
      if (!(f.lo > 0)) s.fail('A scan interval stays positive: give free(…) a range above 0', at, s.i - at);
      steps.push(f.value);
    } else {
      const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
      if (n === null || !(parseFloat(n) > 0)) s.fail('scan(…) takes positive intervals, like scan(2 2 1 2 2 2 1)', at);
      // x!n: the interval n times, as in braids (a tempo map: scan(1!432 .72!96 2!17))
      let times = 1;
      if (s.peek() === '!') {
        s.i++;
        const r = s.match(/[0-9]+/y);
        if (r === null || !(parseInt(r, 10) >= 1)) s.fail('x!n repeats an interval n times: scan(1!4 2)', at, s.i - at);
        times = parseInt(r!, 10);
      }
      for (let k = 0; k < times; k++) steps.push(parseFloat(n));
    }
    s.skipSpace();
    if (s.peek() === ',') s.i++;
  }
  s.expect(')', `')' to close scan(…)`);
  if (steps.length === 0) s.fail('scan(…) needs at least one interval', start, s.i - start);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  return { kind: 'scan', steps, span };
}

/**
 * Bjorklund's algorithm: k hits and n − k rests, the leftovers paired again and again until
 * one group is left — the Euclidean rhythms in their usual form (Toussaint): 3 in 8 x..x..x.
 */
export function bjorklund(k: number, n: number): boolean[] {
  if (k <= 0) return Array(n).fill(false);
  let a: boolean[][] = Array.from({ length: k }, () => [true]);
  let b: boolean[][] = Array.from({ length: n - k }, () => [false]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length);
    const paired = Array.from({ length: m }, (_, i) => [...a[i], ...b[i]]);
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = paired;
    b = rest;
  }
  return [...a, ...b].flat();
}

/**
 * spell(text, &table, "names"): a text, spelled through a table — each character that is one of
 * the names plays that entry of the table (&table[k], a chord as a whole), then a pause; a space
 * (or anything not among the names) is a rest as long. spell(free("867 5309"), &keys, "1 2 3 A …"):
 * a number dialled.
 */
function parseSpell(s: LineScanner, start: number): Braid {
  s.i++; // (
  s.skipSpace();
  let text: string;
  if (s.peek() === 'f') text = parseFree(s, 'text', false).text ?? '';
  else {
    const q = s.match(/"[^"]*"/y);
    if (q === null) s.fail('spell(text, &table, "names"): the text first — "867 5309" or free("867 5309")');
    text = q!.slice(1, -1);
  }
  s.skipSpace();
  s.expect(',', `',' then the table, like spell("867", &keys, "1 2 3 …")`);
  s.skipSpace();
  const table = s.ref('the table its characters pick from, like &keys');
  s.skipSpace();
  s.expect(',', `',' then the names of the table's entries, in quotes`);
  s.skipSpace();
  const q = s.match(/"[^"]*"/y);
  if (q === null) s.fail('the names of the table’s entries, in quotes: "1 2 3 A 4 5 6 B …"');
  const names = q!.slice(1, -1).trim().split(/\s+/).filter(Boolean);
  s.skipSpace();
  s.expect(')', `')' to close spell(…)`);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  const rest = { atom: { kind: 'rest' as const }, repeat: 1, subdivide: 1, elongate: 1, span };
  const tokens = [...text].flatMap((ch) => {
    const k = names.indexOf(ch);
    if (k < 0) return [rest, rest]; // (a space — or anything not on the keys — rests as long as a key)
    return [{ atom: { kind: 'ref' as const, name: table.name, pick: { kind: 'at' as const, i: k }, shift: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }, rest];
  });
  if (!tokens.length) tokens.push(rest);
  return { kind: 'list', tokens, span } as Braid;
}

/** A time signature's bar as levels: * the bar, + a beat, . a subdivision, , a finer one. */
const SIGNATURES: Record<string, number[]> = {
  // x/4: beats; x/8: eighths in groups (a beat a group)
  '2/4': [1, 1],
  '3/4': [1, 1, 1],
  '4/4': [1, 1, 1, 1],
  '5/4': [1, 1, 1, 1, 1],
  '6/8': [3, 3],
  '7/8': [2, 2, 3],
  '9/8': [3, 3, 3],
  '12/8': [3, 3, 3, 3],
  '5/8': [3, 2],
};
export function meterLevels(sig: string, sub: number): string {
  if (/^[*+\-.,]+$/.test(sig)) return sig;
  const groups = SIGNATURES[sig];
  if (!groups) return '';
  const compound = sig.endsWith('/8');
  let out = '';
  groups.forEach((g, i) => {
    if (!compound) {
      // a beat, then its subdivisions: the middle one . (an eighth), the others , (finer)
      out += i === 0 ? '*' : '+';
      for (let k = 1; k < sub; k++) out += sub % 2 === 0 && k === sub / 2 ? '.' : sub === 3 ? '.' : ',';
    } else {
      // a group of eighths: its first the beat, the others ., each eighth split into sub steps (,)
      for (let e = 0; e < g; e++) {
        out += e === 0 ? (i === 0 ? '*' : '+') : '.';
        for (let k = 1; k < sub; k++) out += ',';
      }
    }
  });
  return out;
}

/**
 * meter(signature, steps a beat): a bar as levels, one per step — 0 the downbeat (*, the bar's
 * tonic), 1 a beat (+), 2 a half (-), 3 a subdivision (.), 4 finer (,). Unused levels can be skipped:
 * *-+- and *.+. are both 4/4. The bpm counts the beats, not the steps.
 * meter("4/4", 2): *.+.+.+. ; meter("6/8"): *..+.. ; meter("*.+.+.."): as written.
 */
function parseMeter(s: LineScanner, start: number): Braid {
  s.i++; // (
  s.skipSpace();
  const arg = (what: string): string => {
    if (s.peek() === '"') return s.match(/"[^"]*"/y)!.slice(1, -1);
    if (s.peek() === 'f') {
      const f = parseFree(s, 'choice', false);
      if (f.key === 'text' || f.text !== undefined) return f.text ?? '';
      if (f.labels) return f.labels[Math.round((f.value - f.lo) / ((f.hi - f.lo) / Math.max(1, f.labels.length - 1) || 1))] ?? '';
      return String(f.value);
    }
    const n = s.match(/[0-9]+/y);
    if (n === null) s.fail(`${what}: in quotes ("4/4"), a number, or free(…)`);
    return n!;
  };
  const sig = arg('the time signature');
  s.skipSpace();
  let sub = 1;
  if (s.peek() === ',') {
    s.i++;
    s.skipSpace();
    sub = Math.max(1, Math.min(8, parseInt(arg('steps a beat'), 10) || 1));
    s.skipSpace();
  }
  s.expect(')', `')' to close meter(…)`);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  const levels = meterLevels(sig, sub);
  if (!levels) s.fail(`meter("${sig}"): a time signature (${Object.keys(SIGNATURES).join(' ')}) or levels like "*.+.+.+." (* bar, + beat, . subdivision, , finer)`, start, span.len);
  // 0-based: the downbeat is the bar's tonic — * 0, + 1 (a beat), - 2, . 3, , 4 (finer and finer)
  const value = (ch: string) => Math.max(0, '*+-.,'.indexOf(ch));
  const tokens = [...levels].map((ch) => ({ atom: { kind: 'note' as const, value: value(ch), alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }));
  const beats = [...levels].filter((ch) => ch === '*' || ch === '+').length || 1;
  return { kind: 'list', tokens, span, perBeat: levels.length / beats } as Braid;
}

function parseGenerator(s: LineScanner, name: string, start: number): Braid {
  if (name === 'scan') return parseScan(s, start);
  if (name === 'meter') return parseMeter(s, start);
  if (name === 'spell') return parseSpell(s, start);
  s.i++; // (
  const args: number[] = [];
  for (;;) {
    s.skipSpace();
    args.push(s.int(`a number in ${name}(…)`));
    s.skipSpace();
    if (s.peek() !== ',') break;
    s.i++;
  }
  s.expect(')', `')' to close ${name}(…)`);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  if (name === 'euclid') {
    // k hits as evenly as they go over n steps (Bjorklund's rhythms: euclid(3,8) the tresillo), shift turns it
    const [k, n, shift = 0] = args;
    if (args.length < 2 || args.length > 3 || !(n >= 1) || !(k >= 0 && k <= n)) s.fail('euclid(k, n): k hits spread evenly over n steps (0 ≤ k ≤ n), euclid(k, n, shift) turned', start, span.len);
    const pattern = bjorklund(k, n);
    const tokens = Array.from({ length: n }, (_, j) => {
      const i = (((j + shift) % n) + n) % n;
      const hit = pattern[i];
      return { atom: hit ? { kind: 'note' as const, value: 0, alter: 0 } : { kind: 'rest' as const }, repeat: 1, subdivide: 1, elongate: 1, span };
    });
    return { kind: 'list', tokens, span } as Braid;
  }
  if (name === 'sin') {
    const [n] = args;
    if (args.length !== 1 || n < 2) s.fail('sin(n): one cycle of a sine in n steps, n ≥ 2', start, span.len);
    return { kind: 'sin', n, span };
  }
  // even() and agogic() are scans now: say exactly which
  if (name === 'even') {
    const [k, n = 12, phase = 0] = args;
    const steps = k >= 1 && n >= k ? intervals(evenPositions(k, n, phase), n) : null;
    s.fail(steps ? `even(…) is gone: for a scale write scan(${steps.join(' ')}); for a rhythm, euclid(${k}, ${n}${phase ? `, ${phase}` : ''})` : 'even(…) is gone: write the intervals, scan(2 2 1 2 2 2 1), or a rhythm, euclid(3, 8)', start, span.len);
  }
  const [n, d] = args;
  const pct = agogicPositions(n, d).map((p) => Math.round((p / 12) * 100));
  s.fail(`agogic(…) is gone: write the beats as a scan, scan(${intervals(pct, 100).join(' ')})`, start, span.len);
}

function parseStep(s: LineScanner, whole: boolean): StepSpec {
  const start = s.i;
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, whole ? 'loop' : 'step', true);
    const perSecond = (f.value * (f.unit === 'k' ? 1000 : 1)) / (f.unit === 'bpm' ? 60 : 1);
    if (!(perSecond > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond, span: s.span(start), free: f };
  }
  const rate = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
  if (rate !== null) {
    const unit = s.match(/bpm|hz|k/y);
    const perSecond = (parseFloat(rate) * (unit === 'k' ? 1000 : 1)) / (unit === 'bpm' ? 60 : 1);
    if (!(perSecond > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond, span: s.span(start) };
  }
  const env = s.match(/[A-Z](?:[A-Z0-9_]*|[#b]?-?[0-9]+)(?![A-Za-z0-9_#])/y);
  if (env !== null) return { whole, kind: 'env', name: env, span: s.span(start) };
  if (s.peek() === '{') s.fail('{&x} is now written cycle(&x)');
  const cycle = s.match(/cycle\(/y) !== null;
  const what = whole ? 'loop' : 'step';
  const driver = s.ref(cycle ? 'a cell inside cycle( ), like cycle(&theme)' : `a cell or a rate after ${what}=, like ${what}=&meter`);
  if (driver.pick || driver.shift) s.fail(`${what}= takes a whole cell`, driver.span.col - 1, driver.span.len);
  if (cycle) s.expect(')', `')' to close cycle(&${driver.name})`);
  // a chain of *n and /n, read left to right: *2 once per two steps, /2 twice per step, *2/3 three per two
  let ratio = 1;
  let label = '';
  while (s.peek() === '*' || s.peek() === '/') {
    const op = s.text[s.i++];
    const at = s.i;
    const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
    if (n === null || !(parseFloat(n) > 0)) s.fail(`a positive number after ${op}`, at);
    ratio = op === '*' ? ratio / parseFloat(n) : ratio * parseFloat(n);
    label += `${op === '*' ? '×' : '÷'}${n}`;
  }
  return { whole, kind: 'driven', driver, cycle, ratio, label, span: s.span(start) };
}

function parseMap(s: LineScanner): MapSpec {
  const start = s.i;
  if (s.peek() === '&') {
    const table = s.ref('a table cell, like map=&curve');
    if (table.pick || table.shift) s.fail('map= takes a whole table', table.span.col - 1, table.span.len);
    return { kind: 'table', table, span: s.span(start) };
  }
  if (s.match(/sin\b/y)) s.fail('map=sin is gone: write the sine as the braid, sin(12) — or map=&table', start, 3);
  // ed(r): equal divisions of a ratio — a number or a fraction, ed(5), ed(3/2)
  if (s.match(/ed\(/y)) {
    const at = s.i;
    const r = s.match(/[0-9]+(?:\.[0-9]+)?(?:\/[0-9]+(?:\.[0-9]+)?)?/y);
    const [a, b = '1'] = (r ?? '').split('/');
    const period = parseFloat(a) / parseFloat(b);
    if (r === null || !(period > 1)) s.fail('ed(r) divides a ratio above 1: ed(2) is the octave, ed(3/2) the fifth, ed(5)', at);
    s.expect(')', `')' to close ed(…)`);
    return { kind: 'edo', period, span: s.span(start) };
  }
  const w = s.match(/amp|lin|sample|edo|adsr|ratios|db/y);
  if (w === null) s.fail('map= takes amp, lin, db, adsr, sample, edo, ed(r), ratios or a table cell (&curve)');
  if (w === 'edo') return { kind: 'edo', period: 2, span: s.span(start) };
  return { kind: w as 'amp' | 'lin' | 'sample' | 'adsr' | 'ratios' | 'db', span: s.span(start) };
}

function parseCell(s: LineScanner): CellDecl {
  s.skipSpace();
  if (s.text.startsWith('&(', s.i)) s.fail('An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …');
  const head = s.ref('a cell name like &theme');
  if (head.pick || head.shift)
    s.fail('Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here', head.span.col - 1, head.span.len);
  if (s.peek() === '(') s.fail(`&name(…) is gone — write over=&…`);
  return parseBody(s, head);
}

/** A cell's body: attributes and braid, up to the end of the scanner's text. */
function parseBody(s: LineScanner, head: Ref): CellDecl {
  let over: Ref | null = null;
  let shift: number | null = null;
  let cycle: number | null = null;
  let step: StepSpec | null = null;
  let map: MapSpec | null = null;
  let stride: number | null = null;
  let env: Ref | null = null;
  let pitch: Ref | null = null;
  let show: string | null = null;
  let label: string | null = null;
  let laps: number | null = null;
  let title: string | null = null;
  let tags: string | null = null;
  let about: Ref[] | null = null;
  let chance: number | null = null;
  let seed: number | null = null;
  let size: number | null = null;
  const paramCells: Record<string, ParamCells> = {};
  const paramClocks: Record<string, StepSpec> = {};
  let off = false;
  const params: Record<string, number | string> = {};
  const paramSpans: Record<string, Span> = {};
  const tokens: Token[] = [];
  let generator: Braid | null = null;

  while (!s.done()) {
    const at = s.i;
    const word = s.match(IDENT);
    if (word !== null && s.peek() === '=') {
      s.i++;
      const twice = () => s.fail(`${word}= is given twice`, at, word.length);
      if (word === 'over') {
        if (over) twice();
        const sc = s.match(/scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/y);
        if (sc) {
          // scale(tonic, phase): the 12 shifted to the tonic, even(7,12,phase) over it — written once
          const [, tonic, phase] = /scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/.exec(sc)!;
          over = { name: `scale:${parseInt(tonic, 10)}:${parseInt(phase, 10)}`, pick: null, shift: 0, span: s.span(at + 5) };
        } else if (s.match(/scale\(/y)) s.fail('scale(tonic, phase): like scale(0,2) for C Aeolian');
        else over = s.ref('a cell or scale(tonic, phase) after over=, like over=&scale');
        if (over.pick) s.fail('over= takes a whole table (shifting it is fine: over=&scale[<<])', over.span.col - 1, over.span.len);
      } else if (word === 'shift') {
        if (shift !== null) twice();
        shift = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, 'shift', false).value) : s.int('a whole number after shift=');
      } else if (word === 'chance') {
        // what a bare x? means in this cell: a probability, or a slider for one
        if (chance !== null) twice();
        if (s.text.startsWith('free(', s.i)) chance = parseFree(s, 'chance', false).value;
        else {
          const at2 = s.i;
          const n = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
          if (n === null) s.fail('chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)', at2, 1);
          chance = parseFloat(n!);
        }
      } else if (word === 'size') {
        // how large it's drawn, against the others: size=2 twice, size=.5 half
        if (size !== null) twice();
        const at2 = s.i;
        const n = s.match(/[0-9]*\.?[0-9]+/y);
        if (n === null || !(+n >= 0.25 && +n <= 4)) s.fail('size= is how large it is drawn, from .25 to 4: size=2', at2, Math.max(1, (n ?? '').length));
        size = +n!;
      } else if (word === 'seed') {
        if (seed !== null) twice();
        seed = s.int('a whole number after seed=');
      } else if (word === 'title' || word === 'tags') {
        // a piece's card: its title and tags, on a note
        if ((word === 'title' ? title : tags) !== null) twice();
        const q = s.match(/"([^"]*)"/y);
        if (q === null) s.fail(`${word}= takes a text in quotes: ${word === 'title' ? 'title="Swing blues"' : 'tags="jazz, blues"'}`);
        if (word === 'title') title = q!.slice(1, -1);
        else tags = q!.slice(1, -1);
      } else if (word === 'about') {
        // a note's links: the cells it explains. One cell, or several in parentheses: about=(&fenv &accent)
        if (about !== null) twice();
        const what = 'a cell after about=, like about=&fenv or about=(&fenv &accent)';
        about = [];
        if (s.peek() === '(') {
          s.i++;
          s.skipSpace();
          while (s.peek() !== ')') {
            if (s.done()) s.fail(`')' to close about=(…)`);
            about.push(s.ref(what));
            s.skipSpace();
          }
          s.i++;
          if (about.length === 0) s.fail(what, at, word.length + 1);
        } else about.push(s.ref(what));
      } else if (word === 'laps') {
        // laps=n: n laps, then silence — a piece that ends
        if (laps !== null) twice();
        const n = s.match(/[0-9]+/y);
        if (n === null || !(parseInt(n, 10) >= 1)) s.fail('laps= takes a count of laps, 1 or more: laps=1', at, word.length + 1);
        laps = parseInt(n!, 10);
      } else if (word === 'show') {
        // how the cell is shown (never how it sounds); the default for everything below it
        if (show !== null) twice();
        const at2 = s.i;
        const w = s.match(/[a-z]+/y);
        const SHOWS = ['braid', 'pattern', 'notes', 'midi', 'do', 'degrees', 'table', 'scale', 'mode', 'key', 'grid', 'meter', 'spectrum', 'wave', 'levels', 'adsr', 'mix', 'note', 'petal', 'off', 'matrix', 'lfo'];
        if (w === null || !SHOWS.includes(w)) s.fail(`show= takes one of: ${SHOWS.join(' ')}`, at2, Math.max(1, (w ?? '').length));
        // a naming convention: notes:flats, notes:sharps, notes:german, do:fixed
        let conv = '';
        if (s.peek() === ':') {
          s.i++;
          const cw = s.match(/[a-z]+/y) ?? '';
          const ok = (w === 'notes' && ['flats', 'sharps', 'german'].includes(cw)) || (w === 'do' && ['fixed', 'movable'].includes(cw));
          if (!ok) s.fail(`show=${w}: takes ${w === 'notes' ? 'flats, sharps or german' : w === 'do' ? 'fixed or movable' : 'no convention'}`, at2, s.i - at2);
          conv = `:${cw}`;
        }
        show = w + conv;
      } else if (word === 'label') {
        // a name to show (instead of &name) — or, alone on a line, a note in the graph
        if (label !== null) twice();
        const q = s.match(/"([^"]*)"/y);
        if (q === null) s.fail('label= takes a text in quotes: label="the King\'s theme"');
        label = q.slice(1, -1);
      } else if (word === 'env' || word === 'pitch') {
        // a voice's own: a volume (env=) or a pitch (pitch=) acting on every note it plays
        if ((word === 'env' ? env : pitch) !== null) twice();
        const r = s.ref(`a cell after ${word}=, like ${word}=&pluck or ${word}=&(map=adsr .01 .3 .5 .4)`);
        if (word === 'env') env = r;
        else pitch = r;
      } else if (word === 'cycle') {
        if (cycle !== null) twice();
        const vs = s.i;
        cycle = s.int('a whole number after cycle=');
        if (cycle < 1) s.fail('cycle must be at least 1', vs, s.i - vs);
      } else if (word === 'step' || word === 'loop') {
        if (step) s.fail(step.whole === (word === 'loop') ? `${word}= is given twice` : 'step= and loop= say the same thing two ways — pick one', at, word.length);
        step = parseStep(s, word === 'loop');
      } else if (word === 'map') {
        if (map) twice();
        map = parseMap(s);
      } else if (word === 'stride') {
        if (stride !== null) twice();
        stride = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, 'stride', false).value) : s.int('a whole number after stride=');
      } else if (CELL_PARAMS.has(word)) {
        // a cell named: fm= its modulator; write= a tape's source; play= a read head's tape
        if (word in params) twice();
        const r = s.ref(
          word === 'fm' ? 'a voice after fm=, like fm=&op'
          : word === 'write' ? 'what the tape records, like write=&melody'
          : word === 'play' ? 'the tape it reads, like play=&tape'
          : word === 'couple' ? 'the resonator it shares a table with, like couple=&fork'
          : word === 'sun' ? 'the law whose day it shows, like sun=&cycle'
          : 'what drives it, like excite=&mix',
        );
        params[word] = r.name;
        paramSpans[word] = r.span;
      } else if (isDoughParam(word)) {
        const key = canonical(word);
        if (key in params || key in paramCells || key in paramClocks) twice();
        if (key !== word) s.warn(`${word}= is dough's other name for ${key}=: write ${key}=`, at, word.length);
        const vs = s.i;
        // a time as a clock: delaytime=&bar/2
        if (s.peek() === '&' && TIME_PARAMS.has(key)) {
          const st = parseStep(s, false);
          if (st.kind !== 'driven') s.fail(`${word}= takes seconds, or a clock: ${word}=&bar/2`, vs, s.i - vs);
          paramClocks[key] = st;
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        // left free: lpf=free(1200, 200..5000), swing=free(.5, .5...75) — a slider, its name the setting's
        if (s.text.startsWith('free(', s.i)) {
          const f = parseFree(s, 'param', false);
          (f as { param?: string }).param = key;
          params[key] = f.value;
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        // moving: lpf=&sweep, lpf=200..3000 * &fenv * &accent
        const range = s.text.slice(s.i).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
        if (s.peek() === '&' || range) {
          if (range) s.i += range[0].length;
          const factors: Ref[] = [];
          if (!range) factors.push(s.ref(`a cell after ${word}=`));
          for (;;) {
            const save = s.i;
            s.skipSpace();
            if (s.peek() !== '*') {
              s.i = save;
              break;
            }
            s.i++;
            s.skipSpace();
            factors.push(s.ref(`a cell after *, like ${word}=200..3000 * &fenv`));
          }
          if (range && factors.length === 0) s.fail(`${word}=${range[0]}: a range is scaled by cells — ${word}=${range[0]} * &fenv`, vs, s.i - vs);
          if (!range && factors.length > 1) s.fail(`${word}=: several cells multiply a range — ${word}=200..3000 * &a * &b`, vs, s.i - vs);
          paramCells[key] = { range: range ? [parseFloat(range[1]), parseFloat(range[2])] : null, factors, span: s.span(vs) };
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        const v = s.match(/-?[A-Za-z0-9_.]+/y);
        if (v === null) s.fail(`Expected a value after ${word}=`);
        params[canonical(word)] = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(v) ? parseFloat(v) : v;
        paramSpans[canonical(word)] = s.span(vs);
      } else if (word === 'init') s.fail('init= is now shift=', at, word.length);
      else if (word === 'out' || word === 'time') s.fail(`${word}= is now a command: out(voice, &cell) / step(&meter, bpm=…)`, at, word.length);
      else if (word in RETIRED_PARAMS) s.fail(RETIRED_PARAMS[word], at, word.length);
      else {
        const near = nearestAttribute(word);
        s.fail(`Unknown attribute ${word}=${near ? ` — did you mean ${near}=?` : ''} (a cell: ${Object.keys(CORE).join(' ')}; a sound or a physical cell: ${Object.keys(PARAMS).join(' ')})`, at, word.length);
      }
      if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
      continue;
    }
    if ((word === 'scan' || word === 'even' || word === 'euclid' || word === 'agogic' || word === 'sin' || word === 'spell' || word === 'meter') && s.peek() === '(') {
      if (generator || tokens.length) s.fail('A cell has one braid: a generator or a list of steps', at, word.length);
      generator = parseGenerator(s, word, at);
      continue;
    }
    if (word === 'off' && s.atBoundary()) {
      if (off) s.fail('off is given twice', at, word.length);
      off = true;
      continue;
    }
    if (word !== null) s.fail(`Unexpected '${word}'`, at, word.length);
    if (generator) s.fail('A cell has one braid: a generator or a list of steps');
    tokens.push(parseToken(s));
  }

  const braid: Braid = generator ?? (tokens.length ? { kind: 'list', tokens } : { kind: 'blank' });
  return { name: head.name, span: head.span, over, shift, off, step, map, stride, cycle, env, pitch, show, label, title, tags, about: about ?? undefined, laps, chance, seed, size, params, paramSpans, paramCells, paramClocks, braid, frees: [...s.frees] };
}

// ---- a mix chord: parsed to a small tree; compile types it and distributes it (algebra.ts)


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

export function parse(source: string): ParseResult {
  const cells: CellDecl[] = [];
  const diagnostics: Diagnostic[] = [];
  // a line ending in + * , or [ (outside comments) continues on the next one
  const lines: { text: string; line: number; parts: { line: number; start: number }[] }[] = [];
  let carry: { text: string; line: number; parts: { line: number; start: number }[] } | null = null;
  source.split('\n').forEach((raw, idx) => {
    const text = stripComment(raw);
    if (carry) {
      carry.text += ' ';
      carry.parts.push({ line: idx + 1, start: carry.text.length });
      carry.text += text;
    } else carry = { text, line: idx + 1, parts: [{ line: idx + 1, start: 0 }] };
    if (!/[+*,[]\s*$/.test(carry.text)) {
      lines.push(carry);
      carry = null;
    }
  });
  if (carry) lines.push(carry);
  lines.forEach(({ text, line: lineNo, parts }) => {
    const s: LineScanner = new LineScanner(text, lineNo, 0, [], parts, diagnostics);
    if (s.done()) return;
    try {
      const start = s.i;
      const word = s.match(IDENT);
      if (word === 'step' && s.peek() === '(') s.fail('step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm', start, 4);
      else if (word === 'out' && /^\s*[(=]/.test(s.text.slice(s.i)))
        s.fail('out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix', start, 3);
      else if (word === 'cell') s.fail('The cell keyword is gone: a line starting with &name declares a cell', start, 4);
      else if (word === null) {
        s.i = start;
        const decl = parseCell(s);
        cells.push(decl, ...s.lambdas);
      } else s.fail(`A line declares a cell: &name …`, start, word.length);
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      diagnostics.push({ severity: 'error', message: e.message, span: { line: lineNo, col: e.col + 1, len: e.len } });
    }
  });
  return { cells, diagnostics };
}


/** A piece's card: the first note with a title= — its title, its description (the label, as plain text), its tags. */
export interface PieceMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** The note it's on. */
  readonly cell: string;
}

export function pieceMeta(source: string): PieceMeta | null {
  const d = parse(source).cells.find((c) => c.title);
  if (!d) return null;
  const plain = (d.label ?? '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tags = (d.tags ?? '')
    .split(',')
    .map((t) => t.trim()) // (as written: names keep their capitals — Bach, Wendy Carlos)
    .filter(Boolean)
    // (once each, whatever the case: the first spelling stays)
    .filter((t, i, all) => all.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i);
  // (a description that opens with the title doesn't need to say it twice)
  const description = plain.toLowerCase().startsWith(d.title!.toLowerCase()) ? plain.slice(d.title!.length).replace(/^[\s,.:;—–-]+/, '') : plain;
  return { title: d.title!, description, tags: [...new Set(tags)], cell: d.name };
}
