/** Generators: a braid written as a rule — scan(…), even(…), euclid(…), sin(…) saw(…) tri(…) square(…), scale(…), fifths(…), meter(…), spell(…). */
import type { Braid, Ref, Span, WaveShape } from '../ast';
import { noteName, noteValue, type Signature } from '../meter';
import { syntax, type Syntax } from './syntax';
import type { LineScanner } from './scanner';
import { parseFree } from './free';
import { NUMBER_PLACES } from './numbers';
import { agogic as agogicPositions, diatonicSteps, even as evenPositions, intervals, MODE_WORDS, SCALES, scaleOfPhase } from '../../theory/modes';
import { TONAL_SCALES } from '../../theory/tonal';

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
      const r = s.num('a ratio, like geo(5, 25, 0 10 5)', NUMBER_PLACES.geo, 'ratio').value;
      s.skipSpace();
      s.expect(',', `',' then the steps per ratio: geo(${r}, 25, 0 10 5)`);
      s.skipSpace();
      const n = s.int('the steps per ratio', { ...NUMBER_PLACES.geo, whole: true, min: 1 }, 'steps');
      s.skipSpace();
      s.expect(',', `',' then the exponents: geo(${r}, ${n}, 0 10 5)`);
      const ks: number[] = [];
      for (;;) {
        s.skipSpace();
        if (s.peek() === ')') break;
        ks.push(s.num('an exponent', NUMBER_PLACES.geo, 'exponent').value);
      }
      s.i++;
      if (!(r > 0) || n < 1 || ks.length === 0) s.fail('geo(r, n, k …): r above 0, n ≥ 1, at least one k', at, s.i - at);
      for (const k of ks) steps.push(+Math.pow(r, k / n).toFixed(9));
      continue;
    }
    // an interval left to the performer: scan(free(2, 1..3) 1) — swing
    const f = s.free(NUMBER_PLACES.interval);
    if (f !== null) {
      if (!(f.lo > 0)) s.fail('A scan interval stays positive: give free(…) a range above 0', at, s.i - at);
      steps.push(f.value);
    } else {
      const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
      if (n === null || !(parseFloat(n) > 0)) s.fail('scan(…) takes positive intervals, like scan(2 2 1 2 2 2 1)', at);
      // x!n: the interval n times, as in braids (a tempo map: scan(1!432 .72!96 2!17))
      let times = 1;
      if (s.peek() === '!') {
        s.i++;
        const k = s.freeNumber(NUMBER_PLACES.intervals);
        const r = k === null ? s.match(/[0-9]+/y) : String(k);
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
  const table = s.cellRef('the table its characters pick from, like &keys', 'in spell(…)');
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
    return [
      { atom: { kind: 'ref' as const, name: table.name, pick: { kind: 'at' as const, i: k, abs: true as const }, shift: 0 }, repeat: 1, subdivide: 1, elongate: 1, span },
      rest,
    ];
  });
  if (!tokens.length) tokens.push(rest);
  return { kind: 'list', tokens, span } as Braid;
}

/**
 * A meter's grouping (yggi/music-commons `contracts/meter` v2, decision 072): its pulses, their note value as a
 * denominator, and its groups in pulses, each a beat (what bpm counts).
 */
export interface Grouping {
  readonly pulses: number;
  readonly unit: number;
  readonly groups: readonly number[];
}

/** The sizes a group written as sizes can have, in pulses: 2 and 3, and 4 and 6, two and three pairs (contracts/meter v2). */
const SIZES: readonly number[] = [2, 3, 4, 6];

/**
 * A signature's or sizes' grouping by rule, the table of names gone (contracts/meter v2, decision 072: a meter is two
 * applications of even); null where the text is neither.
 *  - x/8, x/16, x/32: the gaps of the canonical even set of ⌈x/3⌉ places in x (contracts/euclid), the fewest groups of 2
 *    and 3 as evenly as they go: 3/8 one group, 7/8 3+2+2, 8/8 3+3+2, 10/8 3+2+3+2, 11/8 3+3+3+2.
 *  - x/4, x/2: x beats of the denominator, but x/3 groups of three where x is a multiple of 3 from 6 (6/4: two dotted
 *    halves, against 3/2's three halves).
 *  - sizes, `2+2+3`, of eighths, or of the denominator after a slash, `2+2+3/4`, `3+3+2/16`: each 2, 3, 4 or 6.
 */
export function groupingOf(sig: string): Grouping | null {
  const sized = /^([1-9][0-9]*(?:\+[1-9][0-9]*)+)(?:\/(2|4|8|16|32))?$/.exec(sig);
  if (sized) {
    const groups = sized[1]!.split('+').map(Number);
    if (!groups.every((g) => SIZES.includes(g))) return null;
    return { pulses: groups.reduce((a, b) => a + b, 0), unit: Number(sized[2] ?? 8), groups };
  }
  const named = /^([1-9][0-9]*)\/(2|4|8|16|32)$/.exec(sig);
  if (!named) return null;
  const [x, unit] = [Number(named[1]), Number(named[2])];
  if (x < 2 || x > 32) return null;
  if (unit >= 8) {
    const set = evenPositions(Math.ceil(x / 3), x, Math.ceil(x / 3) - 1);
    return { pulses: x, unit, groups: set.map((j, i) => (set[i + 1] ?? x) - j) };
  }
  return { pulses: x, unit, groups: x % 3 === 0 && x >= 6 ? Array(x / 3).fill(3) : Array(x).fill(1) };
}

/** A time signature's pulses, their note value and its beats in pulses (decision 040). */
export function signatureOf(sig: string): Signature {
  const g = groupingOf(sig);
  return { pulses: g?.pulses ?? 0, unit: g?.unit ?? 4, beats: g?.groups ?? [] };
}

/**
 * The tier each group's start is on (contracts/meter): 0 the first (the bar's), and under the bar, two or three groups
 * flat, four or more halved by even(2, count) (4 as 2+2, 5 as 3+2), each half again, a tier for each halving.
 */
function groupTiers(count: number): number[] {
  const tier = Array<number>(count).fill(Infinity);
  const walk = (from: number, to: number, depth: number) => {
    tier[from] = Math.min(tier[from]!, depth);
    if (to - from <= 3) {
      for (let i = from + 1; i < to; i++) tier[i] = Math.min(tier[i]!, depth + 1);
      return;
    }
    const cut = from + evenPositions(2, to - from, 1)[1]!;
    walk(from, cut, depth + 1);
    walk(cut, to, depth + 1);
  };
  walk(0, count, 0);
  return tier;
}

/**
 * A meter's steps as the tiers of its tree (contracts/meter v2): 0 the bar, then the groups' tiers, then where a group
 * holds pairs (4 or 6 eighths, or more than one quarter or half) a tier for the pairs after its first, then the eighth,
 * then the step; the eighth and the step are its last two tiers whether or not the meter's steps reach them. Computed on
 * the contract's grid, an eighth at a time (an x/16 or x/32 meter's pulse standing for its eighth), and read at the meter's
 * steps: a step that isn't on the eighths or their halves (a quarter's thirds) is the eighth's tier where `sub` is 3, the
 * step's otherwise, as a beat in three has always been.
 */
function meterTiers(g: Grouping, sub: number): { tiers: number[]; eighth: number; step: number } {
  const scale = g.unit >= 8 ? 1 : 8 / g.unit;
  const eighths = g.groups.map((x) => x * scale);
  const tree = groupTiers(eighths.length);
  const deepest = Math.max(0, ...tree);
  const pairs = eighths.some((e) => e >= 4);
  const inner = pairs ? deepest + 1 : null;
  const eighth = (inner ?? deepest) + 1;
  const step = eighth + 1;
  const starts = new Map<number, number>();
  eighths.reduce((at, size, i) => {
    starts.set(at, tree[i]!);
    if (inner !== null && size >= 4) for (let q = 2; q < size; q += 2) starts.set(at + q, inner);
    return at + size;
  }, 0);
  const perEighth = g.unit >= 8 ? sub : (sub * g.unit) / 8;
  const total = g.pulses * sub;
  const tiers = Array.from({ length: total }, (_, k) => {
    const p = k / perEighth;
    const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
    if (near(p)) return starts.get(Math.round(p)) ?? eighth;
    if (near(2 * p)) return step;
    return g.unit <= 4 && sub === 3 ? eighth : step;
  });
  return { tiers, eighth, step };
}

/** A meter's grades (contracts/meter v2): its tiers mapped from the ends, `*` the bar, `,` the step and `.` the eighth, those between `+ - : ;` from the top. */
const gradeOf = (t: number, eighth: number, step: number): string => (t === 0 ? '*' : t === step ? ',' : t === eighth ? '.' : '+-:;'[Math.min(t - 1, 3)]!);

/**
 * The numbers a meter writes in its braid, its tiers mapped from the ends into five (the owner on #506): 0 the bar, 4
 * the step and 3 the eighth, 1 the tier below the bar, 2 every tier between. So a kit read by a meter is a plain index,
 * its five members the bar, a beat, a half's beat, the eighth and finer, whatever the meter's depth.
 */
const numberOf = (t: number, eighth: number, step: number): number => (t === 0 ? 0 : t === step ? 4 : t === eighth ? 3 : Math.min(t, 2));

/** A written level's number: its grade mapped from the ends into five, as `numberOf` maps a tier. */
const writtenNumber = (ch: string): number => ({ '*': 0, '+': 1, '-': 2, ':': 2, ';': 2, '.': 3, ',': 4 })[ch] ?? 0;

/** Levels as written: the grades `* + - : ; . ,`, one a step. */
const WRITTEN = /^[*+\-:;.,]+$/;

/** A meter's grades, one a step (contracts/meter v2): as written, or from its signature or sizes; '' where it is neither. */
export function meterLevels(sig: string, sub: number): string {
  if (WRITTEN.test(sig)) return sig;
  const g = groupingOf(sig);
  if (!g) return '';
  const { tiers, eighth, step } = meterTiers(g, sub);
  return tiers.map((t) => gradeOf(t, eighth, step)).join('');
}

/** A meter's numbers, one a step: its tiers from the ends into five (`numberOf`), or a written level's (`writtenNumber`). */
function meterNumbers(sig: string, sub: number): number[] {
  if (WRITTEN.test(sig)) return [...sig].map(writtenNumber);
  const g = groupingOf(sig);
  if (!g) return [];
  const { tiers, eighth, step } = meterTiers(g, sub);
  return tiers.map((t) => numberOf(t, eighth, step));
}

/**
 * meter(signature, step): a bar as levels, one a step, its numbers its tiers from the ends (`numberOf`): 0 the downbeat
 * (*), 1 a beat (+), 2 a half's beat (-, and any tier between, : ;), 3 the eighth (.), 4 finer (,). The step is a number
 * of steps a pulse, or a note value (`16n`: meter("6/8", 16n) is meter("6/8", 2)). The bpm counts the beats, its groups.
 * meter("4/4", 2): *.-.+.-. ; meter("6/8"): *..+.. ; meter("2+2+3"): *.+.+.. ; meter("2/2", 2): *.-.+.-., two beats ;
 * meter("*.+.+.."): as written, every mark but . and , starting a beat, its step a note value if given (meter("*,.,+,.,", 8n)).
 */
function parseMeter(s: LineScanner, start: number): Braid {
  s.i++; // (
  s.skipSpace();
  const arg = (what: string): string => {
    if (s.peek() === '"') return s.match(/"[^"]*"/y)!.slice(1, -1);
    const f = s.free(NUMBER_PLACES.meter);
    if (f !== null) {
      if (f.key === 'text' || f.text !== undefined) return f.text ?? '';
      if (f.labels) return f.labels[Math.round((f.value - f.lo) / ((f.hi - f.lo) / Math.max(1, f.labels.length - 1) || 1))] ?? '';
      return String(f.value);
    }
    const n = s.match(/[1-9][0-9]*(?:n\.?|t)(?![0-9A-Za-z])|[0-9]+/y);
    if (n === null) s.fail(`${what}: in quotes ("4/4"), a number, a note value (16n) or free(…)`);
    return n!;
  };
  const sig = arg('the time signature');
  const written = WRITTEN.test(sig);
  const grouping = written ? null : groupingOf(sig);
  s.skipSpace();
  let sub = 1;
  let stepWhole: number | null = null;
  if (s.peek() === ',') {
    s.i++;
    s.skipSpace();
    const at = s.i;
    const text = arg('the step: steps a pulse, or its note value');
    const whole = noteValue(text);
    if (whole !== null) {
      // (a note value: so many steps a pulse of the signature, or the step of levels written out)
      if (grouping) {
        const per = 1 / grouping.unit / whole;
        if (!(Math.abs(per - Math.round(per)) < 1e-9 && Math.round(per) >= 1 && Math.round(per) <= 8))
          s.fail(`meter("${sig}", ${text}): the step divides the pulse, ${noteName(1 / grouping.unit) ?? `a 1/${grouping.unit}`}, into 1 to 8 steps`, at, text.length);
        sub = Math.round(per);
      } else stepWhole = whole;
    } else sub = Math.max(1, Math.min(8, parseInt(text, 10) || 1));
    s.skipSpace();
  }
  s.expect(')', `')' to close meter(…)`);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  const numbers = meterNumbers(sig, sub);
  if (!numbers.length)
    s.fail(
      `meter("${sig}"): a time signature (x/2 x/4 x/8 x/16: 4/4, 6/8, 7/8, 2/2), groups as sizes ("2+2+3" of eighths, "2+2+3/4" of quarters; each 2, 3, 4 or 6), or levels like "*.-.+.-." (* the bar, + - : ; beats, the higher the stronger, . the eighth, , finer)`,
      start,
      span.len,
    );
  const tokens = numbers.map((value) => ({ atom: { kind: 'note' as const, value, alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }));
  // (written out: its beats each mark but . and , (#15, item 3: (a)), its step's note value its pulse where given)
  const beatsOf = (): number[] => {
    const starts = [...sig].flatMap((ch, i) => (i === 0 || (ch !== '.' && ch !== ',') ? [i] : []));
    return starts.map((at, i) => (starts[i + 1] ?? sig.length) - at);
  };
  const signature = grouping ? signatureOf(sig) : stepWhole !== null ? { pulses: sig.length, unit: 1 / stepWhole, beats: beatsOf() } : undefined;
  const beats = signature ? signature.beats.length : beatsOf().length;
  return { kind: 'list', tokens, span, perBeat: numbers.length / Math.max(1, beats), ...(signature ? { signature } : {}) } as Braid;
}

/** Whole numbers between parentheses, comma-separated: euclid(3, 8). The scanner is at '('. */
function numbers(s: LineScanner, name: string, start: number): { args: number[]; span: Span } {
  s.i++; // (
  const args: number[] = [];
  for (;;) {
    s.skipSpace();
    args.push(s.int(`a number in ${name}(…)`, NUMBER_PLACES.args, name));
    s.skipSpace();
    if (s.peek() !== ',') break;
    s.i++;
  }
  s.expect(')', `')' to close ${name}(…)`);
  const span = s.span(start);
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
  return { args, span };
}

/** k hits as evenly as they go over n steps (Bjorklund's rhythms: euclid(3,8) the tresillo); shift turns it right, as Strudel's (k,n,r). */
function parseEuclid(s: LineScanner, start: number): Braid {
  const { args, span } = numbers(s, 'euclid', start);
  const [k, n, shift = 0] = args;
  if (args.length < 2 || args.length > 3 || !(n >= 1) || !(k >= 0 && k <= n))
    s.fail('euclid(k, n): k hits spread evenly over n steps (0 ≤ k ≤ n), euclid(k, n, shift) turned', start, span.len);
  const pattern = bjorklund(k, n);
  const tokens = Array.from({ length: n }, (_, j) => {
    const i = (((j - shift) % n) + n) % n;
    const hit = pattern[i];
    return { atom: hit ? { kind: 'note' as const, value: 0, alter: 0 } : { kind: 'rest' as const }, repeat: 1, subdivide: 1, elongate: 1, span };
  });
  return { kind: 'list', tokens, span } as Braid;
}

/**
 * even(k, n, phase): the maximally even necklace, k places in n, a table (decision 072): each place at
 * floor((j·n + phase) / k), the same table as the scan of its intervals. Its phase is its mode, 0 … k − 1, each phase one
 * place moved, every mode starting on 0 (the seven of even(7, 12) are scale(&mode)'s phases). The one generator under the scales (the diatonic, the pentatonic), the even rhythms (the bell, the
 * tresillo) and a meter's groups; euclid(k, n, r) is the same places as a rhythm of n steps, turned as Strudel's.
 */
function parseEven(s: LineScanner, start: number): Braid {
  const { args, span } = numbers(s, 'even', start);
  const [k, n, phase = 0] = args;
  if (args.length < 2 || args.length > 3 || !(k >= 1) || !(n >= k))
    s.fail('even(k, n): k places spread as evenly as they go over n (1 ≤ k ≤ n), even(k, n, phase) its mode', start, span.len);
  if (!(phase >= 0 && phase < k)) s.fail(`even(${k}, ${n}, phase): the phase is a mode, 0 to ${k - 1}, each one place moved`, start, span.len);
  return { kind: 'scan', steps: intervals(evenPositions(k, n, phase), n), span };
}

type Generator = (s: LineScanner, start: number) => Braid;

/** What each waveform is, in words. */
const WAVE_NAMES: Readonly<Record<WaveShape, string>> = { sin: 'a sine', saw: 'a saw', tri: 'a triangle', square: 'a square' };

/** sin(n), saw(n), tri(n), square(n): one cycle of a waveform in n steps. */
const parseWave =
  (shape: WaveShape): Generator =>
  (s, start) => {
    const { args, span } = numbers(s, shape, start);
    const [n] = args;
    if (args.length !== 1 || n < 2) s.fail(`${shape}(n): one cycle of ${WAVE_NAMES[shape]} in n steps, n ≥ 2`, start, span.len);
    return { kind: 'wave', shape, n, span };
  };

/**
 * A waveform's n values, −1 … 1: Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step's start, i/n of
 * the cycle — a sine from 0 up, a saw from −1 up to just short of 1, a triangle from −1 up to 1 at the half and back,
 * a square −1 for the first half and 1 for the second.
 */
export function waveValues(shape: WaveShape, n: number): number[] {
  const at = (t: number) =>
    shape === 'sin' ? Math.sin(2 * Math.PI * t) : shape === 'saw' ? 2 * t - 1 : shape === 'tri' ? (t < 0.5 ? 4 * t - 1 : 3 - 4 * t) : Math.floor(2 * t) % 2 ? 1 : -1;
  return Array.from({ length: n }, (_, i) => +at(i / n).toFixed(6) + 0);
}

/** A tonic as a note name: C, F#, Bb (a pitch class). */
const TONICS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tonicName = (pc: number) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((pc % 12) + 12) % 12];

/** The start of the name of the key a `scale(…)` declares (`key:λ3_8`): a cell whose `over=` names one reads its own scale(…). */
export const SCALE_KEY = 'key:λ';

/**
 * `scale(name, tonic)`: a scale by name over the 12 turned to its tonic. What it stands for is two cells: the key (the
 * 12, `shift=` the tonic: a note name, a number, a cell holding one (`&tonic`, #290) or free(…)) and the scale's steps over it, `scan(…)`. The key is declared
 * here, unnamed and not drawn (`key:…`); the scan and the key are the caller's to place — a cell's own braid reading
 * through it, or a table of its own after over=. The old `scale(tonic, phase)` (a mode by number) still reads, with a
 * warning that says it by name.
 */
export function parseScale(s: LineScanner, start: number): { steps: number[]; key: Ref; span: Span; mode?: Ref } {
  s.i++; // (
  s.skipSpace();
  let steps: number[];
  let tonic = 0;
  let tonicText = '0';
  let tonicRef: Ref | null = null;
  let modeRef: Ref | null = null;
  const legacy = s.match(/-?[0-9]+/y);
  const quoted = legacy === null ? s.match(/"[^"]*"/y) : null;
  if (quoted !== null) {
    // Strudel's spelling (decision 027): "D:minor", "F#:harmonic:minor", the tonic first, the name's words after colons:
    // a name of tonal's, as Strudel reads it (whole:tone, bebop:major, messiaen's:mode:#2), or one of ours (minorpentatonic)
    const m = /^"([A-G](?:#|b)?)([0-9]*)((?::[a-z0-9#'-]+)+)"$/.exec(quoted);
    if (!m) s.fail('scale("tonic:name"): a tonic and a scale\'s name, as in Strudel — scale("D:minor"), scale("F#:harmonic:minor")', start, s.i - start);
    if (m![2]) s.fail(`scale("${m![1]}${m![2]}:…"): the octave is the voice's (loop=), not the scale's: scale("${m![1]}${m![3]}")`, start, s.i - start);
    const words = m![3]!.slice(1).split(':');
    // (own names only: not "C:constructor")
    const [tonal, ours] = [words.join(' '), words.join('')];
    const scale = Object.hasOwn(TONAL_SCALES, tonal) ? TONAL_SCALES[tonal] : Object.hasOwn(SCALES, ours) ? SCALES[ours]!.steps : undefined;
    if (!scale)
      s.fail(
        `scale("…${m![3]}"): a scale by name — ours (${Object.keys(SCALES).join(' ')}) or tonal's, as Strudel reads them (harmonic:minor, minor:pentatonic, whole:tone, diminished, chromatic, bebop … listed in tables.md)`,
        start,
        s.i - start,
      );
    steps = [...scale!];
    const note = m![1]!;
    tonic = (((TONICS[note[0]!]! + (note[1] === '#' ? 1 : note[1] === 'b' ? -1 : 0)) % 12) + 12) % 12;
    tonicText = String(tonic);
    s.skipSpace();
    s.expect(')', "')' to close scale(…)");
  } else if (legacy !== null) {
    // scale(tonic, phase): the mode by its number, darkest first
    s.skipSpace();
    s.expect(',', "',' then the mode — better by name: scale(minor, A)");
    s.skipSpace();
    const at = s.i;
    const phase = s.int('the mode, 0 (the darkest) to 6', NUMBER_PLACES.phase);
    if (phase > 6) s.fail(`scale(tonic, phase): the phase is a mode, 0 (the darkest, Locrian) to 6 (the brightest, Lydian) — not ${phase}`, at, String(phase).length);
    tonic = parseInt(legacy, 10);
    tonicText = legacy;
    steps = intervals(evenPositions(7, 12, phase), 12);
    s.skipSpace();
    s.expect(')', "')' to close scale(…)");
    s.warn(`scale(${tonic}, ${phase}) is written scale(${scaleOfPhase(phase)}, ${tonicName(tonic)}): the mode by name, then the tonic`, start, s.i - start);
  } else {
    const at = s.i;
    if (s.peek() === '&') {
      // a diatonic mode read from a cell holding one (#363): `&mode major`, its phase; compile sets the steps (declare.ts)
      modeRef = s.cellRef('the cell that holds the mode, like scale(&mode, &tonic)', 'as the mode');
      steps = diatonicSteps(MODE_WORDS.major!);
    } else {
      const name = s.match(/[a-z]+/y);
      const scale = name ? SCALES[name] : undefined;
      if (!scale) s.fail(`scale(name, tonic): a scale by name — ${Object.keys(SCALES).join(' ')}, or a cell holding a mode (&mode)`, at, Math.max(1, (name ?? '').length));
      steps = [...scale!.steps];
    }
    s.skipSpace();
    if (s.peek() === ',') {
      s.i++;
      s.skipSpace();
      const t0 = s.i;
      const note = s.match(/[A-G](?:#|b)?(?![A-Za-z0-9])/y);
      if (note !== null) {
        // (a pitch class: Cb is B, B# is C)
        tonic = (((TONICS[note[0]] + (note[1] === '#' ? 1 : note[1] === 'b' ? -1 : 0)) % 12) + 12) % 12;
        tonicText = String(tonic);
      } else if (s.peek() === '&') {
        // a tonic read from a cell holding a note (#290): a hole the text that uses the key fills, as it fills a name
        tonicRef = s.cellRef('the cell that holds the tonic, like scale(dorian, &tonic)', 'as the tonic');
        tonicText = `&${tonicRef.name}`;
      } else {
        // (or left to the performer: its slider is the cell's own ('tonic'), its value the key's shift)
        const free = s.text.startsWith('free(', s.i);
        tonic = s.int('the tonic: a note name (D, F#, Bb), a number, a cell (&tonic) or free(…)', NUMBER_PLACES.tonic);
        tonicText = free ? s.text.slice(t0, s.i) : String(tonic);
        if (Math.abs(tonic) > 11) s.warn(`scale(…, ${tonic}): the tonic is a pitch class, 0 (C) to 11 (B)`, t0, s.i - t0);
      }
      s.skipSpace();
    }
    s.expect(')', "')' to close scale(…)");
  }
  const span = s.span(start);
  const key = `${SCALE_KEY}${s.line}_${start + s.offset}`;
  s.lambdas.push({
    name: key,
    span,
    lambda: `shift=${tonicText}`,
    over: null,
    shift: tonic,
    ...(tonicRef ? { tonic: tonicRef } : {}),
    off: false,
    step: null,
    map: null,
    stride: null,
    cycle: null,
    params: {},
    paramSpans: {},
    braid: { kind: 'blank' },
  });
  return { steps, key: { name: key, pick: null, shift: 0, span }, span, ...(modeRef ? { mode: modeRef } : {}) };
}

/**
 * `fifths()`, `fifths(n)`, `fifths(G)`: the circle of fifths, the twelve pitch classes a fifth apart (C G D A E B F#
 * C# Ab Eb Bb F), as written from C; turned n steps round, or to start on a note (the cell's shift: `[0]` is where
 * it starts, `[$0]` C).
 */
export function parseFifths(s: LineScanner, start: number): { braid: Braid; shift: number } {
  s.i++; // (
  s.skipSpace();
  let shift = 0;
  if (s.peek() !== ')') {
    const at = s.i;
    const name = s.noteName();
    if (name !== null) shift = ((((name % 12) + 12) % 12) * 7) % 12;
    else shift = s.int('how many fifths round it starts (fifths(1): on G), or the note it starts on: fifths(G)', NUMBER_PLACES.fifths);
    if (name === null && Math.abs(shift) > 11) {
      // (a turn past a lap climbs one, as every shift= does; a note's name is a pitch class and never climbs)
      const laps = Math.trunc(shift / 12);
      const rest = shift % 12;
      const note = 'C G D A E B F# C# Ab Eb Bb F'.split(' ')[(rest + 12) % 12];
      s.warn(
        `fifths(${shift}): the circle comes round after 12, and a turn past a lap climbs one, as every shift does: fifths(${rest}) ${laps > 0 ? 'up' : 'down'} ${Math.abs(laps)} octave${Math.abs(laps) === 1 ? '' : 's'}${rest ? ` (fifths(${note}) names the note, no octave)` : ''}`,
        at,
        s.i - at,
      );
    }
    s.skipSpace();
  }
  s.expect(')', "')' to close fifths(…)");
  const span = s.span(start);
  const tokens = Array.from({ length: 12 }, (_, k) => ({ atom: { kind: 'note' as const, value: (k * 7) % 12, alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }));
  return { braid: { kind: 'list', tokens, span } as Braid, shift };
}

/** The waveforms share one entry of the reference (one form, sin(n), on the tutorial's ladder). */
const WAVE_SYNTAX = syntax(
  'generator',
  'sin(n) · saw(n) · tri(n) · square(n)',
  "One cycle of a waveform in n steps, from −1 to 1, as Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step: a sine from 0, a saw rising from −1, a triangle rising from −1 to 1 at the half and falling back, a square −1 then 1. A waveform, or a slow swell.",
  ['&sine loop=220 sin(12)', '&ramp loop=220 saw(8)', '&swell map=lin loop=.25 tri(4)', '&pulse loop=110 square(2)'],
  'braid.md',
);

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
    syntax: syntax(
      'generator',
      'euclid(k, n) · euclid(k, n, shift)',
      "k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned right by shift steps, as Strudel's (k, n, r).",
      ['&tresillo euclid(3, 8)', '&clave euclid(5, 16, 2)'],
      'braid.md',
    ),
  },
  even: {
    parse: parseEven,
    syntax: syntax(
      'generator',
      'even(k, n) · even(k, n, phase)',
      "k places spread as evenly as they go over n: a table (the scan of its intervals), its phase its mode, 0 to k − 1, each one place moved. The one generator under the diatonic (even(7, 12), its phases the seven modes), the pentatonic, the standard bell, the tresillo and a meter's groups (decision 072); euclid(k, n, r) is its places as a rhythm of n steps, turned as Strudel's.",
      ['&ionian even(7, 12, 5)', '&pentatonic even(5, 12)', '&minorPentatonic even(5, 12, 3)', '&tresillo even(3, 8, 2)'],
      'tables.md',
    ),
  },
  sin: { parse: parseWave('sin'), syntax: WAVE_SYNTAX },
  saw: { parse: parseWave('saw'), syntax: WAVE_SYNTAX },
  tri: { parse: parseWave('tri'), syntax: WAVE_SYNTAX },
  square: { parse: parseWave('square'), syntax: WAVE_SYNTAX },
  scale: {
    // (read by the cell itself, which takes the key it brings: parseScale)
    parse: (s, start) => s.fail('scale(…) is read by its cell', start, 5),
    syntax: syntax(
      'generator',
      'scale(name) · scale(name, tonic) · scale("tonic:name")',
      `A scale by name over the 12, turned to its tonic (a note name, a number, a cell holding one, or free(…); C if left out): the scan of its steps over a key of its own. Its name may be a cell holding a diatonic mode (&mode dorian, its phase from the darkest: locrian 0 … lydian 6). Its shift= walks its modes; the tonic transposes. The names: ${Object.keys(SCALES).join(' ')}. Strudel's spelling reads the same: scale("D:minor"), its words after colons (scale("F#:harmonic:minor")), with every scale tonal knows (${Object.keys(TONAL_SCALES).length} names: whole:tone, diminished, bebop:major, chromatic …); the octave is the voice's, not the scale's.`,
      [
        '&scale scale(minor, D)',
        '&blues scale(blues)',
        '&scale scale(dorian, free(2, 0..11))',
        '&key scale(dorian, &tonic)',
        '&key scale(&mode, &tonic)',
        '&scale scale("F#:harmonic:minor")',
      ],
      'tables.md',
    ),
  },
  fifths: {
    // (read by the cell itself, which takes the turn it brings: parseFifths)
    parse: (s, start) => s.fail('fifths(…) is read by its cell', start, 6),
    syntax: syntax(
      'generator',
      'fifths() · fifths(n) · fifths(note)',
      'The circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C; turned n fifths round, or to start on a note (its shift=: [0] is where it starts, [$0] is C). Drawn round its wheel in its own order.',
      ['&circle fifths()', '&circleG fifths(1)', '&circleG fifths(G)'],
      'tables.md',
    ),
  },
  meter: {
    parse: parseMeter,
    syntax: syntax(
      'generator',
      'meter("sig") · meter("sig", step) · meter("2+2+3") · meter("2+2+3/4") · meter("levels")',
      `A bar as levels, one per step, its numbers its tiers from the ends: 0 the downbeat, 1 a beat, 2 a half's beat (and any tier between), 3 the eighth, 4 finer. A time signature by rule (contracts/meter v2, decision 072): x/8 and x/16 grouped as the canonical even set of ⌈x/3⌉ groups (7/8 is 3+2+2, 8/8 3+3+2), x/4 and x/2 in beats of the denominator, or in threes where x is a multiple of 3 from 6 (6/4). Its step is a number a pulse or a note value (meter("6/8", 16n)). Groups written as sizes, of eighths or of the denominator after a slash (2+2+3, 2+2+3/4), each 2, 3, 4 or 6. Or levels written out (* the bar, + - : ; beats, . the eighth, , finer), with their step's note value. Of four groups or more, each half's start is the stronger: 4/4 is *.-.+.-. (#17). Its bpm counts beats, its groups. Each argument can be free(…).`,
      ['&bar meter("4/4", 2) step=100bpm', '&bar meter("6/8") step=60bpm', '&bar meter("2+2+3") step=90bpm', '&bar meter("2/2", 2) step=60bpm', '&bar meter("*.+.+..") step=90bpm'],
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
const RETIRED_GENERATORS: Readonly<Record<string, Generator>> = {
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
