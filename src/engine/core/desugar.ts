/**
 * De-sugar (decision 069 §2, #482): the sugar rows of decision 068 that the letters settle, each a family written as a
 * function of the text, rewriting every place it finds or none. Lifted from `tools/compileprobe.ts` (#441), where each was
 * measured exact by S1 and idempotent over every example. The rows that need what the text means (`LEFT`) are not
 * rewritten yet: `toCore` reports where they are still written. Pure.
 */
import { parse } from '../parser';
import { TEMPI } from '../parser/free';
import { isNote, type Token } from '../ast';
import { compileSource } from '../compile';
import { soundsIdentical } from '../sameness';
import { noteValue, type Meter } from '../meter';
import { noteFrequency, type CompileOptions } from '../program';
import { expansion } from '../use';
import { readFrom } from '../parser/use';
import type { Resolve } from '../program';
import { declLine, declWords, deleteCell, splitComment } from '../edit';

/** A number as a text writes it: every digit of the double, one spelling for one number (S1 would hear a few as the same, decision 070). */
const num = (x: number) => String(x);

/** One family: its rows of decision 068's table (418's note), and its rewrite of a whole text (the text itself when it finds nothing). */
export interface Family {
  readonly key: string;
  readonly rows: string;
  readonly rewrite: (text: string, options: CoreContext) => string;
}

/** What a family reads: the compile options, and the interface the text is cored up to (decision 077 §2), its names bare. */
export interface CoreContext extends CompileOptions {
  readonly keep?: ReadonlySet<string>;
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
    key: 'inert',
    rows: '2, 85–90 a note, `label=` `show=` `size=` `tags=` `about=` `title=` `tier=`',
    rewrite: (text) => inert(text),
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
    key: 'sliders',
    rows: '58–64 a unit in `free(…)`',
    // (a slider in the core's numbers, its unit an argument: free(120bpm, 90..150) is free(2, 1.5..2.5, unit=bpm);
    // decision 069, sliders: the owner's (a), the unit written inline its sugar)
    rewrite: (text) =>
      codeWise(text, (c) =>
        c
          .replace(
            /\bfree\((-?[0-9]*\.?[0-9]+)(bpm|hz|min|h|d|wk|k),\s*(-?[0-9]*\.?[0-9]+)\.\.(-?[0-9]*\.?[0-9]+)/g,
            (_, n: string, u: string, lo: string, hi: string) => `free(${num(+n * UNIT[u]!)}, ${num(+lo * UNIT[u]!)}..${num(+hi * UNIT[u]!)}, unit=${u}`,
          )
          // (a tempo marking: its range in bpm, from the middle, the slider it makes)
          .replace(/\bfree\(([a-z]+)\)/g, (written, word: string) => {
            const range = TEMPI[word];
            if (!range) return written;
            const [lo, hi] = range;
            return `free(${num(Math.round((lo + hi) / 2) / 60)}, ${num(lo / 60)}..${num(hi / 60)}, unit=bpm)`;
          }),
      ),
  },
  {
    key: 'reach',
    rows: 'centre ± reach (decision 079)',
    // (c ± r, or c +- r, written in numbers: the window it is, (c − r)..(c + r), held at 0 below; a slider in it stays)
    rewrite: (text) =>
      codeWise(text, (c) =>
        c.replace(/(?<=[=\s])(-?[0-9]*\.?[0-9]+)\s*(?:±|\+-)\s*([0-9]*\.?[0-9]+)(?=\s*\*)/g, (_, cs: string, rs: string) => `${num(Math.max(0, +cs - +rs))}..${num(+cs + +rs)}`),
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
    rewrite: (text) => {
      // (a cell read by its units, picked or rotated, `&john[<<]`, counts `&a!2` as one unit and `&a &a` as two: left;
      // and one that counts its own laps, `cycle=`, counts its units too: `[0,2,4]!4` is one of them, decision 077 §3)
      const read = unitRead(text);
      for (const d of parse(text).cells) if (d.cycle !== null) read.add(d.name);
      return tokenWise(text, (tok, cell) => (read.has(cell) ? tok : repeated(tok)));
    },
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
    rewrite: (text, options) => copies(text, options.keep),
  },
  {
    key: 'keys',
    rows: '40 `scale(name)` `scale(name, tonic)` `scale(&mode, &tonic)`',
    rewrite: (text, options) => keys(text, options),
  },
  {
    key: 'gates',
    rows: '111–113 `play=` `level=` `[&a, &b]`',
    rewrite: (text, options) => gates(text, options),
  },
  {
    key: 'pitch',
    rows: '88 `pitch=&x`',
    rewrite: (text) => pitches(text),
  },
  {
    key: 'meters',
    rows: '42 `meter("sig")`',
    rewrite: (text, options) => meters(text, options),
  },
  {
    key: 'meter scans',
    rows: '37 `scan(i …)` on a stepped line',
    rewrite: (text, options) => meterScans(text, options),
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
  {
    key: 'copy steps',
    rows: '14 `=` over a base’s steps',
    rewrite: (text, options) => copySteps(text, options),
  },
  {
    key: 'splice subdivisions',
    rows: '22 `&x*n`',
    rewrite: (text, options) => spliceSubdivisions(text, options),
  },
  {
    key: 'euclids',
    rows: '25 `euclid(k, n)`',
    rewrite: (text) => euclids(text),
  },
  {
    key: 'counts',
    rows: '21, 22 a run as `x!n`, `x*n` as `[x!n]`',
    // (last: the families before read a run written out, as `repeats` writes it each round; decision 077 §3)
    rewrite: (text) => counts(text),
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
  const kept = new Set(x.takes.filter((u) => u.hash === null).map((u) => u.span.line));
  const at = new Map<number, string[]>();
  added.forEach((l, k) => {
    const line = x.through(own.length + k + 1)?.line;
    if (line !== undefined) at.set(line, [...(at.get(line) ?? []), l]);
  });
  return own
    .flatMap((raw, i) => {
      const code = splitComment(raw)[0];
      const taken = readFrom(code.trim())?.kind === 'use' && !kept.has(i + 1);
      return taken ? (at.get(i + 1) ?? []) : [raw];
    })
    .join('\n');
}

/** `x!n` as n copies of x; any other token as written. */
const repeated = (tok: string) => {
  const m = /^(.*)!(\d+)$/.exec(tok);
  return m ? Array.from({ length: +m[2]! }, () => m[1]!).join(' ') : tok;
};

/**
 * A copy's braid written over its base's steps (068's row 14, decision 026): `&f base=&e^$7 =!3 0@2` with `&e 0 -1 0@2 -5@2
 * -4@2` is `&f 7 6 7@2 0@2 3@2`: `=` the base's step moved, `=@n` its pitch held n, a value in its place, and the base's
 * steps past the copy's braid after. Only a base of plain numbers (`n`, `n@k`, `n!k`) reading no table, so `^$n` is n
 * semitones, and attributes neither sets but its tags; each copy checked on its own by S1.
 */
function copySteps(text: string, options: CoreContext): string {
  let now = text;
  for (const d of parse(text).cells) {
    const copy = declWords(now, d.name);
    const head = copy?.attrs.find((a) => a.startsWith('base='));
    const m = head ? /^base=&([A-Za-z_][A-Za-z0-9_]*)(?:\^\$(-?[0-9]+))?$/.exec(head) : null;
    if (!copy || !m || copy.attrs.some((a) => !/^(base|tags)=/.test(a)) || options.keep?.has(m[1]!)) continue;
    const base = declWords(now, m[1]!);
    if (!base || base.attrs.some((a) => !/^tags=/.test(a))) continue;
    const by = +(m[2] ?? 0);
    // (the base's steps, a count as its steps: value and length)
    const steps: { v: number; at: string }[] = [];
    let plain = true;
    for (const w of base.braid) {
      const t = /^(-?[0-9]*\.?[0-9]+)(@[0-9]+)?(?:!([0-9]+))?$/.exec(w);
      if (!t) plain = false;
      else for (let k = 0; k < +(t[3] ?? 1); k++) steps.push({ v: +t[1]!, at: t[2] ?? '' });
    }
    if (!plain) continue;
    const out: string[] = [];
    let i = 0;
    for (const w of copy.braid) {
      const keep = /^=(@[0-9]+)?(?:!([0-9]+))?$/.exec(w);
      const n = keep ? +(keep[2] ?? 1) : 1;
      for (let k = 0; k < n; k++, i++) {
        const b = steps[i];
        if (keep && !b) plain = false;
        else out.push(keep ? `${num(b!.v + by)}${keep[1] ?? b!.at}` : w.replace(/!([0-9]+)$/, ''));
      }
      // (a value with a count replaces as many steps)
      if (!keep && /!([0-9]+)$/.test(w)) {
        const c = +/!([0-9]+)$/.exec(w)![1]!;
        for (let k = 1; k < c; k++, i++) out.push(w.replace(/!([0-9]+)$/, ''));
      }
    }
    if (!plain) continue;
    for (; i < steps.length; i++) out.push(`${num(steps[i]!.v + by)}${steps[i]!.at}`);
    const line = declLine(now, d.name);
    const lines = now.split('\n');
    lines[line] = [...copy.head, ...copy.attrs.filter((a) => !a.startsWith('base=')), ...out].join(' ');
    const next = lines.join('\n');
    if (soundsIdentical(now, next, undefined, options)) now = next;
  }
  return now;
}

/**
 * `x*n` of a splice written out (068's row 22): `&sd*3` is `[&sd &sd &sd]`, n of it in one step's slot, where a count
 * isn't (`[&sd!3]` plays otherwise, decision 077 §3). Each line checked on its own by S1: a line where the bracket changes
 * what the splice plays beside it stays.
 */
function spliceSubdivisions(text: string, options: CoreContext): string {
  let now = text;
  const lines = text.split('\n');
  for (const d of parse(text).cells) {
    if (d.braid.kind !== 'list') continue;
    const edits = d.braid.tokens.flatMap((t) => {
      const w = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
      const m = /^(&[A-Za-z_][A-Za-z0-9_]*)\*([0-9]+)(!([0-9]+))?$/.exec(w);
      return m && t.atom.kind === 'ref' && t.subdivide > 1 ? [{ span: t.span, to: `[${Array.from({ length: +m[2]! }, () => m[1]).join(' ')}]${m[3] ?? ''}` }] : [];
    });
    if (!edits.length) continue;
    const next = now.split('\n');
    for (const e of [...edits].sort((a, b) => b.span.line - a.span.line || b.span.col - a.span.col)) {
      const l = next[e.span.line - 1]!;
      next[e.span.line - 1] = l.slice(0, e.span.col - 1) + e.to + l.slice(e.span.col - 1 + e.span.len);
    }
    const candidate = next.join('\n');
    // (only where the text's lines are as parsed: an earlier line kept its length)
    if (candidate.split('\n').length === lines.length && soundsIdentical(now, candidate, undefined, options)) now = candidate;
  }
  return now;
}

/**
 * A euclid written as its steps (068's row 25, every generator sugar): `euclid(3, 8)` is `0 ~ ~ 0 ~ ~ 0 ~`, as the parser
 * made it; its rests then counted (`0 ~!2 0 ~!2 0 ~`). Only a braid that is the generator alone, its steps plain notes and
 * rests.
 */
function euclids(text: string): string {
  const lines = text.split('\n');
  for (const d of parse(text).cells) {
    if (d.braid.kind !== 'list' || !d.braid.tokens.length) continue;
    const first = d.braid.tokens[0]!.span;
    const call = lines[first.line - 1]?.substr(first.col - 1, first.len) ?? '';
    if (!/^euclid\(/.test(call)) continue;
    const plain = d.braid.tokens.every(
      (t) =>
        t.span.col === first.col &&
        t.span.line === first.line &&
        t.repeat === 1 &&
        t.subdivide === 1 &&
        t.elongate === 1 &&
        (t.atom.kind === 'rest' || (t.atom.kind === 'note' && t.atom.alter === 0)),
    );
    if (!plain) continue;
    const steps = d.braid.tokens.map((t) => (t.atom.kind === 'note' ? num(t.atom.value) : '~')).join(' ');
    const l = lines[first.line - 1]!;
    lines[first.line - 1] = l.slice(0, first.col - 1) + steps + l.slice(first.col - 1 + first.len);
  }
  return lines.join('\n');
}

/**
 * Repetition as a count (decision 077 §3): every maximal run of alike steps written `x!n` (`0 0 0 2` is `0!3 2`, `~ ~` is
 * `~!2`, `0!2 0` is `0!3`), at every depth, and `x*n` as `[x!n]`, n of x within one step. A cell read by its units (picked,
 * rotated, or counting its own laps, `cycle=`) stays as written, where `x!n` and `x x` are two things; a run is of steps
 * on one line, alike as written; a step that says its count otherwise (`0!2@3`) is a step of its own.
 */
export function counts(text: string): string {
  const lines = text.split('\n');
  const read = unitRead(text);
  const edits: { line: number; col: number; len: number; to: string }[] = [];
  const written = (t: Token) => lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
  /** A step's base and count: `0!3` is `0` three times, `&sd*4` is `[&sd!4]` once; null where it says its count otherwise. */
  const unit = (t: Token, inside: boolean): { base: string; n: number } | null => {
    // (a step that runs on past its line is a step of its own; a splice inside brackets lasts its slot, and two of it
    // aren't one counted: `[&sd &sd]` is not `[&sd!2]`)
    if (t.span.col - 1 + t.span.len > (lines[t.span.line - 1]?.length ?? 0)) return null;
    if (inside && t.atom.kind === 'ref') return null;
    let w = written(t);
    if (t.repeat > 1) {
      if (!w.endsWith(`!${t.repeat}`)) return null;
      w = w.slice(0, -`!${t.repeat}`.length);
    }
    const star = /^([^\s*!@]+)\*([0-9]+)$/.exec(w);
    // (`x*n` of a splice is n of it in its slot, which a count inside brackets isn't: as written)
    return { base: star && t.subdivide > 1 && t.atom.kind !== 'ref' ? `[${star[1]}!${star[2]}]` : w, n: t.repeat };
  };
  const walk = (tokens: readonly Token[], inside: boolean) => {
    for (let i = 0; i < tokens.length;) {
      const first = tokens[i]!;
      const u = unit(first, inside);
      let j = i + 1;
      let n = u?.n ?? 1;
      if (u)
        for (; j < tokens.length; j++) {
          const t = tokens[j]!;
          const v = unit(t, inside);
          const prev = tokens[j - 1]!;
          // (steps that follow one another in the text: a generator's, `meter(…)` `scan(…)`, share one span, and are no run)
          const after = t.span.line === prev.span.line && t.span.col >= prev.span.col + prev.span.len;
          const between = after ? lines[t.span.line - 1]!.slice(prev.span.col - 1 + prev.span.len, t.span.col - 1) : null;
          if (!v || v.base !== u.base || between === null || between.trim()) break;
          n += v.n;
        }
      const last = tokens[j - 1]!;
      const to = u ? `${u.base}${n > 1 ? `!${n}` : ''}` : null;
      const len = last.span.col - 1 + last.span.len - (first.span.col - 1);
      if (to !== null && last.span.line === first.span.line && to !== lines[first.span.line - 1]!.substr(first.span.col - 1, len))
        edits.push({ line: first.span.line, col: first.span.col, len, to });
      // (a step left whole: its own parts counted in turn)
      else if (j === i + 1 && first.atom.kind === 'seq') for (const layer of first.atom.layers) walk(layer, true);
      i = j;
    }
  };
  // (a cell whose numbers are a map's arguments, not steps: an envelope's a d s r, a spectrum's ratios, a role's gates)
  const args = new Set(['adsr', 'ratios', 'role', 'style', 'table']);
  for (const d of parse(text).cells) if (d.braid.kind === 'list' && !read.has(d.name) && d.cycle === null && !(d.map && args.has(d.map.kind))) walk(d.braid.tokens, false);
  edits.sort((a, b) => b.line - a.line || b.col - a.col);
  for (const e of edits) {
    const l = lines[e.line - 1]!;
    lines[e.line - 1] = l.slice(0, e.col - 1) + e.to + l.slice(e.col - 1 + e.len);
  }
  return lines.join('\n');
}

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
function copies(text: string, keep: ReadonlySet<string> = new Set()): string {
  let now = text;
  for (const d of parse(text).cells) {
    // (as written: the parser gives a copy its base's braid already, parser/base.ts; a base the interface keeps is a
    // parameter, read by name: decision 077 §2)
    if (!d.base || d.base.pick || d.base.shift || keep.has(d.base.name)) continue;
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

/**
 * A key written in the core (decision 069, keys: the owner's (a)): its mode as its table, a cell of its own, and its
 * tonic a cell read where it is one (a hole a host fills, decision 060), else its pitch class. `&key scale(minor, &tonic)`
 * is `&key scale(&_m1, &tonic)` with `&_m1 0 2 3 5 7 8 10`; `scale(dorian, D)` is `scale(&_m1, 2)`; a mode read from a
 * cell (`&mode dorian`) is written as its table the same way, the cell then read by nothing and gone in the fold. The
 * table and the shift are read from the compiled key. A key whose tonic is a slider, and one written after `over=`
 * unnamed, stay as written (`LEFT`'s).
 */
function keys(written: string, options: CompileOptions): string {
  const text = named(written);
  const r = compileSource(text, undefined, options);
  if (!r.ok) return text;
  const lines = text.split('\n');
  const tables: string[] = [];
  const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!));
  const decls = parse(text).cells;
  for (const d of decls) {
    const c = r.cells.get(d.name);
    if (d.braid.kind !== 'scan' || !c?.scan) continue;
    // (scale(…) declares a key of its own, which the line reads over=: the tonic, a cell or a shift, is that key's)
    const key = d.over ? decls.find((k) => k.name === d.over!.name) : undefined;
    const shift = d.over ? (r.cells.get(d.over.name)?.shift ?? 0) : c.shift;
    const i = d.span.line - 1;
    const [code, comment] = splitComment(lines[i] ?? '');
    const call = /\bscale\(([^()]*)\)/.exec(code);
    // (the key's own braid, wherever on its line; not a scale after over=, which `named` names first)
    if (!call || /over=$/.test(code.slice(0, call.index)) || /free\(/.test(call[1]!)) continue;
    // (a mode already its table: written in the core, left)
    const mode = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(call[1]!)?.[1];
    const held = mode ? decls.find((m) => m.name === mode) : undefined;
    if (held?.braid.kind === 'list' && held.braid.tokens.length > 1) continue;
    // (the mode's table, from its steps; the tonic, a cell read or its pitch class)
    let at = 0;
    const table = c.scan.steps.slice(0, -1).map((s) => (at += s));
    let name = `_m${tables.length + 1}`;
    while (taken.has(name)) name = `_m${tables.length + taken.size + 1}`;
    taken.add(name);
    tables.push(`&${name} ${[0, ...table].map(num).join(' ')}`);
    const tonic = key?.tonic ? `, &${key.tonic.name}` : shift ? `, ${num(shift)}` : '';
    const next = code.replace(call[0], `scale(&${name}${tonic})`);
    lines[i] = comment ? `${next}${comment}` : next;
  }
  return tables.length ? `${lines.join('\n').replace(/\s+$/, '')}\n${tables.join('\n')}` : written;
}

/** A key after `over=` unnamed (`over=scale(major, G)`, 068's attributes row) as a key of its own: `over=&_k1`, `&_k1 scale(major, G)`. */
function named(text: string): string {
  const keys: string[] = [];
  const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!));
  const next = codeWise(text, (c) =>
    c.replace(/\bover=scale\(([^()]*)\)/g, (_, args: string) => {
      let name = `_k${keys.length + 1}`;
      while (taken.has(name)) name = `_k${keys.length + taken.size + 1}`;
      taken.add(name);
      keys.push(`&${name} scale(${args})`);
      return `over=&${name}`;
    }),
  );
  return keys.length ? `${next.replace(/\s+$/, '')}\n${keys.join('\n')}` : text;
}

/** The attributes that say how a cell is drawn or named, never how it sounds (068: outside, inert). */
const INERT = /^(?:label|show|size|about|title|tier)=/;

/**
 * What plays nothing left out (068's rows 2 and 85–90, inert): a note (a cell with a label or a title and nothing else)
 * and the attributes that draw or name a cell. The core is for a machine reader: what a piece plays, not how it is drawn.
 */
function inert(text: string): string {
  let now = text;
  for (const d of parse(text).cells) if (isNote(d)) now = deleteCell(now, d.name);
  return now
    .split('\n')
    .map((raw) => {
      const name = HEAD_NAME.exec(splitComment(raw)[0])?.[1];
      const w = name ? declWords(raw, name) : null;
      if (!w || !w.attrs.some((a) => INERT.test(a))) return raw;
      // each one cut where it stands: the line's order kept, a braid that runs on past the line left whole
      const [code, comment] = splitComment(raw);
      let next = code;
      for (const a of w.attrs.filter((x) => INERT.test(x))) {
        const at = next.indexOf(a);
        if (at > 0) next = (next.slice(0, at).trimEnd() + ' ' + next.slice(at + a.length).trimStart()).trimEnd();
      }
      return comment ? `${next} ${comment.trim()}` : next;
    })
    .join('\n');
}
const HEAD_NAME = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;

/** Each entry of each mix chord on a line (`[a, b] [c]`), its top-level commas apart, rewritten by `f` (one entry may become several). */
function mixEntries(code: string, f: (entry: string) => string[]): string {
  let out = '';
  let depth = 0;
  let open = -1;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '[' && depth === 0) {
      open = i;
      depth = 1;
      continue;
    }
    if (open < 0) {
      out += ch;
      continue;
    }
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (depth === 0) {
      const body = code.slice(open + 1, i);
      const entries: string[] = [];
      let d = 0;
      let from = 0;
      for (let j = 0; j <= body.length; j++) {
        const c = body[j];
        if (c === '(' || c === '[') d++;
        else if (c === ')' || c === ']') d--;
        if (j === body.length || (c === ',' && d === 0)) {
          entries.push(body.slice(from, j));
          from = j + 1;
        }
      }
      // (each entry keeps its spacing, so a chord over lines keeps its lines; one made several, the rest after it)
      const rim = /^(?:\s|\uE000\d+\uE001)*|(?:\s|\uE000\d+\uE001)*$/g;
      out += `[${entries
        .flatMap((e) => {
          if (!e.trim()) return [e];
          const [lead = '', tail = ''] = e.match(rim) ?? [];
          const made = f(e.slice(lead.length, e.length - tail.length));
          return made.map((x, k) => (k ? ' ' : lead) + x + (k === made.length - 1 ? tail : ''));
        })
        .join(',')}]`;
      open = -1;
    }
  }
  return open < 0 ? out : code;
}

/** A name read as a whole factor (`&g`, not `&g2`, `&g[1]`, `&g:0:.5`, `&g^1`). */
const factorOf = (name: string) => new RegExp(`&${name}(?![A-Za-z0-9_\\[:^])`);

/** A text with its comments and quoted strings hidden (a bracket or a comma in them is not code), and the way back. */
function masked(text: string): { code: string; back: (code: string) => string } {
  const kept: string[] = [];
  const hide = (s: string) => `\uE000${kept.push(s) - 1}\uE001`;
  const code = text
    .split('\n')
    .map((raw) => {
      const [c, comment] = splitComment(raw);
      return c.replace(/"(?:[^"\\]|\\.)*"/g, hide) + (comment ? hide(comment) : '');
    })
    .join('\n');
  return { code, back: (c) => c.replace(/\uE000(\d+)\uE001/g, (_, i: string) => kept[+i]!) };
}

/** Each entry of each mix chord in a text, over its lines, rewritten by `f`; comments and strings as written. */
const mixesOf = (text: string, f: (entry: string) => string[]): string => {
  const m = masked(text);
  return m.back(mixEntries(m.code, f));
};

/** Is every reading of `&name` but its own line's head a factor of a mix chord's entry? Then a mix rewrite reaches them all. */
function onlyInMixes(text: string, name: string): boolean {
  const { code } = masked(text);
  const ref = new RegExp(`&${name}(?![A-Za-z0-9_])`, 'g');
  const factor = new RegExp(factorOf(name).source, 'g');
  const own = code.split('\n')[declLine(text, name)] ?? '';
  const head = new RegExp(`^\\s*&${name}(?![A-Za-z0-9_])`).test(own) ? 1 : 0;
  const total = (code.match(ref) ?? []).length - head;
  let seen = 0;
  mixEntries(code, (e) => {
    const n = (e.match(ref) ?? []).length;
    if (n && (e.match(factor) ?? []).length === n) seen += n;
    return [e];
  });
  return seen === total;
}

/**
 * A gate written as the products it is (068's rows 111–113, decision 023): `&leadOut play=&tune level=&accent*.4 &lead`
 * read in a mix as `&leadOut` is `&tune * &accent * .4 * &lead` there, a chord of receivers `[&lead, &bell]` one entry
 * each, a move of grid steps (`play=&bass^$-12`) a sum (`(&bass + -12)`); the gate's line goes. Left: a gate read
 * anywhere but a mix's entries, one with a degree move or a stack, a tape's read head (`at=`), and one whose receivers
 * are a kit's bare voices.
 */
function gates(text: string, options: CoreContext): string {
  const keep = options.keep ?? new Set<string>();
  let now = text;
  // (a role says who plays a gate, and the core is what plays (decision 077 §1): one the interface doesn't keep goes)
  for (const d of parse(text).cells) if (d.map?.kind === 'role' && !keep.has(d.name)) now = deleteCell(now, d.name);
  for (const d of parse(now).cells) {
    if (keep.has(d.name)) continue;
    const words = declWords(now, d.name);
    const play = words?.attrs.find((w) => w.startsWith('play='));
    if (!words || !play || words.attrs.some((a) => !/^(play|level|label|tags)=/.test(a))) continue;
    // (what it plays, moved by grid steps or not; a degree move or a stack stays)
    const notes = /^play=&([A-Za-z_][A-Za-z0-9_]*)(?:\^\$(-?[0-9]+))?$/.exec(play);
    if (!notes) continue;
    // (its level: cells and numbers, a product)
    const level = words.attrs.find((w) => w.startsWith('level='))?.slice('level='.length) ?? '';
    const factors = level ? level.split('*') : [];
    if (factors.some((f) => !/^(?:&[A-Za-z_][A-Za-z0-9_]*|-?[0-9]*\.?[0-9]+)$/.test(f))) continue;
    // (its receivers: one voice, or a chord of them; bare voices, a kit, stay)
    const braid = words.braid.join(' ');
    const chord = /^\[((?:&[A-Za-z_][A-Za-z0-9_]*,?\s*)+)\]$/.exec(braid);
    const receivers = chord ? [...chord[1]!.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!) : /^&[A-Za-z_][A-Za-z0-9_]*$/.test(braid) ? [braid.slice(1)] : [];
    if (!receivers.length || !onlyInMixes(now, d.name)) continue;
    // (a gate over a kit, a table of voices, is no product: its notes read through the kit, `&g over=&kit` with what its
    // notes' line writes, its level a factor in the mix; a move of a kit's notes, or a line read through a table, stays)
    const kit = receivers.length === 1 ? kitOf(now, receivers[0]!) : false;
    if (kit) {
      const line = declLine(now, d.name);
      const theirs = declWords(now, notes[1]!);
      if (notes[2] || line < 0 || !theirs || theirs.attrs.some((a) => a.startsWith('over='))) continue;
      const lines = now.split('\n');
      lines[line] = [`&${d.name}`, `over=&${receivers[0]}`, ...theirs.attrs.filter((a) => !/^(label|tags)=/.test(a)), ...theirs.braid].join(' ');
      const next = factors.length
        ? mixesOf(lines.join('\n'), (e) => [factorOf(d.name).test(e) ? e.replace(factorOf(d.name), [`&${d.name}`, ...factors].join(' * ')) : e])
        : lines.join('\n');
      if (soundsIdentical(now, next, undefined, options)) now = next;
      continue;
    }
    const head = notes[2] ? `(&${notes[1]} + ${notes[2]})` : `&${notes[1]}`;
    const product = (r: string) => [head, ...factors, `&${r}`].join(' * ');
    const next = mixesOf(deleteCell(now, d.name), (e) => {
      if (!factorOf(d.name).test(e)) return [e];
      if (/\+/.test(e)) return receivers.length === 1 ? [e.replace(factorOf(d.name), `(${product(receivers[0]!)})`)] : [e];
      return receivers.map((r) => e.replace(factorOf(d.name), product(r)));
    });
    // (each gate checked on its own: one over a kit is no product, and stays without holding the others back)
    if (soundsIdentical(now, next, undefined, options)) now = next;
  }
  return now;
}

/** Is a cell a kit: a table of voices, its braid splices alone, no attribute? */
function kitOf(text: string, name: string): boolean {
  const d = parse(text).cells.find((c) => c.name === name);
  return !!d && d.braid.kind === 'list' && d.braid.tokens.length > 0 && d.braid.tokens.every((t) => t.atom.kind === 'ref') && !Object.keys(d.params).length && !d.map;
}

/** A text cut at a separator where no bracket or parenthesis is open. */
function topLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  return [...parts, text.slice(from)];
}

/**
 * An entry of a mix with a voice's `pitch=&x` written in: added to the entry's first pitch, `&t * &lead` as
 * `(&t + &vib) * &lead` (a ramp, `map=lin`, is a volume as a factor of its own and a pitch only in a sum); with no pitch
 * of its own, a sum of it alone, `(&vib + 0) * &lead`.
 */
function withPitch(entry: string, x: string, voice: string, pitchLike: (name: string) => boolean): string {
  if (!factorOf(voice).test(entry)) return entry;
  // (a factor of the product itself, a cell moved or rotated or not: never one read inside another, `cycle(&ground)`)
  const factors = topLevel(entry, '*').map((f) => f.trim());
  // (a product's pitch written as a sum, `(&q + &k) * &v`: one more term of it)
  const sum = factors.find((f) => /^\(.*\)$/.test(f) && topLevel(f.slice(1, -1), '+').length > 1);
  if (sum) return factors.map((f) => (f === sum ? `(${f.slice(1, -1)} + &${x})` : f)).join(' * ');
  const first = factors.find((f) => {
    const m = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\[[^\]]*\]|\^\$?-?[0-9]+)*$/.exec(f);
    return !!m && m[1] !== voice && pitchLike(m[1]!);
  });
  return (first ? factors.map((f) => (f === first ? `(${f} + &${x})` : f)) : factors.map((f) => (factorOf(voice).test(f) && f === `&${voice}` ? `(&${x} + 0) * ${f}` : f))).join(
    ' * ',
  );
}

/**
 * A voice's `pitch=&x` written into the mix (068's row 88): a term of the sum in every product the voice is in, and two
 * pitches in a product add, so `[&t * &lead]` with `&lead … pitch=&vib` is `[&t * &vib * &lead]`, the voice's `pitch=`
 * gone. Left: a voice read anywhere but a mix's entries (a gate, a kit, a braid), or in a sum.
 */
function pitches(text: string): string {
  let now = text;
  const decls = parse(text).cells;
  // (a cell that is a pitch in a product: no volume's map, no voice, no gate)
  const pitchLike = (name: string) => {
    const c = decls.find((k) => k.name === name);
    return !!c && !c.gate && !Object.keys(c.params).some((k) => k === 's') && !(c.map && ['amp', 'db', 'lin', 'adsr', 'sample', 'midi'].includes(c.map.kind));
  };
  for (const d of decls) {
    const x = d.pitch;
    // (a pitch written in place, `pitch=&( … )`, has no name to read in the mix: it stays)
    if (!x || x.pick || x.shift || declLine(now, x.name) < 0 || !onlyInMixes(now, d.name)) continue;
    // (a sum that isn't a whole factor, `&a + &b * &v`, is no product's pitch to add to: left)
    let summed = false;
    mixesOf(now, (e) => {
      if (factorOf(d.name).test(e) && topLevel(e, '+').length > 1) summed = true;
      return [e];
    });
    if (summed) continue;
    const own = declLine(now, d.name);
    if (own < 0) continue;
    const lines = now.split('\n');
    const [code, comment] = splitComment(lines[own]!);
    lines[own] = code.replace(new RegExp(`\\s+pitch=&${x.name}(?![A-Za-z0-9_])`), '') + comment;
    now = mixesOf(lines.join('\n'), (e) => [withPitch(e, x.name, d.name, pitchLike)]);
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

/**
 * A meter scan as a meter bent (decision 080): `&bar scan(27 23 26 24) step=r` is `&bar meter("++++") step=r bend=4n:&b`
 * with `&b 27 23 26 24`, its entries each a beat, level 1, played at their lengths. With `pulse=16n`, the bar is one beat
 * (`meter("+,,,", 16n)`, a quarter's sixteenths) and the bend spans as many as the scan held, `laps=` counting them: BWV
 * 847's tempo map. The table is written as the scan's entries are (counts and sliders kept), or as the numbers it made
 * from a generator. A scan read as a table too (`over=&d`, a pick) stays; each rewrite checked on its own by S1.
 */
function meterScans(text: string, options: CoreContext): string {
  let now = text;
  for (const d of parse(text).cells) {
    const r = compileSource(now, undefined, options);
    const c = r.ok ? r.cells.get(d.name) : undefined;
    const line = declLine(now, d.name);
    if (!c?.meter || c.meter.written !== 'scan' || !c.scan || line < 0) continue;
    const lines = now.split('\n');
    const [code, comment] = splitComment(lines[line]!);
    if (!/\bstep=(?!cycle\()/.test(code) || /\bover=/.test(code)) continue;
    // (read but as a meter, a tap or a table, `over=&d`: a pick, a splice, a cycle — it stays)
    const ref = new RegExp(`&${d.name}(?![A-Za-z0-9_:])`);
    const asTable = new RegExp(`\\bover=&${d.name}(?![A-Za-z0-9_])`, 'g');
    if (
      lines.some(
        (l, i) =>
          i !== line &&
          ref.test(
            splitComment(l)[0]
              .replace(/\bstep=&[A-Za-z_][A-Za-z0-9_]*(?![A-Za-z0-9_:*/(])/g, '')
              .replace(asTable, ''),
          ),
      )
    )
      continue;
    const call = /\bscan\(((?:[^()]|\([^()]*\))*)\)/.exec(code);
    if (!call) continue;
    // (a scan that is a table too: the table a cell of its own, its positions as they were)
    const tabled = lines.some((l, i) => i !== line && asTable.test(splitComment(l)[0]));
    const k = c.meter.pulses;
    const pulse = /\bpulse=(\S+)/.exec(code)?.[1];
    const whole = pulse ? noteValue(pulse) : 1 / 4;
    const per = whole ? Math.round(1 / 4 / whole) : 0;
    if (pulse && (per < 1 || k % per !== 0)) continue;
    const bar = pulse ? `meter("+${','.repeat(per - 1)}", ${pulse})` : `meter("${'+'.repeat(k)}")`;
    const laps = /\blaps=([0-9]+)\b/.exec(code);
    const table = /^(?:\s|free\([^()]*\)|-?[0-9]*\.?[0-9]+(?:![0-9]+)?)*$/.test(call[1]!) ? call[1]!.trim() : c.scan.steps.join(' ');
    const fresh = (stem: string, taken: string) => {
      let n = `${stem}1`;
      for (let i = 2; new RegExp(`&${n}(?![A-Za-z0-9_])`).test(taken); i++) n = `${stem}${i}`;
      return n;
    };
    const name = fresh('_s', now);
    const tableName = tabled ? fresh('_t', now) : null;
    if (tableName) for (let i = 0; i < lines.length; i++) if (i !== line) lines[i] = lines[i]!.replace(asTable, `over=&${tableName}`);
    let next = code.replace(call[0], bar).replace(/\s+pulse=\S+/, '');
    if (pulse && laps) next = next.replace(laps[0], `laps=${(+laps[1]! * k) / per}`);
    lines[line] = `${next.trimEnd()} bend=${pulse ?? '4n'}:&${name}${comment ? ` ${comment.trim()}` : ''}`;
    const candidate = `${lines.join('\n').replace(/\s+$/, '')}\n&${name} ${table}${tableName ? `\n&${tableName} ${call[0]}` : ''}`;
    if (soundsIdentical(now, candidate, undefined, options)) now = candidate;
  }
  return now;
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

/** A step that is sugar of a subsequence, at any depth: `x*n`, `<a b>`, `x(k,n)`. */
const sugared = (t: Token): boolean => t.subdivide > 1 || (t.atom.kind === 'seq' && (t.atom.mode === 'alt' || !!t.atom.euclid || t.atom.layers.some((l) => l.some(sugared))));

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
    rows: '18, 22, 25 `<a b>` `x*n` `x(k,n)` `euclid(k, n)` left as written',
    // (a `[ ]` no finer tap plays is core dilate, decision 069 §4: not reported)
    test: (text) => /\beuclid\(/.test(text) || parse(text).cells.some((d) => d.braid.kind === 'list' && d.braid.tokens.some(sugared)),
    why: 'n of a step within it (`x*n`, which is `[x!n]`), a step a lap (`<a b>`, which is `[a b]/2`), or a euclid, kept where a finer grid would change what the line plays: a line that draws, one spliced or read by its units, a table, a stack, a meter with legato by level',
  },
  {
    key: 'sliders',
    rows: '58–64 a unit in `free(…)`, or a tempo marking, left as written',
    test: /\bfree\((?:-?\d*\.?\d+(?:bpm|hz|min|h|d|wk|k)\b|[a-z]+\))/,
    why: 'a slider whose unit is written after its number, or a marking (free(andante)): its numbers in the core’s, the unit an argument',
  },
  {
    key: 'reach',
    rows: 'centre ± reach with a slider in it, left as written (decision 079)',
    test: /±|\+-/,
    why: 'a window written as its centre and reach where either is a slider: the window’s ends follow both, which two sliders of their own wouldn’t',
  },
  {
    key: 'keys',
    rows: '40 `scale(name)` left as written',
    test: /\bscale\((?!&)/,
    why: 'a key whose mode is a name: written as its table where it can be; a key after over= unnamed, or with a slider for a tonic, stays',
  },
  {
    key: 'meter scans',
    rows: '37 `scan(i …)` on a stepped line, left as written',
    test: /\bscan\(.*\bstep=|\bstep=.*\bscan\(/,
    why: 'a meter scan is a meter bent (decision 080): left where it is walked as a table too (`step=cycle(&key)`, its positions both its pitches and its times), or read but as a meter or a table',
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
    // (a tape's read head, `play=&tape at=`, is the ramp's: core, 068 §2)
    test: (text) => text.split('\n').some((l) => /\b(?:play|level)=/.test(l) && !/\bat=/.test(l)),
    why: 'a gate is a set of products, each receiver times its notes and levels, written into the card’s mix (over a kit, its notes read through it); left where the interface keeps it, it is read but in a mix, or it moves a kit’s notes',
  },
  {
    key: 'pitch',
    rows: '88 `pitch=&x`',
    test: /pitch=&[\w(]/,
    why: 'a voice’s pitch= joins every product the voice is in, a sum in each: left where the voice is read but in a mix (a gate, a kit), in a sum, or its pitch written in place',
  },
  {
    key: 'copies',
    rows: '14, 79 `=` `base=`',
    test: /\bbase=/,
    why: 'the base’s braid written over, step by step: left where the base reads a table (`^$n` its grid steps), sets attributes, or its steps are more than numbers',
  },
];
