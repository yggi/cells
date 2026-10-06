/**
 * Source edits for the visual editor. The code is the single source of truth:
 * every change made in the graph (turning a cell, switching it off) is a
 * small rewrite of the cell's own line, keeping its comment and the rest of
 * the line as written. Pure string → string, so the code view stays 1:1.
 */

/** Split a line into code and its trailing comment (`//`, or `#` at start / after a space). */
export function splitComment(line: string): [string, string] {
  let cut = line.indexOf('//');
  if (cut < 0) cut = line.length;
  for (let i = 0; i < cut; i++)
    if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      cut = i;
      break;
    }
  return [line.slice(0, cut), line.slice(cut)];
}

const headOf = (name: string) => new RegExp(`^(\\s*&${name})(?=\\s|$)`);

/** 0-based index of the line declaring &name, or -1. */
export function declLine(source: string, name: string): number {
  const head = headOf(name);
  return source.split('\n').findIndex((l) => head.test(splitComment(l)[0]));
}

/** Rewrite the code part of &name's line; comments and other lines untouched. */
function editDecl(source: string, name: string, f: (code: string, head: RegExp) => string): string {
  const lines = source.split('\n');
  const i = declLine(source, name);
  if (i < 0) return source;
  const [code, comment] = splitComment(lines[i]);
  let next = f(code, headOf(name));
  // keep a comment's alignment where possible: pad or trim spaces before it
  if (comment) {
    const before = code.length;
    const trimmed = next.replace(/\s+$/, '');
    next = trimmed + ' '.repeat(Math.max(1, before - trimmed.length));
  }
  lines[i] = next + comment;
  return lines.join('\n');
}

/** Set (or with null, remove) a `key=value` attribute on &name. New attributes go right after the name. */
export function setAttr(source: string, name: string, key: string, value: string | null): string {
  return editDecl(source, name, (code, head) => {
    // a value is a word, or a word with (…) in it (free(0, 0..6), cycle(&bar)*2)
    const val = `(?:"[^"]*"|[^\\s(]*\\([^)]*\\)[^\\s]*|\\S+)`;
    const attr = new RegExp(`(\\s)${key}=${val}`);
    if (attr.test(code)) return value === null ? code.replace(new RegExp(`\\s${key}=${val}`), '') : code.replace(attr, `$1${key}=${value}`);
    return value === null ? code : code.replace(head, `$1 ${key}=${value}`);
  });
}

/** Add or remove a bare flag (`off`) on &name. */
function setFlag(source: string, name: string, flag: string, on: boolean): string {
  return editDecl(source, name, (code, head) => {
    const re = new RegExp(`\\s${flag}(?=\\s|$)`);
    if (re.test(code)) return on ? code : code.replace(re, '');
    return on ? code.replace(head, `$1 ${flag}`) : code;
  });
}

/** shift=n on &name (0 removes it). */
export const setShift = (source: string, name: string, shift: number) => setAttr(source, name, 'shift', shift === 0 ? null : String(shift));

/** `off` on &name. */
export const setOff = (source: string, name: string, off: boolean) => setFlag(source, name, 'off', off);

// ------------------------------------------------------------------ whole-line edits

/** Split code into words at whitespace outside brackets, parentheses and quotes (`[0, 4, 7]`, `label="a b"` stay one word). */
export function splitWords(code: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = '';
  for (const ch of code) {
    // a quoted text (a label) is one word, spaces and brackets and all
    if (ch === '"') quoted = !quoted;
    if (!quoted && (ch === '[' || ch === '(')) depth++;
    if (!quoted && (ch === ']' || ch === ')')) depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0 && !quoted) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const isAttrWord = (w: string) => /^[a-z][a-zA-Z]*=/.test(w) || w === 'off';

/** Does &name's declaration continue onto further lines (a mix written over several)? */
export function spansLines(source: string, name: string): boolean {
  const i = declLine(source, name);
  return i >= 0 && /[+*,[]\s*$/.test(splitComment(source.split('\n')[i])[0]);
}

/** The words of &name's declaration: head (`&name`), attributes (`key=value`, `off`), braid. */
export function declWords(source: string, name: string): { head: string[]; attrs: string[]; braid: string[] } | null {
  const i = declLine(source, name);
  if (i < 0) return null;
  const words = splitWords(splitComment(source.split('\n')[i])[0]);
  const head = words.slice(0, 1);
  const rest = words.slice(head.length);
  return { head, attrs: rest.filter(isAttrWord), braid: rest.filter((w) => !isAttrWord(w)) };
}

/** The attributes of &name as written: key → value text (`off` → ''). */
export function attrsOf(source: string, name: string): Map<string, string> {
  const w = declWords(source, name);
  const out = new Map<string, string>();
  for (const a of w?.attrs ?? []) {
    const eq = a.indexOf('=');
    if (eq < 0) out.set(a, '');
    else out.set(a.slice(0, eq), a.slice(eq + 1));
  }
  return out;
}

/** Replace &name's braid with these tokens (attributes and comment stay). An empty list leaves it blank. */
export function setBraid(source: string, name: string, braid: readonly string[]): string {
  const w = declWords(source, name);
  if (!w || spansLines(source, name)) return source;
  return editDecl(source, name, (code) => {
    const indent = /^\s*/.exec(code)![0];
    return indent + [...w.head, ...w.attrs, ...braid].join(' ');
  });
}

/** step= and loop= are one setting written two ways: setting one clears the other. */
export function setTiming(source: string, name: string, key: 'step' | 'loop', value: string | null): string {
  const other = key === 'step' ? 'loop' : 'step';
  return setAttr(setAttr(source, name, other, null), name, key, value);
}

/** Remove &name's declaration (with any continuation lines). */
export function deleteCell(source: string, name: string): string {
  const lines = source.split('\n');
  const i = declLine(source, name);
  if (i < 0) return source;
  let end = i;
  while (end + 1 < lines.length && /[+*,[]\s*$/.test(splitComment(lines[end])[0])) end++;
  lines.splice(i, end - i + 1);
  return lines.join('\n');
}

/** Cells that mention &name somewhere in their declaration (they'd break if it went). */
export function usersOf(source: string, name: string): string[] {
  const re = new RegExp(`&${name}(?![A-Za-z0-9_])`);
  const users: string[] = [];
  for (const line of source.split('\n')) {
    const code = splitComment(line)[0];
    const head = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(code);
    if (!head || head[1] === name) continue;
    if (re.test(code.slice(head[0].length))) users.push(head[1]);
  }
  return users;
}

/** A fresh name: cell1, cell2, … (the first not taken). */
export function freshName(source: string, stem = 'cell'): string {
  for (let k = 1; ; k++) if (declLine(source, `${stem}${k}`) < 0) return `${stem}${k}`;
}

/** Append a new, blank cell — the chromatic default — and return its name. */
export function addCell(source: string): { source: string; name: string } {
  const name = freshName(source);
  const body = source.replace(/\s*$/, '');
  return { source: `${body}\n&${name}\n`, name };
}

/** A valid, free name for a cell? Returns why not, or null if fine. */
export function nameProblem(source: string, name: string, current?: string): string | null {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return 'Letters, digits and _ only, starting with a letter';
  if (name !== current && declLine(source, name) >= 0) return `&${name} already exists`;
  return null;
}

/** Rename &from to &to: its declaration and every reference to it (comments are left as written). */
export function renameCell(source: string, from: string, to: string): string {
  if (from === to || nameProblem(source, to, from)) return source;
  const re = new RegExp(`&${from}(?![A-Za-z0-9_])`, 'g');
  return source
    .split('\n')
    .map((line) => {
      const [code, comment] = splitComment(line);
      return code.replace(re, `&${to}`) + comment;
    })
    .join('\n');
}

/**
 * Split a token in two: `x@n` shares its length between two (`x@2` → `x x`),
 * anything else is doubled (`x` → `x x`, one step longer).
 */
export function splitToken(token: string): [string, string] {
  const m = /^(.*)@(\d+)$/.exec(token);
  if (m && +m[2] > 1) {
    const n = +m[2];
    const a = Math.floor(n / 2);
    const b = n - a;
    const w = (k: number) => (k === 1 ? m[1] : `${m[1]}@${k}`);
    return [w(a), w(b)];
  }
  return [token, token];
}

/** Replace the text at a span (1-based line and column) of the source. */
function replaceSpan(source: string, span: { line: number; col: number; len: number }, text: string): string {
  const lines = source.split('\n');
  const l = lines[span.line - 1];
  if (l === undefined) return source;
  lines[span.line - 1] = l.slice(0, span.col - 1) + text + l.slice(span.col - 1 + span.len);
  return lines.join('\n');
}

/** A free(…) with a new value, written back where it stands (a marking becomes explicit). */
export function setFree(
  source: string,
  spec: { value: number; unit: string; lo: number; hi: number; span: { line: number; col: number; len: number }; labels?: readonly string[]; text?: string },
  value: number | string,
): string {
  // a text: free("…") (quotes can't be inside: they're dropped)
  if (typeof value === 'string') return replaceSpan(source, spec.span, `free("${value.replace(/"/g, '')}")`);
  const v = Math.min(spec.hi, Math.max(spec.lo, value));
  const range = spec.hi - spec.lo;
  const digits = spec.labels ? 0 : range >= 20 ? 0 : range >= 2 ? 1 : 2;
  const named = spec.labels ? `, "${spec.labels.join(' ')}"` : '';
  const text = `free(${+v.toFixed(digits)}${spec.unit}, ${spec.lo}..${spec.hi}${named})`;
  return replaceSpan(source, spec.span, text);
}
