/**
 * The compile tool's probe (#441): the sugar of decision 068 rewritten into the core over every example, family by family,
 * each rewrite checked by S1 against the text it starts from and measured by structure (decision 049's measure, as written).
 * It answers the scoping note's questions with numbers (`docs/notes/441-compile.md`); it is no tool a frontend reads.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/compileprobe.ts [--fold] [<key>...]
 *
 * A family is one sugar row, or a few that rewrite alike, written as a function of the text alone (mechanical): it
 * rewrites every place it finds or none. A row that needs what the text means to rewrite (the meter a tap reads, the
 * products a voice is in, a line's step=) is counted where it is written, not rewritten: `CONTEXT` says why.
 * `--fold` also runs Shorten over the de-sugared text, to see whether compile is "de-sugar, then Shorten" (question 3).
 */
import { pathToFileURL } from 'node:url';
import { PRESETS } from '../src/engine/presets';
import { parse } from '../src/engine/parser';
import { noteFrequency, INTERFACE_NAMES } from '../src/engine/program';
import { GM_KIT } from '../src/engine/midi';
import { expand } from '../src/engine/use';
import { splitComment } from '../src/engine/edit';
import { soundsIdentical } from '../src/engine/sameness';
import { structureOf } from '../src/engine/measure';
import { shorten, shortenAll } from '../src/engine/shorten';
import { resolveSeed } from '../src/repository/library';

const OPTIONS = { resolve: resolveSeed };
/** How long S1 listens: the first minute (`SAMENESS_SECONDS`), so the longest pieces stay a probe. */
const LISTEN = 60;

/** A number as a text writes it: every digit (S1 hears C4 written to 12 digits as another note). */
const num = (x: number) => String(x);

/** One family: its rows of the note, and its rewrite of a whole text (the text itself when it finds nothing). */
export interface Family {
  readonly key: string;
  readonly rows: string;
  readonly rewrite: (text: string) => string;
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
    rewrite: (text) => expand(text, resolveSeed),
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

/** The rows that need what the text means, not its letters, with why: counted, not rewritten. */
export const CONTEXT: readonly { key: string; rows: string; test: RegExp; why: string }[] = [
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

/** The text's own names (bare), those it defines, in order: the interface names aside. */
const ownNames = (text: string) => {
  const keep = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));
  return [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !keep.has(n) && !n.startsWith('λ'));
};

/** A short name for the nth: a … z, then a1 …, never one the text keeps. */
const short = (i: number): string => `${String.fromCharCode(97 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;

/** A General MIDI drum's name or alias: on a MIDI card a kit member's name is its note (decision 054). */
const DRUMS = new Set(GM_KIT.flatMap((d) => [d.name, ...d.aliases]));

/**
 * The names that mean something besides themselves, which minify keeps: a drum's (its MIDI note), and a cell that draws
 * (`x?`, `[a|b]`, `chance=`, `seed=`), or splices one that does, since a draw is keyed on the name of the cell that plays
 * it (`realize.ts`, decision 031).
 */
export function meaningfulNames(text: string): Set<string> {
  const lines = new Map(parse(text).cells.map((d) => [d.name, text.split('\n')[d.span.line - 1] ?? ''] as const));
  const keep = new Set([...lines.keys()].filter((n) => DRUMS.has(n.replace(/\d+$/, '').toLowerCase())));
  const draws = new Set([...lines].filter(([, l]) => /\?|\[[^\]]*\||\b(?:chance|seed)=/.test(splitComment(l)[0])).map(([n]) => n));
  for (let grew = true; grew;) {
    grew = false;
    for (const [n, l] of lines)
      // (through a braid's splice; a mix's product plays the cell, which keys its own draws)
      if (!draws.has(n) && !/\*/.test(splitComment(l)[0]) && [...splitComment(l)[0].matchAll(/&([A-Za-z_]\w*)/g)].some((m) => draws.has(m[1]!) && m[1] !== n)) {
        draws.add(n);
        grew = true;
      }
  }
  return new Set([...keep, ...draws]);
}

/** Minify (question 2): every own name renamed to a short one; the interface names, the names it uses but doesn't define, and `meaningfulNames` kept. */
export function minify(text: string): string {
  const kept = meaningfulNames(text);
  const own = ownNames(text).filter((n) => !kept.has(n));
  const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!));
  const to = new Map<string, string>();
  let i = 0;
  for (const name of own) {
    let n = short(i++);
    while (taken.has(n) && !own.includes(n)) n = short(i++);
    to.set(name, n);
  }
  // (two passes through a marker no text writes, so &a → &b and &b → &a don't meet)
  const via = text.replace(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])/g, (w, n: string) => (to.has(n) ? `&§${to.get(n)}` : w));
  return via.replace(/&§/g, '&');
}

export interface Row {
  readonly key: string;
  readonly before: number;
  readonly families: Readonly<Record<string, { after: number; same: boolean } | null>>;
  readonly core: { after: number; same: boolean; idempotent: boolean };
  readonly context: readonly string[];
  readonly minified: { chars: [number, number]; same: boolean };
  readonly folded?: { after: number; same: boolean; steps: number; said: readonly string[] };
  readonly coreFolded?: { after: number; same: boolean; steps: number };
}

/** Shorten's kinds whose rewrite stays in the core: a phrase as one cell used at its places, cells alike as one, a default dropped. */
const CORE_KINDS: ReadonlySet<string> = new Set(['phrase', 'same', 'default']);

/** Compile's fold as the probe tries it: Shorten's core kinds only, the best each round, each checked by S1 (as `shortenAll` checks its steps since #477). */
export function coreFold(text: string, rounds = 60): { source: string; steps: string[] } {
  let now = text;
  const steps: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const best = shorten(now).find((s) => CORE_KINDS.has(s.kind) && same(now, s.apply(now)));
    if (!best) break;
    now = best.apply(now);
    steps.push(best.title);
  }
  return { source: now, steps };
}

const measure = (text: string) => structureOf(text, { asWritten: true, ...OPTIONS }).total;
const same = (a: string, b: string) => soundsIdentical(a, b, LISTEN, OPTIONS);

/** One example through every family alone, then all of them in order (the core as far as the letters reach). */
export function probe(key: string, source: string, fold = false): Row {
  const families: Record<string, { after: number; same: boolean } | null> = {};
  let core = source;
  for (const f of FAMILIES) {
    const alone = f.rewrite(source);
    families[f.key] = alone === source ? null : { after: measure(alone), same: same(source, alone) };
    core = f.rewrite(core);
  }
  const again = FAMILIES.reduce((t, f) => f.rewrite(t), core);
  const min = minify(core);
  const folded = fold ? shortenAll(core, 60, {}) : null;
  const cf = fold ? coreFold(core) : null;
  return {
    key,
    before: measure(source),
    families,
    core: { after: measure(core), same: same(source, core), idempotent: again === core },
    context: CONTEXT.filter((c) => c.test.test(core)).map((c) => c.key),
    minified: { chars: [core.length, min.length], same: same(core, min) },
    ...(cf ? { coreFolded: { after: measure(cf.source), same: same(source, cf.source), steps: cf.steps.length } } : {}),
    ...(folded ? { folded: { after: measure(folded.source), same: same(core, folded.source), steps: folded.steps.length, said: folded.steps } } : {}),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const fold = args.includes('--fold');
  const keys = args.filter((a) => !a.startsWith('--'));
  const rows = Object.entries(PRESETS)
    .filter(([k]) => !keys.length || keys.includes(k))
    .map(([k, p]) => probe(k, p.source, fold));
  console.log(JSON.stringify(rows));
}
