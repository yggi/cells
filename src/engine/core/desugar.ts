/**
 * De-sugar (decision 069 §2, #482): the sugar rows of decision 068 that the letters settle, each a family written as a
 * function of the text, rewriting every place it finds or none. Lifted from `tools/compileprobe.ts` (#441), where each was
 * measured exact by S1 and idempotent over every example. The rows that need what the text means (`LEFT`) are not
 * rewritten yet: `toCore` reports where they are still written. Pure.
 */
import { parse } from '../parser';
import { noteFrequency, type CompileOptions } from '../program';
import { expansion } from '../use';
import { readFrom, readUse } from '../parser/use';
import type { Resolve } from '../program';
import { splitComment } from '../edit';

/** A number as a text writes it: every digit of the double, one spelling for one number (S1 would hear a few as the same, decision 070). */
const num = (x: number) => String(x);

/** One family: its rows of decision 068's table (418's note), and its rewrite of a whole text (the text itself when it finds nothing). */
export interface Family {
  readonly key: string;
  readonly rows: string;
  readonly rewrite: (text: string, options: CompileOptions) => string;
}

/** Each line's code and comment, the code rewritten by `f` (a comment and a string stay as written). */
const codeWise = (text: string, f: (code: string) => string) =>
  text
    .split('\n')
    .map((raw) => {
      const [code, comment] = splitComment(raw);
      // (a quoted string is a title, a fragment's id, a meter's signature: no number in it is a unit)
      const parts = code.split(/("(?:[^"\\]|\\.)*")/);
      const done = parts.map((p, i) => (i % 2 ? p : f(p))).join('');
      return comment ? `${done}${comment}` : done;
    })
    .join('\n');

const UNIT: Record<string, number> = { bpm: 1 / 60, hz: 1, min: 1 / 60, h: 1 / 3600, d: 1 / 86400, wk: 1 / 604800, k: 1000 };

/** The families written as functions of the text alone. */
export const FAMILIES: readonly Family[] = [
  {
    key: 'comments',
    rows: '5 `#` `//`',
    rewrite: (text) =>
      text
        .split('\n')
        .map((raw) => splitComment(raw)[0].replace(/\s+$/, ''))
        .filter((l) => l.trim())
        .join('\n'),
  },
  {
    key: 'from',
    rows: '7 `from`',
    // (a `from` line's fragment written in, read through the caller's library: none, and the line stays)
    rewrite: (text, options) => (options.resolve ? inPlace(text, options.resolve) : text),
  },
  {
    key: 'units',
    rows: '58–64 `bpm` `hz` `min` `h` `d` `wk` `k`',
    rewrite: (text) =>
      codeWise(text, (c) =>
        c
          // (a slider keeps its unit, the performer's: `CONTEXT`'s)
          .split(/(\bfree\([^)]*\))/)
          .map((part, i) => (i % 2 ? part : part.replace(/(?<=[=(,\s*])(-?\d*\.?\d+)(bpm|hz|min|h|d|wk|k)(?![A-Za-z0-9_])/g, (_, n: string, u: string) => num(+n * UNIT[u]!))))
          .join(''),
      ),
  },
  {
    key: 'note names',
    rows: '50 `loop=NAME`',
    rewrite: (text) =>
      codeWise(text, (c) =>
        c.replace(/(?<=\bloop=)([A-Ga-g](?:#|b)?-?\d+)(?![A-Za-z0-9_])/g, (name: string) => {
          const f = noteFrequency(name);
          return f === null ? name : num(f);
        }),
      ),
  },
  {
    key: 'unnamed cells',
    rows: '36 `&( … )`',
    rewrite: (text) => {
      // (innermost first: a body with no `&(` in it, named &_c1, &_c2 … and written as a line of its own at the end)
      const lifted: string[] = [];
      let now = text;
      for (let at = innermost(now); at; at = innermost(now)) {
        const name = `_c${lifted.length + 1}`;
        lifted.push(`&${name} ${at.body.trim()}`);
        now = now.slice(0, at.start) + `&${name}` + now.slice(at.end);
      }
      return lifted.length ? `${now.replace(/\s+$/, '')}\n${lifted.join('\n')}` : text;
    },
  },
  {
    key: 'repeats',
    rows: '21 `x!n`',
    rewrite: (text) =>
      // (a cell read by its units, picked or rotated, `&john[<<]`, counts `&a!2` as one unit and `&a &a` as two: left)
      tokenWise(text, (tok, cell) => (unitRead(text).has(cell) ? tok : repeated(tok))),
  },
  {
    key: 'scans',
    rows: '37 `scan(i …)`',
    rewrite: (text) =>
      codeWise(text, (c) =>
        // (a scan read as a table; one with a step= is a meter, its numbers the lengths of its steps: `CONTEXT`'s)
        /\bstep=/.test(c)
          ? c
          : c.replace(/\bscan\(([-\d.\s]+)\)/g, (written, body: string) => {
              const steps = body.trim().split(/\s+/).map(Number);
              if (steps.some((s) => !Number.isFinite(s))) return written;
              let at = 0;
              return steps.map((s) => ((at += s), num(at - s))).join(' ');
            }),
      ),
  },
];

/**
 * A text's `use` and `from` lines written out where each stands, as `expand` writes them after the piece: a fragment's
 * lines in the place of the line that took them, so writing a line as its fragment's and back lands where it was (and
 * the core of a text and of its normal form agree). A line that doesn't resolve stays.
 */
function inPlace(text: string, resolve: Resolve): string {
  const x = expansion(text, { resolve });
  const own = text.split('\n');
  const added = x.text.split('\n').slice(own.length);
  const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
  const at = new Map<number, string[]>();
  added.forEach((l, k) => {
    const line = x.through(own.length + k + 1)?.line;
    if (line !== undefined) at.set(line, [...(at.get(line) ?? []), l]);
  });
  return own
    .flatMap((raw, i) => {
      const code = splitComment(raw)[0];
      const taken = (readUse(code) !== undefined || readFrom(code.trim())?.kind === 'use') && !kept.has(i + 1);
      return taken ? (at.get(i + 1) ?? []) : [raw];
    })
    .join('\n');
}

/** `x!n` as n copies of x; any other token as written. */
const repeated = (tok: string) => {
  const m = /^(.*)!(\d+)$/.exec(tok);
  return m ? Array.from({ length: +m[2]! }, () => m[1]!).join(' ') : tok;
};

/** The cells a text reads by their units: picked (`&x[1]`, `&x[1:3]`) or rotated (`&x[<<]`). */
const unitRead = (text: string) => new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)\[/g)].map((m) => m[1]!));

/** Where the first innermost `&( … )` stands: from its `&` to past its `)`, and its body. */
function innermost(written: string): { start: number; end: number; body: string } | null {
  // (a quoted string, a label's, says `&( … )` without writing one: read with its letters masked, cut as written)
  const text = written.replace(/"(?:[^"\\]|\\.)*"/g, (q) => q.replace(/[^"]/g, ' '));
  for (let i = text.indexOf('&('); i >= 0; i = text.indexOf('&(', i + 1)) {
    let depth = 0;
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')' && --depth === 0) {
        if (!text.slice(i + 2, j).includes('&(')) return { start: i, end: j + 1, body: written.slice(i + 2, j) };
        break;
      }
    }
  }
  return null;
}

/** Each braid token of each line (as the parser reads its top-level tokens) rewritten by `f`, the rest as written. */
function tokenWise(text: string, f: (token: string, cell: string) => string): string {
  const lines = text.split('\n');
  const parsed = parse(text);
  const edits: { line: number; col: number; len: number; to: string }[] = [];
  for (const d of parsed.cells)
    if (d.braid.kind === 'list')
      for (const t of d.braid.tokens) {
        const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len);
        if (written === undefined) continue;
        const to = f(written, d.name);
        if (to !== written) edits.push({ ...t.span, to });
      }
  // (right to left in each line, so the columns before stay where they are)
  edits.sort((a, b) => b.line - a.line || b.col - a.col);
  for (const e of edits) {
    const l = lines[e.line - 1]!;
    lines[e.line - 1] = l.slice(0, e.col - 1) + e.to + l.slice(e.col - 1 + e.len);
  }
  return lines.join('\n');
}

/** The rows that need what the text means, not its letters, with why: reported where they are still written, not rewritten (#482's next rungs). */
export const LEFT: readonly { key: string; rows: string; test: RegExp; why: string }[] = [
  {
    key: 'taps',
    rows: '54–56 `step=16n` `pulse` `beat` `&m:8n`',
    test: /step=(?:&\w+:)?(?:\d+[ntm]\.?|pulse|beat)\b/,
    why: 'a tap is a level of the meter it reads: `&bar*k` with k from the meter’s levels (and a meter by name, `&bar2:beat`)',
  },
  {
    key: 'subsequences',
    rows: '13, 16, 18, 22, 25 `_` `[a b]` `<a b>` `x*n` `x(k,n)`',
    test: /(?:^|\s)\[[^\]&,]*\s[^\]]*\]|<[^>]*>|[\w\]~]\*\d|\w\(\d+,\s*\d+/m,
    why: 'dilate on a finer step: the line’s step= changes with it, and a tap’s finer step is the meter’s next level or a new one',
  },
  {
    key: 'sliders',
    rows: '58–64 a unit in `free(…)`',
    test: /\bfree\(-?\d*\.?\d+(?:bpm|hz|min|h|d|wk|k)\b/,
    why: 'a slider’s unit is what the performer moves it in: its range and its steps are in it',
  },
  { key: 'unit reads', rows: '21 `x!n` in a cell read by its units', test: /!\d/, why: '`&a!2` is one unit and `&a &a` two: a pick or a rotation (`&john[<<]`) counts them' },
  { key: 'keys', rows: '40 `scale(name)`', test: /\bscale\(/, why: 'a key is a mode read from the library and a tonic: two cells, the mode’s table among them' },
  {
    key: 'meter scans',
    rows: '37 `scan(i …)` on a stepped line',
    test: /\bscan\(.*\bstep=|\bstep=.*\bscan\(/,
    why: 'a scan with a step= is a meter: its numbers are the lengths of its steps, `@`, and what a tap reads of it are its levels',
  },
  { key: 'meters', rows: '42 `meter("sig")`', test: /\bmeter\(/, why: 'a signature’s levels are the grouping rule (#17): written out they are its table, which the reader has' },
  {
    key: 'gates',
    rows: '111–113 `play=` `level=` `[&a, &b]`',
    test: /\b(?:play|level)=/,
    why: 'a gate is a set of products: each receiver times its notes and levels, written into the card’s mix',
  },
  { key: 'pitch', rows: '88 `pitch=&x`', test: /pitch=&\w/, why: 'a voice’s pitch= joins every product the voice is in: the mix rewritten, a sum in each' },
  { key: 'levels', rows: '27 `&x:0:g`', test: /&\w+:\d/, why: 'a hit’s gain is a volume line in the product: a line of its own, stepped as the braid' },
  {
    key: 'copies',
    rows: '14, 79 `=` `base=`',
    test: /\bbase=/,
    why: 'the base’s braid written over: the parser does it (parser/base.ts), so it is mechanical, but needs the base’s text',
  },
];
