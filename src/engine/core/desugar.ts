/**
 * De-sugar (decision 069 §2, #482): the sugar rows of decision 068 that the letters settle, each a family written as a
 * function of the text, rewriting every place it finds or none. Lifted from `tools/compileprobe.ts` (#441), where each was
 * measured exact by S1 and idempotent over every example. The rows that need what the text means (`LEFT`) are not
 * rewritten yet: `toCore` reports where they are still written. Pure.
 */
import { parse } from '../parser';
import type { Token } from '../ast';
import { compileSource } from '../compile';
import { noteValue, type Meter } from '../meter';
import { noteFrequency, type CompileOptions } from '../program';
import { expansion } from '../use';
import { readFrom, readUse } from '../parser/use';
import type { Resolve } from '../program';
import { declLine, declWords, splitComment } from '../edit';

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
  {
    key: 'copies',
    rows: '79 `base=` (a copy that writes no braid of its own)',
    rewrite: (text) => copies(text),
  },
  {
    key: 'meters',
    rows: '42 `meter("sig")`',
    rewrite: (text, options) => meters(text, options),
  },
  {
    key: 'taps',
    rows: '54–55 `step=16n` `8t` `4n.` `1m`',
    rewrite: (text, options) => taps(text, options),
  },
  {
    key: 'subsequences',
    rows: '16, 22 `[a b]` `x*n`, and `@` on the line’s finest grid',
    rewrite: (text, options) => subsequences(text, options),
  },
  {
    key: 'chains',
    rows: '53 `step=&x*n/d` as one ratio',
    rewrite: (text) => codeWise(text, chains),
  },
];

/** A fraction, n/d in lowest terms. */
type Ratio = readonly [n: number, d: number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const ratio = (n: number, d: number): Ratio => {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const times = (a: Ratio, b: Ratio) => ratio(a[0] * b[0], a[1] * b[1]);

/**
 * A braid's leaves, each with how many of the line's steps it lasts, as written: a subsequence's steps squeezed into its
 * one (`[a b]`: half each), `x*n` n copies in one, `x!n` n copies of one each, `x@n` n long. Null where a token is no
 * plain leaf or plain subsequence of them (a stack, `<a b>`, a euclid, a slower step, a choice): those stay as written.
 */
function leaves(tokens: readonly Token[], lines: readonly string[], dur: Ratio): { text: string; dur: Ratio }[] | null {
  const foot = (t: Token) => t.elongate * t.repeat;
  const all = tokens.reduce((s, t) => s + foot(t), 0);
  if (!all || tokens.some((t) => !Number.isInteger(t.elongate))) return null;
  const out: { text: string; dur: Ratio }[] = [];
  for (const t of tokens) {
    const each = times(dur, ratio(t.elongate, all));
    for (let r = 0; r < t.repeat; r++) {
      const a = t.atom;
      if (a.kind === 'seq') {
        if (a.layers.length !== 1 || a.mode || a.euclid || a.slow || a.bare) return null;
        const inner = leaves(a.layers[0]!, lines, each);
        if (!inner) return null;
        for (let s = 0; s < t.subdivide; s++) out.push(...inner.map((x) => ({ ...x, dur: times(x.dur, ratio(1, t.subdivide)) })));
        continue;
      }
      if (a.kind !== 'note' && a.kind !== 'rest' && a.kind !== 'ref' && a.kind !== 'chord') return null;
      const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
      // (the leaf as written, its modifiers aside: its length is said by `@` on the finer grid)
      const text = written.replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)+$/, '').replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)(?=[?:]|$)/g, '');
      if (!text || /[@!*]/.test(text.replace(/^&[A-Za-z_][A-Za-z0-9_]*/, ''))) return null;
      for (let s = 0; s < t.subdivide; s++) out.push({ text, dur: times(each, ratio(1, t.subdivide)) });
    }
  }
  return out;
}

/**
 * A line whose braid has subsequences (`[a b]`, `x*n`) written on its finest grid (decision 069 §4, #497): the step k times
 * finer (`step=8n` → `step=8n*2`, a rate × k), each leaf as long as it was, in `@`. Left as written: a line that draws
 * (its draws are keyed on its steps), one another braid splices (a splice lasts its own steps there), one a pick or a
 * rotation reads by its units, one whose meter sets legato by level (a finer tap sounds at its own), and any braid with
 * a stack, `<a b>`, a euclid or a choice. Each rewrite is checked by S1 where `toCore` takes it.
 */
function subsequences(text: string, options: CompileOptions): string {
  const r = compileSource(text, undefined, options);
  if (!r.ok) return text;
  const lines = text.split('\n');
  const spliced = new Set([...r.cells.values()].flatMap((c) => c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []))));
  const read = unitRead(text);
  for (const d of parse(text).cells) {
    if (d.braid.kind !== 'list' || !d.step || spliced.has(d.name) || read.has(d.name)) continue;
    const tokens = d.braid.tokens;
    if (!tokens.some((t) => t.atom.kind === 'seq' || t.subdivide > 1)) continue;
    const i = d.span.line - 1;
    const [code, comment] = splitComment(lines[i] ?? '');
    if (/[?|]/.test(code) || /\bchance=/.test(code)) continue;
    if (d.step.kind === 'tap' && r.cells.get(d.step.meter?.name ?? r.mainMeter ?? '')?.meter?.legato) continue;
    // (each top step one of the line's steps: the braid as long as its footprints)
    const ls = leaves(tokens, lines, [tokens.reduce((n, t) => n + t.elongate * t.repeat, 0), 1]);
    if (!ls || tokens.some((t) => t.span.line - 1 !== i)) continue;
    const k = ls.reduce((l, x) => (l * x.dur[1]) / gcd(l, x.dur[1]), 1);
    const braid = ls.map((x) => {
      const n = (x.dur[0] * k) / x.dur[1];
      return n === 1 ? x.text : `${x.text}@${n}`;
    });
    const step = /\bstep=(\S+)/.exec(code);
    if (!step) continue;
    const value = step[1]!;
    const finer = /^-?[0-9.]+$/.test(value) ? num(+value * k) : /^(?:&|pulse|beat|[0-9]+[ntm])/.test(value) && !value.startsWith('cycle(') ? `${value}*${k}` : null;
    if (!finer) continue;
    const first = tokens[0]!.span.col - 1;
    const last = tokens.at(-1)!;
    const end = last.span.col - 1 + last.span.len;
    // (the braid's tail as written past its last token: a hold `_` merged into it is in its length)
    const tail = code.slice(end).replace(/^(?:\s+_)+/, '');
    const head = code.slice(0, first).replace(/\bstep=\S+/, `step=${finer}`);
    const next = `${head}${braid.join(' ')}${tail}`;
    lines[i] = comment ? `${next}${comment}` : next;
  }
  return lines.join('\n');
}

/** A ratio as a tap's chain writes it: `*4`, `/3`, `*3/2`, nothing for 1. */
function chainOf(k: number): string {
  const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
  if (near(k)) return Math.round(k) === 1 ? '' : `*${Math.round(k)}`;
  if (near(1 / k)) return `/${Math.round(1 / k)}`;
  for (let q = 2; q <= 64; q++) if (near(k * q)) return `*${Math.round(k * q)}/${q}`;
  return `*${num(k)}`;
}

/**
 * A tap of a note value written as the meter's pulse with its chain (decision 069 §2): a pulse is 1/unit of a whole note,
 * so `16n` in 4/4 is `pulse*4`, in 7/8 `pulse*2`; `4n.` in 6/8 `pulse/3`; the bar, `1m`, `pulse/pulses`. A chain already
 * written stays after it (`16n*2` is `pulse*4*2`), and so does a meter named (`&bar2:8n`). `beat` stays: a beat is a look
 * up of the meter's levels (7/8's are unequal). Never the meter cell's own steps, which decision 040 retired.
 */
function taps(text: string, options: CompileOptions): string {
  const r = compileSource(text, undefined, options);
  if (!r.ok) return text;
  const lines = text.split('\n');
  for (const d of parse(text).cells) {
    const st = d.step;
    if (st?.kind !== 'tap') continue;
    const word = st.tap.written;
    const meter = r.cells.get(st.meter?.name ?? r.mainMeter ?? '')?.meter;
    if (!meter) continue;
    const bars = /^([1-9][0-9]*)m$/.exec(word);
    const length = bars ? (+bars[1]! * meter.pulses) / meter.unit : noteValue(word);
    if (length === null) continue;
    const i = d.span.line - 1;
    const [code, comment] = splitComment(lines[i] ?? '');
    const pattern = new RegExp(`(\\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?)${word.replace('.', '\\.')}(?=[*/\\s]|$)`);
    const next = code.replace(pattern, `$1pulse${chainOf(1 / meter.unit / length)}`);
    if (next !== code) lines[i] = comment ? `${next}${comment}` : next;
  }
  return lines.join('\n');
}

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

/**
 * A step's chain as one ratio (068's row 53, `*3/2` = `*1.5`, its spelling the chain's): `pulse*2*2` is `pulse*4`,
 * `pulse*1` is `pulse`, `&bar*3/2*2` is `&bar*3`. The ratio is the product of the chain's factors, read left to right.
 */
function chains(code: string): string {
  return code.replace(
    /(\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?(?:pulse|beat|&[A-Za-z_][A-Za-z0-9_]*|[0-9]+[ntm]\.?))((?:[*/][0-9]+(?:\.[0-9]+)?)+)(?![0-9A-Za-z_.])/g,
    (_, head: string, chain: string) => {
      let k = 1;
      for (const m of chain.matchAll(/([*/])([0-9]+(?:\.[0-9]+)?)/g)) k = m[1] === '*' ? k * +m[2]! : k / +m[2]!;
      return `${head}${chainOf(k)}`;
    },
  );
}

/**
 * A copy written out (068's row 79, decision 026): `&bar base=&grouping step=&tempo swing=&swing` with `&grouping
 * meter("4/4")` is `&bar meter("4/4") step=&tempo swing=&swing`, the base's braid and every attribute of the base's the
 * copy doesn't set, the copy's own after. Only a copy that writes no braid of its own, and a base with no copy of its
 * own (`=` over a base's steps, and a chain of copies, stay: `LEFT`'s); the base, read by nothing else then, goes in the
 * fold.
 */
function copies(text: string): string {
  let now = text;
  for (const d of parse(text).cells) {
    // (as written: the parser gives a copy its base's braid already, parser/base.ts)
    if (!d.base || d.base.pick || d.base.shift) continue;
    const own = declWords(now, d.name);
    const base = declWords(now, d.base.name);
    if (!own || !base || own.braid.length || base.attrs.some((a) => a.startsWith('base='))) continue;
    const set = new Set(own.attrs.map((a) => a.split('=')[0]));
    const attrs = [...base.attrs.filter((a) => !set.has(a.split('=')[0])), ...own.attrs.filter((a) => !a.startsWith('base='))];
    const i = declLine(now, d.name);
    const lines = now.split('\n');
    const [, comment] = splitComment(lines[i]!);
    const next = [...own.head, ...base.braid, ...attrs].join(' ');
    lines[i] = comment ? `${next} ${comment.trim()}` : next;
    now = lines.join('\n');
  }
  return now;
}

/** The levels a meter's steps are written as (`meter("*.-.+.-.")`): a downbeat, a beat, a half's beat, an eighth, finer. */
const LEVEL = ['*', '+', '-', '.', ','];

/** What a meter plays as: its levels, its step and its beats as lengths in whole notes (its pulses are what its taps read, rewritten after it). */
const played = (m: Meter) => {
  const step = m.pulses / (m.unit * m.levels.length);
  return JSON.stringify([m.levels, +step.toFixed(9), m.beats.map((b) => +(b / m.unit).toFixed(9))]);
};

/**
 * A meter of a signature written as its levels (068's row 42, decision 069 §2): `meter("4/4")` as `meter("*-+-")`,
 * `meter("4/4", 2)` as `meter("*.-.+.-.")`, `meter("2+2+3")` as its groups' levels; read from the compiled meter, so a
 * grouping ruled by #17 is written as it plays. Its attributes (swing=, legato=, step=) stay. A tap of `pulse` reads the
 * levels' steps as pulses after it: the taps are written after the meters, and each rewrite is checked by S1.
 * Where the levels alone read another step (a half: `meter("2/2")`; a sixteenth: `meter("6/16")`), they are written with
 * the step's note value (`meter("*+", 2n)`, #15 item 3); where even that is another meter (6/4's quarters grade `-`,
 * which written starts a beat: #545), the signature stays as written.
 */
function meters(text: string, options: CompileOptions): string {
  const r = compileSource(text, undefined, options);
  if (!r.ok) return text;
  const meterOf = (braid: string) => {
    const c = compileSource(`&m ${braid}`);
    return c.ok ? (c.cells.get('m')?.meter ?? null) : null;
  };
  /** The levels as written, with the step's note value where the levels alone read another; null where neither is the meter. */
  const asLevels = (m: Meter): string | null => {
    const levels = m.levels.map((l) => LEVEL[Math.min(l, LEVEL.length - 1)]).join('');
    const bare = meterOf(`meter("${levels}")`);
    if (bare && played(bare) === played(m)) return `meter("${levels}")`;
    const value = (m.unit * m.levels.length) / m.pulses;
    if (!Number.isInteger(value)) return null;
    const valued = meterOf(`meter("${levels}", ${value}n)`);
    return valued && played(valued) === played(m) ? `meter("${levels}", ${value}n)` : null;
  };
  // (the line's code whole, its quoted signature in it; its comment aside)
  const each = (c: string) => {
    const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(c)?.[1];
    const meter = name ? r.cells.get(name)?.meter : null;
    if (!meter || meter.written !== 'meter') return c;
    return c.replace(/\bmeter\("([^"]*)"(?:,\s*[0-9]+)?\)/, (written, sig: string) => (/^[*+\-.,:;]+$/.test(sig) ? written : (asLevels(meter) ?? written)));
  };
  return text
    .split('\n')
    .map((raw) => {
      const [code, comment] = splitComment(raw);
      const next = each(code);
      return next === code ? raw : comment ? `${next}${comment}` : next;
    })
    .join('\n');
}

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

/** Is a row still written in a text: its test on the code, strings and comments aside (a label may say `step=8n`). */
export const stillWritten = (row: (typeof LEFT)[number], text: string): boolean => {
  const code = text
    .split('\n')
    .map((l) => splitComment(l)[0].replace(/"(?:[^"\\]|\\.)*"/g, '""'))
    .join('\n');
  return typeof row.test === 'function' ? row.test(code) : row.test.test(code);
};

/** The rows that need what the text means, not its letters, with why: reported where they are still written, not rewritten (#482's next rungs). */
export const LEFT: readonly { key: string; rows: string; test: RegExp | ((text: string) => boolean); why: string }[] = [
  {
    key: 'taps',
    rows: '54–56 `step=16n` `8t` `4n.` `1m` on a line that wasn’t rewritten',
    test: /step=(?:&\w+:)?(?:\d+[ntm]\.?)(?![A-Za-z0-9_])/,
    why: 'a tap of a note value is the meter’s pulse with its chain (`pulse*4`), where the line plays the same written so',
  },
  {
    key: 'subsequences',
    rows: '16, 18, 22, 25 `[a b]` `<a b>` `x*n` `x(k,n)` left as written',
    test: (text) => parse(text).cells.some((d) => d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'seq' || t.subdivide > 1)),
    why: 'dilate inside a step, kept where a finer grid would change what the line plays: a line that draws, one spliced or read by its units, a table, a stack, `<a b>`, a euclid, a meter with legato by level',
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
  {
    key: 'meters',
    rows: '42 `meter("sig")` left as written',
    test: /\bmeter\("[^"]*[0-9/][^"]*"/,
    why: 'a signature’s levels are the grouping rule (#17): written out where the piece plays the same so',
  },
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
