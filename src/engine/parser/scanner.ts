/** The scanner: one line of a piece (continued lines joined), read left to right. */
import type { CellDecl, Diagnostic, FreeSpec, Pick, Ref, Span } from '../ast';
import { parseBody } from './cell';
import { syntax, type Syntax } from './syntax';

/** References to a cell, and how they pick from it, turn it and transpose it. */
export const REFERENCE_SYNTAX: readonly Syntax[] = [
  syntax('reference', '&name', 'A cell, by name: in a braid (spliced in), after an attribute (over=&scale), in a mix.', ['&theme step=2 &motif 0'], 'cell.md'),
  syntax('reference', '&name[i]', 'One entry of its braid as written, counted from 0; negative from the end (&x[-1] the last).', ['&tune step=2 &motif[0] &motif[-1]'], 'braid.md'),
  syntax(
    'reference',
    '&name[a:b] · &name[a:b:s]',
    'A slice, Python-style: from a up to b (either may be left out), every s-th; [::-1] backwards (retrograde).',
    ['&tune step=2 &motif[1:3] &motif[:-1] &motif[::-1] &motif[::2]'],
    'braid.md',
  ),
  syntax(
    'reference',
    '&name[<<n] · &name[>>n]',
    'Shifted back or forward n places (1 if left out), on top of its own shift=: rotating it, climbing the helix.',
    ['&canon step=2 &theme[>>4]', '&mode over=&scale[<<] 0 2 4'],
    'braid.md',
  ),
  syntax('reference', '&name^n', 'In a braid, transposed: what it plays, n grid steps up (^-n down) through its tables.', ['&answer step=2 &subject^7 &subject^-12'], 'braid.md'),
  syntax(
    'reference',
    '&( … )',
    'An unnamed cell, written where it is used, with attributes and a braid of its own.',
    ['&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)'],
    'cell.md',
  ),
];

export const IDENT = /[A-Za-z_][A-Za-z0-9_]*/y;
const INT = /-?[0-9]+/y;
export const NUM = /-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y;
// a long rest is legitimate (a voice waiting out a whole prelude: ~@617); this only guards against typos
export const MAX_REPS = 4096;
/**
 * How deep unnamed cells &( … ) may nest, one inside another, and parentheses in a mix: deeper is an error (reading
 * 1,500 deep, or 5,000 parentheses, overflowed the stack). The examples nest one deep (an envelope in a voice's line,
 * a sum in a product); 32 leaves room for any written by hand.
 */
export const MAX_NESTING = 32;

export class LineError extends Error {
  constructor(
    message: string,
    readonly col: number,
    readonly len = 1,
  ) {
    super(message);
  }
}

export class LineScanner {
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
    /** How many unnamed cells &( … ) this text is inside. */
    readonly depth = 0,
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
    if (this.depth >= MAX_NESTING) this.fail(`Unnamed cells &( … ) nest ${MAX_NESTING} deep at most: name the inner ones (&env …) and refer to them`, open - 1, 2);
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
    const inner = new LineScanner(this.text.slice(open + 1, close), this.line, this.offset + open + 1, this.lambdas, this.parts, this.warnings, this.depth + 1);
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
export function stripComment(raw: string): string {
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
