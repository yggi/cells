/** Generators: a braid written as a rule — scan(…), euclid(…), sin(…), meter(…), spell(…). */
import type { Braid, Span } from '../ast';
import { syntax, type Syntax } from './syntax';
import type { LineScanner } from './scanner';
import { parseFree } from './free';
import { agogic as agogicPositions, even as evenPositions, intervals } from '../../theory/modes';

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
export const SIGNATURES: Record<string, number[]> = {
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

/** Whole numbers between parentheses, comma-separated: euclid(3, 8). The scanner is at '('. */
function numbers(s: LineScanner, name: string, start: number): { args: number[]; span: Span } {
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
  return { args, span };
}

/** k hits as evenly as they go over n steps (Bjorklund's rhythms: euclid(3,8) the tresillo); shift turns it. */
function parseEuclid(s: LineScanner, start: number): Braid {
  const { args, span } = numbers(s, 'euclid', start);
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

function parseSin(s: LineScanner, start: number): Braid {
  const { args, span } = numbers(s, 'sin', start);
  const [n] = args;
  if (args.length !== 1 || n < 2) s.fail('sin(n): one cycle of a sine in n steps, n ≥ 2', start, span.len);
  return { kind: 'sin', n, span };
}

type Generator = (s: LineScanner, start: number) => Braid;

/** The generators: a braid written as a rule. The parser reads a cell's braid through this table. */
export const GENERATORS: Readonly<Record<string, { readonly parse: Generator; readonly syntax: Syntax }>> = {
  scan: {
    parse: parseScan,
    syntax: syntax(
      'generator',
      'scan(i …)',
      'Running totals of intervals: a scale or a meter. An interval can repeat (`1!4`), be geometric (`geo(r, n, k …)`: r^(k/n) for each k) or be `free(…)`.',
      ['&major scan(2 2 1 2 2 2 1)', '&bar scan(27 23 26 24) step=84bpm', '&tempo scan(1!4 .5!2)', '&series scan(geo(5, 25, 0 10 5))', '&swing scan(free(2, 1..3) 1)'],
      'braid.md',
    ),
  },
  euclid: {
    parse: parseEuclid,
    syntax: syntax('generator', 'euclid(k, n) · euclid(k, n, shift)', 'k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned by shift.', ['&tresillo euclid(3, 8)', '&clave euclid(5, 16, 2)'], 'braid.md'),
  },
  sin: {
    parse: parseSin,
    syntax: syntax('generator', 'sin(n)', 'One cycle of a sine in n steps, from −1 to 1: a waveform, or a slow swell.', ['&sine loop=220 sin(12)'], 'braid.md'),
  },
  meter: {
    parse: parseMeter,
    syntax: syntax(
      'generator',
      'meter("sig") · meter("sig", sub) · meter("levels")',
      `A bar as levels, one per step: 0 the downbeat, 1 a beat, then finer. A time signature (${Object.keys(SIGNATURES).join(' ')}) with sub steps a beat, or levels written out (\* bar, + beat, - half, . subdivision, , finer). Its bpm counts beats. Each argument can be free(…).`,
      ['&bar meter("4/4", 2) step=100bpm', '&bar meter("6/8") step=60bpm', '&bar meter("*.+.+..") step=90bpm'],
      'time.md',
    ),
  },
  spell: {
    parse: parseSpell,
    syntax: syntax(
      'generator',
      'spell("text", &table, "names")',
      'A text spelled through a table: each character that is one of the names plays that entry of the table, then a pause; anything else rests as long. The text can be free("…"), a field to type in.',
      ['&dial spell("867 5309", &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")', '&dial spell(free("867 5309"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")'],
      'braid.md',
    ),
  },
};

/** Generators that are gone: reading one says what to write instead. */
export const RETIRED_GENERATORS: Readonly<Record<string, Generator>> = {
  even: (s, start) => {
    const { args, span } = numbers(s, 'even', start);
    const [k, n = 12, phase = 0] = args;
    const steps = k >= 1 && n >= k ? intervals(evenPositions(k, n, phase), n) : null;
    return s.fail(steps ? `even(…) is gone: for a scale write scan(${steps.join(' ')}); for a rhythm, euclid(${k}, ${n}${phase ? `, ${phase}` : ''})` : 'even(…) is gone: write the intervals, scan(2 2 1 2 2 2 1), or a rhythm, euclid(3, 8)', start, span.len);
  },
  agogic: (s, start) => {
    const { args, span } = numbers(s, 'agogic', start);
    const [n, d] = args;
    const pct = agogicPositions(n, d).map((p) => Math.round((p / 12) * 100));
    return s.fail(`agogic(…) is gone: write the beats as a scan, scan(${intervals(pct, 100).join(' ')})`, start, span.len);
  },
};

export const isGenerator = (word: string) => word in GENERATORS || word in RETIRED_GENERATORS;

export function parseGenerator(s: LineScanner, name: string, start: number): Braid {
  return (GENERATORS[name]?.parse ?? RETIRED_GENERATORS[name])(s, start);
}
