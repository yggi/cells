/**
 * A meter a text builds by hand, written as the meter it is (#645, part of #15): what the meter's own forms say since
 * swing by level (#18's first rung, decision 071) and signatures by rule (decision 072).
 *
 *  - `evenScan`: the main meter as even beats, `scan(1 1 1)` or `scan(4 4 4 4)`, written `meter("3/4")`, `meter("4/4")`:
 *    the beats a scan's equal entries count, each a beat (1) or four sixteenths (4) (#196's `scan(1 1 1 1)` →
 *    `meter("4/4")`, for every count from 2 to 12);
 *  - `swingClock`: a clock of two, `&swing scan(2 1) step=8n`, that lines tap by its pulse (`step=&swing:pulse`) to play
 *    eighths long and short, written as the swing it is: the main meter swung by it (`swing=&swing`), the clock a swing
 *    alone (`&swing swing=8n:2/3`, #308), its readers on the note value (`step=8n`). A ratio left free,
 *    `scan(free(2, 1..3) 1)`, is a share left free, `swing=8n:free(2/3, 1/2..3/4)`: the same notes where it starts, its
 *    slider the share (x / (x + b)) where it was the ratio.
 *
 *  - `tapClock`, `shadowMeter`: a second clock folded into the main meter (#668): its readers on the main meter's taps
 *    where every tick of it is one of theirs, or a second meter that is the main one but for its swing, the main meter
 *    taking its swing.
 *
 * Each only where it sounds identical (S1, `rewriteAll`): a pair a beat leans as the clock did where the clock's note value
 * is half the beat (decision 071's pairs), so a swing clock on a 6/8's eighths, or a scan a piece reads as more than a
 * meter, stays as written. The clock keeps its name, so a note about it still points at it. Pure.
 */
import { attrsOf, declLine, declWords, spansLines, splitComment } from '../edit';
import { parse } from '../parser';
import { codeShifts, type CompileOptions, type CompileResult } from '../program';
import { clocking } from '../clocking';
import { compileSource } from '../compile';
import { plan } from '../realize';
import type { Rewrite } from '../rewrite';

const rewrite = (rule: 'meter' | 'swing', title: string, before: string, after: string, apply: (src: string) => string): Rewrite<'meter' | 'swing'> => ({
  id: `${rule}:${before}`,
  tool: 'normalise',
  rule,
  title,
  before,
  after,
  apply,
});

/** One word of &name's declaration replaced, its attributes, spacing and comment kept. */
function replaceInDecl(source: string, name: string, from: string, to: string): string {
  const lines = source.split('\n');
  const i = declLine(source, name);
  if (i < 0) return source;
  const [code, comment] = splitComment(lines[i]!);
  const at = code.indexOf(from);
  if (at < 0) return source;
  lines[i] = code.slice(0, at) + to + code.slice(at + from.length) + comment;
  return lines.join('\n');
}

/** A line's code replaced, its comment kept in the column it was in (or a space after the code, where the code grew past it). */
function keepColumn(line: string, code: string): string {
  const [was, comment] = splitComment(line);
  if (!comment) return code;
  // (a comment a space after its code stays a space after it; one in a column keeps the column)
  const aligned = was.length - was.trimEnd().length > 1;
  return `${code}${' '.repeat(aligned ? Math.max(1, was.length - code.length) : 1)}${comment}`;
}

/** The main meter as even beats (`scan(1 1 1)`, `scan(4 4 4 4)`, `scan(1!5)`) as the signature it is: `meter("3/4")`. */
export function evenScan(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[] {
  const meter = result.mainMeter;
  if (!meter || spansLines(source, meter) || attrsOf(source, meter).has('pulse')) return [];
  const braid = declWords(source, meter)?.braid ?? [];
  const scan = braid.length === 1 ? /^scan\(\s*([^()]*)\)$/.exec(braid[0]!) : null;
  if (!scan) return [];
  const entries = scan[1]!
    .trim()
    .split(/\s+/)
    .flatMap((w) => {
      const m = /^([0-9]+)(?:!([0-9]+))?$/.exec(w);
      return m ? Array.from({ length: Number(m[2] ?? 1) }, () => m[1]!) : ['?'];
    });
  // (a signature has two beats or more: decision 072's from 2/4; one entry, or a 13/4, is no bar a signature names. Its
  // entries are beats as a scan counts them, 1, or sixteenths, 4 to a beat: a scan of 3s may be 6/8's or 3/16's, and stays)
  if (entries.length < 2 || entries.length > 12 || entries.some((e) => e !== entries[0]) || !['1', '4'].includes(entries[0]!)) return [];
  const sig = `meter("${entries.length}/4")`;
  return [rewrite('meter', `&${meter}: ${braid[0]} is ${sig}`, braid[0]!, sig, (src) => replaceInDecl(src, meter, braid[0]!, sig))];
}

/** A number as written (`2`, `.5`, `1.25`), as a fraction n/d of whole numbers. */
function fraction(text: string): [number, number] | null {
  const m = /^(-?)([0-9]*)(?:\.([0-9]+))?$/.exec(text);
  if (!m || (m[2] === '' && m[3] === undefined)) return null;
  const d = 10 ** (m[3]?.length ?? 0);
  return [(m[1] ? -1 : 1) * Number(`${m[2] || '0'}${m[3] ?? ''}`), d];
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** x / (x + b), x and b as written, as a fraction in its lowest terms (`2/3`, `1/2`, `1`). */
function share(x: string, b: string): string | null {
  const [xn, xd] = fraction(x) ?? [NaN, 1];
  const [bn, bd] = fraction(b) ?? [NaN, 1];
  // (xn/xd over xn/xd + bn/bd: xn·bd over xn·bd + bn·xd)
  const n = xn * bd;
  const d = xn * bd + bn * xd;
  if (!Number.isFinite(n) || !(n > 0) || !(d > n)) return null;
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
}

/** A clock of two that lines tap by its pulse to swing (`&swing scan(2 1) step=8n`), as the main meter's swing by it. */
export function swingClock(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[] {
  const meter = result.mainMeter;
  if (!meter || spansLines(source, meter) || attrsOf(source, meter).has('swing') || declLine(source, meter) < 0) return [];
  const out: Rewrite<'meter' | 'swing'>[] = [];
  for (const { name } of parse(source).cells) {
    if (name === meter || spansLines(source, name)) continue;
    const words = declWords(source, name);
    const attrs = attrsOf(source, name);
    const tap = attrs.get('step') ?? '';
    if (!words || words.braid.length !== 1 || attrs.size !== 1 || !/^[0-9]+n$/.test(tap)) continue;
    const NUM = '-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)';
    const fixed = new RegExp(`^scan\\(\\s*(${NUM})\\s+(${NUM})\\s*\\)$`).exec(words.braid[0]!);
    const free = new RegExp(`^scan\\(\\s*free\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\.\\.\\s*(${NUM})\\s*\\)\\s+(${NUM})\\s*\\)$`).exec(words.braid[0]!);
    let amount: string | null = null;
    if (fixed) amount = share(fixed[1]!, fixed[2]!);
    else if (free) {
      const [v, lo, hi] = [free[1]!, free[2]!, free[3]!].map((x) => share(x, free[4]!));
      amount = v && lo && hi ? `free(${v}, ${lo}..${hi})` : null;
    }
    if (!amount) continue;
    // (every other mention of the clock is a line tapping its pulse, or a note's about=: nothing reads it as more)
    const said = source.replace(/about=(?:\([^)]*\)|&\w+)/g, '');
    const mentions = [...said.matchAll(new RegExp(`&${name}(?!\\w)`, 'g'))].length;
    const taps = [...said.matchAll(new RegExp(`step=&${name}:pulse(?![\\w*/.:])`, 'g'))].length;
    if (taps === 0 || mentions !== 1 + taps) continue;
    const lean = `swing=${tap}:${amount}`;
    out.push(
      rewrite(
        'swing',
        `&${name} ${words.braid[0]} step=${tap}, tapped by its pulse, is a swing of the meter's: &${meter} swing=&${name}, &${name} ${lean}`,
        `&${name} ${words.braid[0]} step=${tap}`,
        `&${name} ${lean}`,
        (src) => {
          const lines = src.split('\n');
          const i = declLine(src, name);
          const indent = /^\s*/.exec(lines[i]!)![0];
          lines[i] = keepColumn(lines[i]!, `${indent}&${name} ${lean}`);
          // (the meter's swing last, as the meter fragment writes it: `step=&tempo swing=&swing`)
          const m = declLine(src, meter);
          const [code] = splitComment(lines[m]!);
          lines[m] = keepColumn(lines[m]!, `${code.trimEnd()} swing=&${name}`);
          const tapped = new RegExp(`step=&${name}:pulse(?![\\w*/.:])`, 'g');
          return lines.map((l) => (tapped.test(l) ? keepColumn(l, splitComment(l)[0].trimEnd().replace(tapped, `step=${tap}`)) : l)).join('\n');
        },
      ),
    );
  }
  return out;
}

/** The main meter's taps a second clock's readers may read instead: note values, dotted and triplets, the pulse, the beat, the bar. */
const TAPS = [...['1n', '2n', '4n', '8n', '16n', '32n'].flatMap((n) => [n, `${n}.`, n.replace('n', 't')]), 'pulse', 'beat', '1m'];

/** How many of a clock's steps are compared, and how near (seconds): 64, to 1e-9, so a slow clock is checked past its first tick (#669). */
const SAME = { steps: 64, seconds: 1e-9 } as const;

/** Every mention of &name in the source but those the given patterns match: what else reads it. */
function otherMentions(source: string, name: string, ...readers: RegExp[]): number {
  const said = readers.reduce((s, r) => s.replace(r, ''), source.replace(/about=(?:\([^)]*\)|&\w+)/g, ''));
  return [...said.matchAll(new RegExp(`&${name}(?!\\w)`, 'g'))].length - 1;
}

/** Is &name mentioned by a note's `about=`? Its line then stays, so the note still points at it. */
const noted = (source: string, name: string) => new RegExp(`about=(?:\\([^)]*&${name}(?!\\w)[^)]*\\)|&${name}(?!\\w))`).test(source);

/** The source without &name's own line. */
function dropLine(source: string, name: string): string {
  const lines = source.split('\n');
  const i = declLine(source, name);
  return i < 0 ? source : [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
}

/** A clock's onsets, its first `SAME.steps`, from the time map the compile builds; null where it has none. */
function onsets(source: string, key: string, options: CompileOptions): number[] | null {
  const r = compileSource(source, undefined, options);
  if (!r.clocks.has(key)) return null;
  const map = clocking(r, plan(r, codeShifts(r)).statics).map(key);
  return Array.from({ length: SAME.steps }, (_, i) => map.q(i));
}

/**
 * A second clock its readers tap where every tick of it is a tick of a tap of the main meter (#668, `tapClock`): the
 * readers read that tap (`step=&sixteenths:16n` → `step=8n` under alla breve), and the clock goes where nothing else
 * reads it (its line stays where a note is about it). The clock's first 64 ticks are compared with the tap's to 1e-9 s,
 * so a clock slower than S1's window is checked past its first tick (#669's (a)). A clock with a slider of its own
 * (`free(`) isn't folded: two sliders never become one silently.
 */
export function tapClock(source: string, result: CompileResult, options: CompileOptions = {}): Rewrite<'meter' | 'swing'>[] {
  const main = result.mainMeter;
  if (!main) return [];
  const own = new Set(parse(source).cells.map((d) => d.name));
  const out: Rewrite<'meter' | 'swing'>[] = [];
  for (const name of own) {
    if (name === main || !result.clocks.has(name) || spansLines(source, name)) continue;
    const line = source.split('\n')[declLine(source, name)] ?? '';
    if (/free\(/.test(splitComment(line)[0])) continue;
    // (its readers: lines that tap it, `step=&x:16n`; anything else that reads it, a table or its own steps, keeps it)
    const tapped = new RegExp(`step=&${name}:([\\w.]+)(?![\\w*/.:])`, 'g');
    const taps = [...new Set([...source.matchAll(tapped)].map((m) => m[1]!))];
    if (!taps.length || otherMentions(source, name, tapped) !== 0) continue;
    const probe = `${source}\n${TAPS.map((t, i) => `&__tap${i} step=${t} 0`).join('\n')}`;
    const near = (a: number[], b: number[]) => a.every((x, i) => Math.abs(x - b[i]!) <= SAME.seconds);
    const instead = new Map<string, string>();
    for (const tap of taps) {
      const theirs = onsets(source, `${name}:${tap}`, options);
      const match =
        theirs &&
        TAPS.find((t) => {
          const ours = onsets(probe, `${main}:${t}`, options);
          return ours !== null && near(ours, theirs);
        });
      if (match) instead.set(tap, match);
    }
    if (instead.size !== taps.length) continue;
    const said = [...instead].map(([a, b]) => `&${name}:${a} is ${b}`).join(', ');
    out.push(
      rewrite('meter', `&${name}'s ticks are &${main}'s: ${said}`, `step=&${name}:${taps[0]}`, `step=${instead.get(taps[0]!)}`, (src) => {
        let next = src.replace(tapped, (_, tap: string) => `step=${instead.get(tap) ?? `&${name}:${tap}`}`);
        if (!noted(next, name) && otherMentions(next, name) === 0) next = dropLine(next, name);
        return next;
      }),
    );
  }
  return out;
}

/**
 * A second meter that is the main one but for its feel (#668, `shadowMeter`): the main meter's own rate (the same cell or
 * the same written rate, never a slider of its own), its bar as long, read only by taps; the main meter takes its swing
 * and legato where it has none, its readers read the main meter's taps, and it goes where nothing else reads it.
 */
export function shadowMeter(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[] {
  const main = result.mainMeter;
  if (!main || declLine(source, main) < 0 || spansLines(source, main)) return [];
  const mine = attrsOf(source, main);
  const rate = mine.get('step');
  if (!rate || /free\(/.test(rate)) return [];
  const out: Rewrite<'meter' | 'swing'>[] = [];
  for (const { name } of parse(source).cells) {
    if (name === main || !result.cells.get(name)?.meter || spansLines(source, name)) continue;
    const theirs = attrsOf(source, name);
    if (theirs.get('step') !== rate) continue;
    // (what it adds: a feel the main meter doesn't have; nothing else a meter of its own would carry)
    const feel = ['swing', 'legato'].filter((k) => theirs.has(k));
    if (!feel.length || feel.some((k) => mine.has(k)) || [...theirs.keys()].some((k) => k !== 'step' && !feel.includes(k))) continue;
    const tapped = new RegExp(`step=&${name}:([\\w.]+)(?![\\w*/.:])`, 'g');
    if (!tapped.test(source) || otherMentions(source, name, tapped) !== 0) continue;
    const add = feel.map((k) => `${k}=${theirs.get(k)}`).join(' ');
    out.push(
      rewrite('swing', `&${name} is &${main} with ${add}: &${main} ${add}, its readers on &${main}'s taps`, `&${name}`, `&${main} ${add}`, (src) => {
        const lines = src.split('\n');
        const m = declLine(src, main);
        lines[m] = keepColumn(lines[m]!, `${splitComment(lines[m]!)[0].trimEnd()} ${add}`);
        let next = lines.join('\n').replace(tapped, (_, tap: string) => `step=${tap}`);
        if (!noted(next, name) && otherMentions(next, name) === 0) next = dropLine(next, name);
        return next;
      }),
    );
  }
  return out;
}
