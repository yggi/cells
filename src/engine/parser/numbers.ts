/**
 * Every place a number is written, and what may stand there besides one (decision 078): `free(v, lo..hi)` wherever a
 * number is (the text's: its slider rewrites the number, and the piece compiles again), a cell only where the number is
 * read while the piece plays (the playing's). The scanner's one number reader (`LineScanner.free`) takes a place from
 * this table; `docs/language/free.md`'s table is generated from it (`npm run reference`), so the two can't drift.
 */
import type { FreeSpec } from '../ast';

/** One place a number is written. */
export interface NumberPlace {
  /** Its form, as written: `cycle=n`. */
  readonly form: string;
  /** The slider's name (a setting's own, given where it is read, overrides it). */
  readonly name: string;
  /** What its free(…) sets: the key a frontend draws it by ('param' with `name`, unless the place has a key of its own). */
  readonly key?: FreeSpec['key'];
  /** A rate: the value may carry its unit (bpm, hz, k). */
  readonly units?: boolean;
  /** A count, an index, a turn: whole numbers, the slider moving by ones. */
  readonly whole?: boolean;
  /** Read before decision 078, its free(…)'s range not checked whole (texts that compiled compile the same); its value is rounded, as every whole place's. */
  readonly rounds?: boolean;
  /** The least and the most a free(…)'s range may reach here. */
  readonly min?: number;
  readonly max?: number;
  /** A free(…) here would move nothing: why a plain number stays (none of the places but these). */
  readonly fixed?: string;
  /** What a cell does here: it moves the number (read while the piece plays), or why it doesn't. */
  readonly cell: string;
  /** Moved by a cell: a text where only a number may stand refuses one with the rule; this place reads its cells itself. */
  readonly moves?: true;
  /** A text with a free(…) here (or, for a fixed place, its number), parsed by the tests and shown in the table. */
  readonly example: string;
}

/** A cell where the number is read as the piece is built (decision 078): the shape would change while it plays, a selector's work (#51). */
export const BUILT = 'no: read as the piece is built';
const NOT_YET = (what: string) => `not yet: ${what}`;
const MOVES = '`&k`, `lo..hi * &k`';

const place = (p: NumberPlace) => p;

/** The places, in the order free.md shows them. */
export const NUMBER_PLACES = {
  // read while the piece plays: a cell may move them
  param: place({
    form: 'lpf=n, and every sound parameter',
    name: 'param',
    cell: `${MOVES}, on a parameter that moves (pan= and postgain= don't: the renderer's)`,
    moves: true,
    example: '&lead s=saw loop=C4 lpf=free(1200, 200..5000)',
  }),
  level: place({ form: 'level=&a * n (a gate)', name: 'level', cell: '`&a * &b * n`', moves: true, example: '&out play=&tune level=&accent*free(.4, 0..1) &tune' }),
  slot: place({
    form: 'attack=n (an envelope by name)',
    name: 'slot',
    cell: `${MOVES}: \`&k\` its values as the slot's (seconds; sustain a level), held at 0 until a note reads it`,
    moves: true,
    example: '&env map=adsr attack=free(.01, 0..1) decay=.3 sustain=.5 release=.4',
  }),
  axis: place({
    form: 'sync=n (a style by name)',
    name: 'axis',
    cell: `${MOVES}, within the axis (#576)`,
    moves: true,
    example: '&mine map=style sync=free(.3, 0..1) harm=.45 bite=.55 mood=.5',
  }),
  end: place({
    form: 'lo..hi * &k (a moving range’s ends) · c ± r',
    name: 'end',
    cell: NOT_YET('a range’s end is a number or a slider; its cells move what lies between (decision 079)'),
    example: '&lead s=saw loop=C4 lpf=free(400, 200..800)..free(2400, 1200..4800) * &lfo',
  }),
  share: place({
    form: 'swing=8n:n (a swing’s share)',
    name: 'share',
    cell: `${MOVES}, one level alone, read at each bar line and held through the bar (decision 081)`,
    moves: true,
    example: '&bar meter("4/4") step=90bpm swing=8n:free(.6, .5...75)',
  }),
  legatoShare: place({
    form: 'legato=8n:n (a legato’s share by level)',
    name: 'share',
    cell: NOT_YET('a meter’s legato by level is its lines’ default; a line moves its own, legato=&artic'),
    example: '&bar meter("4/4") step=90bpm legato=8n:free(.5, .25..1)',
  }),
  gain: place({
    form: '[&x * n] (a gain in a mix)',
    name: 'gain',
    key: 'gain',
    cell: '`&k`; a range moved by cells is a cell of its own, `&g [&k * .6 + .2]`, then `[&x * &g]` (decision 079)',
    moves: true,
    example: '&out [&strings * free(.4, 0..1)]',
  }),
  hit: place({
    form: '&x:0:n (a hit’s gain)',
    name: 'hit',
    min: 0,
    cell: 'no: a hit’s gain is a number; a moving one is `velocity=&accent`, or a gate’s `level=`',
    example: '&beat step=8 &bd &hh:0:free(.4, 0..1)',
  }),
  weight: place({
    form: 'style=[&a * n, …] (a weight)',
    name: 'weight',
    min: 0,
    cell: 'no: a weight is a number; a crossfade is `style=&a..&b * &curve`',
    example: '&s style=[&funk * free(.8, 0..1), &bossa * .2]',
  }),
  tonic: place({
    form: 'scale(name, n) (a tonic)',
    name: 'tonic',
    key: 'tonic',
    whole: true,
    rounds: true,
    cell: '`&k` (a note); a tonic is a pitch class, never a range',
    moves: true,
    example: '&key scale(dorian, free(2, 0..11))',
  }),
  // read as the piece is built: free(…) recompiles as its slider moves; a cell would change the program's shape
  rate: place({
    form: 'step=n · loop=n (a rate)',
    name: 'step',
    key: 'step',
    units: true,
    cell: 'a clock (`step=&bar`): another meaning',
    moves: true,
    example: '&bar scan(4 4 4 4) step=free(90bpm, 60..240)',
  }),
  by: place({ form: 'step=&bar*n · step=&bar/n', name: 'by', min: 0, cell: BUILT, example: '&fast step=&bar*free(2, 1..4) 0 2' }),
  shift: place({ form: 'shift=n', name: 'shift', key: 'shift', whole: true, rounds: true, cell: BUILT, example: '&key step=cycle(&theme) shift=free(0, 0..11)' }),
  stride: place({ form: 'stride=n', name: 'stride', key: 'stride', whole: true, rounds: true, cell: BUILT, example: '&key step=cycle(&theme) stride=free(0, 0..7)' }),
  cycle: place({ form: 'cycle=n', name: 'cycle', whole: true, min: 0, cell: BUILT, example: '&wheel cycle=free(1, 0..4) 0 4 7' }),
  laps: place({ form: 'laps=n', name: 'laps', whole: true, min: 1, cell: BUILT, example: '&bar scan(4 4 4 4) step=84bpm laps=free(30, 1..60)' }),
  chance: place({ form: 'chance=p', name: 'chance', key: 'chance', cell: BUILT, example: '&ghost chance=free(.7, 0..1) step=4 0? 0?' }),
  seed: place({ form: 'seed=n', name: 'seed', whole: true, cell: BUILT, example: '&ghost seed=free(7, 0..99) step=4 0? 0? 0? 0?' }),
  size: place({ form: 'size=x', name: 'size', min: 0.25, max: 4, cell: BUILT, example: '&theme size=free(2, .25..4) step=2 0 2 4' }),
  interval: place({ form: 'scan(n …) (an interval)', name: 'interval', key: 'interval', cell: BUILT, example: '&swing scan(free(2, 1..3) 1) step=120bpm' }),
  intervals: place({ form: 'scan(n!k …) (an interval’s repeat)', name: 'repeat', whole: true, min: 1, cell: BUILT, example: '&map scan(1!free(4, 1..8) 2)' }),
  geo: place({ form: 'geo(r, n, k …)', name: 'geo', cell: BUILT, example: '&series scan(geo(free(5, 2..8), 25, 0 10 5))' }),
  args: place({
    form: 'euclid(k, n, r) · even(k, n, r) · sin(n) …',
    name: 'arg',
    whole: true,
    cell: BUILT,
    example: '&hits euclid(free(3, 0..8), 8) step=8',
  }),
  fifths: place({ form: 'fifths(n)', name: 'fifths', whole: true, cell: BUILT, example: '&circle fifths(free(1, 0..11))' }),
  phase: place({ form: 'scale(t, phase) (retired)', name: 'phase', whole: true, min: 0, max: 6, cell: BUILT, example: '&key scale(2, free(3, 0..6))' }),
  meter: place({ form: 'meter(n, n)', name: 'meter', key: 'choice', cell: BUILT, example: '&bar meter(free(2, 0..3, "2/4 3/4 4/4 6/8")) step=90bpm' }),
  grid: place({ form: 'map=edo(n) · map=ed(n, r) · map=midi(c, p)', name: 'grid', whole: true, min: 1, cell: BUILT, example: '&edo map=edo(free(19, 5..31))' }),
  ratio: place({ form: 'map=ed(r)', name: 'ratio', cell: BUILT, example: '&bp cycle=13 map=ed(free(3, 1.5..4))' }),
  step: place({
    form: '0 2 4 (a step of a braid)',
    name: 'value',
    cell: 'a cell plays there (`&k`, spliced)',
    moves: true,
    example: '&tune step=2 0 free(2, 0..7) 4',
  }),
  modifier: place({ form: 'x!n · x@n · x*n · x/n', name: 'count', whole: true, min: 1, max: 4096, cell: BUILT, example: '&beat step=4 0!free(4, 1..8) 2' }),
  drop: place({ form: 'x?p', name: 'drop', min: 0, max: 1, cell: BUILT, example: '&hats step=4 0 0?free(.3, 0..1)' }),
  euclidOn: place({ form: 'x(k, n, r)', name: 'euclid', whole: true, cell: BUILT, example: '&groove step=1 0(free(3, 0..8),8)' }),
  pick: place({
    form: '&x[i] · &x[a:b:s] · &x[$i]',
    name: 'pick',
    whole: true,
    cell: `${BUILT}: picking while it plays is a selector's (#51)`,
    example: '&tune step=2 &motif[free(0, 0..3)]',
  }),
  turn: place({ form: '&x[<<n] · &x[>>n]', name: 'turn', whole: true, min: 0, cell: BUILT, example: '&canon step=2 &theme[>>free(4, 0..7)]' }),
  move: place({ form: '&x^n · &x^$n', name: 'move', whole: true, cell: BUILT, example: '&tune step=2 &motif &motif^free(1, -7..7)' }),
  // a number left as it is
  tier: place({
    form: 'tier=n',
    name: 'tier',
    fixed: "the tutorial's order, not the piece's",
    cell: BUILT,
    example: '&piece title="Steps" tags="tutorial" tier=1',
  }),
  hitNumber: place({ form: '&x:n (a hit’s number)', name: 'hit', fixed: 'a pitched hit is not yet: it is 0', cell: BUILT, example: '&beat step=8 &bd:0' }),
} as const satisfies Readonly<Record<string, NumberPlace>>;
