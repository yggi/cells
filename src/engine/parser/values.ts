/** The values with a syntax of their own: step= and loop= (rates, clocks, chains), map= (kinds, grids, tables). */
import type { MapSpec, RateOp, StepSpec } from '../ast';
import type { LineScanner } from './scanner';
import { parseFree } from './free';
import { syntax, type Syntax } from './syntax';
import { perSecond, UNIT } from './units';

/** step= and loop=: what moves a cell — the forms besides the units. */
export const STEP_SYNTAX: readonly Syntax[] = [
  syntax(
    'rate',
    'step=r · loop=r',
    'step= moves a cell a step at a time, r steps a second; loop= turns its whole braid r times a second (loop=r is step=r·k for k steps). One of the two.',
    ['&tune step=2 0 2 4', '&lead loop=261.63 0 1'],
    'time.md',
  ),
  syntax(
    'rate',
    'loop=NAME',
    'A value from the environment: SAMPLE_RATE, A4, or a note name (C4, F#3, Bb2) as its frequency.',
    ['&lead s=saw loop=C4', '&out loop=SAMPLE_RATE map=sample &mix'],
    'time.md',
  ),
  syntax('rate', 'step=&x · loop=&x', 'Driven by another cell: a step (or a whole turn) per step of &x.', ['&tune step=&bar 0 2 4'], 'time.md'),
  syntax('rate', 'step=cycle(&x)', 'A step per cycle of &x (each time its braid comes round).', ['&key step=cycle(&theme) stride=7'], 'time.md'),
  syntax(
    'rate',
    'step=&x*n · step=&x/n · step=&x*n/d',
    "A chain read left to right, as Strudel's fast and slow: *n n steps per step of &x, /n one per n steps; *3/2 is three per two (triplets).",
    ['&fast step=&bar*2 0 1', '&trip step=&bar*3/2 0 2 4'],
    'time.md',
  ),
  syntax(
    'rate',
    'step=free(r, lo..hi) · step=free(marking)',
    'A rate left free: a slider, with units (free(90bpm, 60..240)), or a tempo marking (free(adagio)).',
    ['&bar scan(4 4 4 4) step=free(90bpm, 60..240)', '&bar scan(4 4 4 4) step=free(adagio)'],
    'free.md',
  ),
];

export function parseStep(s: LineScanner, whole: boolean): StepSpec {
  const start = s.i;
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, whole ? 'loop' : 'step', true);
    const rate = perSecond(f.value, f.unit);
    if (!(rate > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond: rate, span: s.span(start), free: f };
  }
  const rate = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
  if (rate !== null) {
    const r = perSecond(parseFloat(rate), s.match(UNIT));
    if (!(r > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond: r, span: s.span(start) };
  }
  const env = s.match(/[A-Z](?:[A-Z0-9_]*|[#b]?-?[0-9]+)(?![A-Za-z0-9_#])/y);
  if (env !== null) return { whole, kind: 'env', name: env, span: s.span(start) };
  if (s.peek() === '{') s.fail('{&x} is now written cycle(&x)');
  const cycle = s.match(/cycle\(/y) !== null;
  const what = whole ? 'loop' : 'step';
  const driver = s.cellRef(cycle ? 'a cell inside cycle( ), like cycle(&theme)' : `a cell or a rate after ${what}=, like ${what}=&meter`, `in ${what}=`);
  if (driver.pick || driver.shift) s.fail(`${what}= takes a whole cell`, driver.span.col - 1, driver.span.len);
  if (cycle) s.expect(')', `')' to close cycle(&${driver.name})`);
  // a chain of *n and /n, read left to right: *2 twice per step, /2 once per two steps, *3/2 three per two
  let ratio = 1;
  const chain: RateOp[] = [];
  while (s.peek() === '*' || s.peek() === '/') {
    const op = s.text[s.i++];
    const at = s.i;
    const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
    if (n === null || !(parseFloat(n) > 0)) s.fail(`a positive number after ${op}`, at);
    ratio = op === '*' ? ratio * parseFloat(n) : ratio / parseFloat(n);
    chain.push({ op: op === '*' ? '×' : '÷', n: parseFloat(n!) });
  }
  return { whole, kind: 'driven', driver, cycle, ratio, chain, span: s.span(start) };
}

type MapWord = Exclude<MapSpec['kind'], 'table' | 'edo' | 'midi'> | 'edo' | 'midi';
/** map=: how a cell's values sound (or what kind of cell it is). The parser reads the words from this table. */
export const MAP_KINDS: Readonly<Record<MapWord, Syntax>> = {
  amp: syntax(
    'map',
    'map=amp',
    'A volume: its values multiply the level (on a voice, the braid as a waveform, its range onto −1…1; the default).',
    ['&accent map=amp step=&bar*4 1 .4 .8 .4'],
    'sound.md',
  ),
  lin: syntax(
    'map',
    'map=lin',
    'As amp, ramping from each value to the next: a glide, a triangle. In a mix it is plain: a volume in a product, a pitch in a sum.',
    ['&swell map=lin loop=&bar/8 .2 1'],
    'sound.md',
  ),
  db: syntax('map', 'map=db', 'A volume in decibels (0 as it is, −6 about half).', ['&fade map=db step=&bar 0 -6 -12'], 'sound.md'),
  adsr: syntax('map', 'map=adsr a d s r', 'An envelope: attack, decay, release in seconds, sustain a level; one per note.', ['&pluck map=adsr .01 .3 .5 .4'], 'sound.md'),
  sample: syntax('map', 'map=sample', 'The sound card: its entries are channels, one (mono) or two (left, right).', ['&out loop=SAMPLE_RATE map=sample &left &right'], 'mix.md'),
  midi: syntax(
    'map',
    'map=midi',
    'A MIDI card: its entries are MIDI channels, in order (~ skips one); a voice only here is sent, not heard.',
    ['&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove'],
    'midi.md',
  ),
  edo: syntax('map', 'map=edo', 'A grid: cycle= equal steps to the octave.', ['&edo19 cycle=19 map=edo'], 'tuning.md'),
  ratios: syntax('map', 'map=ratios', "A grid of ratios: one period's tones, then the period (the last).", ['&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2'], 'tuning.md'),
};
/** The forms of map= besides the words. */
export const MAP_SYNTAX: readonly Syntax[] = [
  syntax(
    'map',
    'map=ed(r)',
    'A grid: cycle= equal steps to the ratio r (a number or a fraction): ed(2) the octave, ed(3/2) the fifth.',
    ['&bp cycle=13 map=ed(3)', '&fifths cycle=7 map=ed(3/2)'],
    'tuning.md',
  ),
  syntax(
    'map',
    'map=midi(c) · map=midi(c, p)',
    'A MIDI card on one channel c (1–16), and on output slot p (1–16; the nth output of the MIDI page, 1 the first).',
    ['&drums map=midi(10) &groove', '&keys map=midi(1, 2) [&theme * &reed]'],
    'midi.md',
  ),
  syntax('map', 'map=&table', 'Each value looked up in a table cell first, then sounded as amp.', ['&shaped loop=220 map=&curve 0 1 2 3'], 'sound.md'),
];
const MAP_WORD = new RegExp(
  Object.keys(MAP_KINDS)
    .sort((a, b) => b.length - a.length)
    .join('|'),
  'y',
);

export function parseMap(s: LineScanner): MapSpec {
  const start = s.i;
  if (s.peek() === '&') {
    const table = s.cellRef('a table cell, like map=&curve', 'after map=');
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
  const w = s.match(MAP_WORD);
  if (w === null) s.fail(`map= takes ${Object.keys(MAP_KINDS).join(', ')}, ed(r), midi(c, p) or a table cell (&curve)`);
  if (w === 'edo') return { kind: 'edo', period: 2, span: s.span(start) };
  if (w === 'midi') return parseMidi(s, start);
  return { kind: w as 'amp' | 'lin' | 'sample' | 'adsr' | 'ratios' | 'db', span: s.span(start) };
}

/** midi, midi(c) or midi(c, p): a MIDI card, its channel (1–16) when all its entries share one, its output slot (1–16, 1 by default). */
function parseMidi(s: LineScanner, start: number): MapSpec {
  if (s.peek() !== '(') return { kind: 'midi', channel: null, port: 1, span: s.span(start) };
  s.i++;
  const whole = (what: string, example: string) => {
    const at = s.i;
    const n = s.match(/[0-9]+(?:\.[0-9]+)?/y);
    const v = n === null ? NaN : parseFloat(n);
    if (!(Number.isInteger(v) && v >= 1 && v <= 16)) s.fail(`${what} is a whole number from 1 to 16: ${example}`, at, Math.max(1, n?.length ?? 1));
    return v;
  };
  const channel = whole('A MIDI channel', 'map=midi(10)');
  let port = 1;
  if (s.match(/\s*,\s*/y) !== null) port = whole('A MIDI output slot', 'map=midi(10, 2)');
  s.expect(')', `')' to close midi(…)`);
  return { kind: 'midi', channel, port, span: s.span(start) };
}
