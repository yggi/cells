/** A cell's line: its name, then attributes and its braid, in any order. */
import type { Braid, CellDecl, MapSpec, ParamCells, Ref, Span, StepSpec, Token } from '../ast';
import { TIME_PARAMS } from '../attributes';
import { RETIRED_PARAMS } from '../dough-params';
import { LABEL_FIELDS } from '../program';
import { CELL_PARAMS, CORE, PARAMS, nearestAttribute } from '../attributes';
import { IDENT, LineScanner } from './scanner';
import { OPERATIONS, parseToken } from './braid';
import { FREE_BRAID_WHOLE, parseFree } from './free';
import { isGenerator, parseFifths, parseGenerator, parseScale } from './generators';
import { parseMap, parseStep } from './values';
import { syntax, type Syntax } from './syntax';

/** What a cell's attributes have set so far, as its line is read. */
interface Body {
  over: Ref | null;
  base: Ref | null;
  shift: number | null;
  cycle: number | null;
  step: StepSpec | null;
  map: MapSpec | null;
  stride: number | null;
  env: Ref | null;
  pitch: Ref | null;
  show: string | null;
  label: string | null;
  laps: number | null;
  title: string | null;
  tags: string | null;
  tier: number | null;
  about: Ref[] | null;
  chance: number | null;
  seed: number | null;
  size: number | null;
  readonly params: Record<string, number | string>;
  readonly paramSpans: Record<string, Span>;
  readonly paramCells: Record<string, ParamCells>;
  readonly paramClocks: Record<string, StepSpec>;
}

/** Reads one attribute's value (the scanner is just past `key=`) into the body. */
type Reader = (s: LineScanner, b: Body, word: string, at: number) => void;

/** An attribute's reader, with how it's written and examples (its meaning is in attributes.ts). */
interface Key {
  readonly read: Reader;
  readonly form: string;
  readonly examples: readonly string[];
}

/** How a cell is shown (never how it sounds); the default for everything below it. Meanings: layout/show.ts. */
export const SHOWS = [
  'braid',
  'pattern',
  'equal',
  'notes',
  'midi',
  'do',
  'degrees',
  'table',
  'scale',
  'mode',
  'key',
  'grid',
  'meter',
  'spectrum',
  'wave',
  'levels',
  'adsr',
  'mix',
  'note',
  'petal',
  'off',
  'matrix',
  'lfo',
  'brightness',
] as const;
/** Naming conventions, after a colon: show=notes:flats. */
export const SHOW_CONVENTIONS: Readonly<Record<string, readonly string[]>> = { notes: ['flats', 'sharps', 'german'], do: ['fixed', 'movable'] };

const whole =
  (key: 'shift' | 'stride'): Reader =>
  (s, b) => {
    b[key] = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, key, false).value) : s.int(`a whole number after ${key}=`);
  };
const text =
  (key: 'title' | 'tags' | 'label', example: string): Reader =>
  (s, b) => {
    const at = s.i;
    const q = s.match(/"([^"]*)"/y);
    if (q === null) s.fail(`${key}= takes a text in quotes: ${example}`);
    b[key] = q!.slice(1, -1);
    // a label's fields: {tempo}, {&key:tonic} — any other would show as written
    if (key === 'label')
      for (const m of q!.matchAll(/\{(?:&[A-Za-z_][A-Za-z0-9_]*:)?([A-Za-z_][A-Za-z0-9_]*)\}/g))
        if (!(LABEL_FIELDS as readonly string[]).includes(m[1]))
          s.warn(`{${m[1]}} isn't a label field: it shows as written (the fields: ${LABEL_FIELDS.map((f) => `{${f}}`).join(' ')})`, at + m.index, m[0].length);
  };
const voiceOwn =
  (key: 'env' | 'pitch'): Reader =>
  (s, b) => {
    b[key] = s.ref(`a cell after ${key}=, like ${key}=&pluck or ${key}=&(map=adsr .01 .3 .5 .4)`);
  };
const timing: Reader = (s, b, word) => {
  b.step = parseStep(s, word === 'loop');
};

/** An unnamed table a shorthand declares (over=scale(…)): nothing set but what it's given. */
const BLANK_TABLE = { over: null, shift: null, off: false, step: null, map: null, stride: null, cycle: null, params: {}, paramSpans: {} } as const;

/** The core attributes, each with a syntax of its own: the parser reads a cell's line through this table. */
export const KEYS: Readonly<Record<keyof typeof CORE, Key>> = {
  over: {
    form: 'over=&table · over=&table[<<n] · over=scale(name, tonic)',
    examples: ['&tune over=&major step=2 0 2 4', '&mode over=&major[<<2] 0 2 4', '&tune over=scale(minor, A) step=2 0 2 4'],
    read: (s, b) => {
      if (s.text.startsWith('scale(', s.i)) {
        // over=scale(name, tonic): a table of its own, unnamed and not drawn — the scale's scan over its key
        const at0 = s.i;
        s.i += 5;
        const sc = parseScale(s, at0);
        const name = `scale:λ${s.line}_${at0 + s.offset}`;
        s.lambdas.push({ ...BLANK_TABLE, name, span: sc.span, lambda: s.text.slice(at0, s.i), over: sc.key, braid: { kind: 'scan', steps: sc.steps, span: sc.span } });
        b.over = { name, pick: null, shift: 0, span: sc.span };
      } else b.over = s.ref('a cell or scale(name, tonic) after over=, like over=&scale or over=scale(minor, A)');
      if (b.over!.pick) s.fail('over= takes a whole table (shifting it is fine: over=&scale[<<])', b.over!.span.col - 1, b.over!.span.len);
    },
  },
  base: {
    form: 'base=&cell · base=&cell^$n · base=&cell^n',
    examples: ['&answer base=&subject^$7 _!3 12@2', '&last base=&subject _!21 3@2'],
    read: (s, b) => {
      b.base = s.ref('a cell after base=, like base=&subject or base=&subject^$7');
      if (b.base.pick) s.fail('base= takes a whole cell (transposing it is fine: base=&subject^$7)', b.base.span.col - 1, b.base.span.len);
    },
  },
  step: { form: 'step=…', examples: ['&tune step=&bar 0 2 4'], read: timing },
  loop: { form: 'loop=…', examples: ['&lead s=saw loop=C4'], read: timing },
  shift: { form: 'shift=n · shift=free(n, lo..hi)', examples: ['&mode over=&major shift=5 0 2 4', '&key shift=free(0, 0..11)'], read: whole('shift') },
  stride: { form: 'stride=n · stride=free(n, lo..hi)', examples: ['&key step=cycle(&theme) stride=7'], read: whole('stride') },
  map: { form: 'map=…', examples: ['&accent map=amp step=&bar 1 .5'], read: (s, b) => (b.map = parseMap(s)) },
  show: {
    form: `show=kind · show=notes:convention · show=do:convention · show=mix:&grid`,
    examples: ['&tune show=notes step=2 0 2 4', '&tune show=notes:german step=2 0 2 4', '&tune show=do:movable step=2 0 2 4', '&band show=mix:&edo19 [&a, &b]'],
    read: (s, b) => {
      const at2 = s.i;
      const w = s.match(/[a-z]+/y);
      // (a word: whether it is one of SHOWS or a plugin the piece carries is compile's to say: it knows the plugins)
      if (w === null) s.fail(`show= takes one of: ${SHOWS.join(' ')}, or a plugin of the piece`, at2, 1);
      // a naming convention: notes:flats, notes:sharps, notes:german, do:fixed
      let conv = '';
      // a mix's colours: the grid it follows (show=mix:&edo19), whatever grids its voices are on
      if (w === 'mix' && s.peek() === ':' && !s.text.startsWith(':&', s.i))
        s.fail('show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19 (no space after the colon)', at2, s.i + 1 - at2);
      if (w === 'mix' && s.text.startsWith(':&', s.i)) {
        s.i += 2;
        const g = s.match(IDENT);
        if (g === null) s.fail('show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19', at2, s.i - at2);
        b.show = `mix:&${g}`;
        b.paramSpans.show = s.span(at2);
        return;
      }
      if (s.peek() === ':') {
        s.i++;
        const cw = s.match(/[a-z]+/y) ?? '';
        const ok = SHOW_CONVENTIONS[w!]?.includes(cw);
        if (!ok) s.fail(`show=${w}: takes ${w === 'notes' ? 'flats, sharps or german' : w === 'do' ? 'fixed or movable' : 'no convention'}`, at2, s.i - at2);
        conv = `:${cw}`;
      }
      b.show = w + conv;
      b.paramSpans.show = s.span(at2);
    },
  },
  label: {
    form: 'label="text"',
    examples: ['&theme label="the King\'s theme" step=2 0 2 4', '&note label="A note in the graph: alone on its cell."'],
    read: text('label', 'label="the King\'s theme"'),
  },
  env: { form: 'env=&envelope', examples: ['&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)'], read: voiceOwn('env') },
  pitch: {
    form: 'pitch=&vibrato · pitch=lo..hi * &shape',
    examples: ['&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)', '&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0)'],
    // a pitch stream added to every note — or, a range first, a shape in semitones (a drop), read as a moving parameter
    read: (s, b, word, at) => (/^[0-9.]+\.\./.test(s.text.slice(s.i)) ? readParam(s, b, word) : voiceOwn('pitch')(s, b, word, at)),
  },
  cycle: {
    form: 'cycle=n',
    examples: ['&key step=cycle(&theme) stride=7 cycle=12', '&edo19 cycle=19 map=edo'],
    read: (s, b) => {
      const vs = s.i;
      b.cycle = s.int('a whole number after cycle=');
      if (b.cycle < 1) s.fail('cycle must be at least 1', vs, s.i - vs);
    },
  },
  size: {
    form: 'size=x',
    examples: ['&theme size=2 step=2 0 2 4'],
    read: (s, b) => {
      // how large it's drawn, against the others: size=2 twice, size=.5 half
      const at2 = s.i;
      const n = s.match(/[0-9]*\.?[0-9]+/y);
      if (n === null || !(+n >= 0.25 && +n <= 4)) s.fail('size= is how large it is drawn, from .25 to 4: size=2', at2, Math.max(1, (n ?? '').length));
      b.size = +n!;
    },
  },
  laps: {
    form: 'laps=n',
    examples: ['&bar scan(4 4 4 4) step=84bpm laps=30'],
    read: (s, b, word, at) => {
      // laps=n: n laps, then silence — a piece that ends
      const n = s.match(/[0-9]+/y);
      if (n === null || !(parseInt(n, 10) >= 1)) s.fail('laps= takes a count of laps, 1 or more: laps=1', at, word.length + 1);
      b.laps = parseInt(n!, 10);
    },
  },
  chance: {
    form: 'chance=p · chance=free(p, 0..1)',
    examples: ['&ghost chance=.2 step=4 0? 0? 0? 0?', '&ghost chance=free(.3, 0..1) step=4 0? 0?'],
    read: (s, b) => {
      // what a bare x? means in this cell: a probability, or a slider for one
      if (s.text.startsWith('free(', s.i)) b.chance = parseFree(s, 'chance', false).value;
      else {
        const at2 = s.i;
        const n = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
        if (n === null) s.fail('chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)', at2, 1);
        b.chance = parseFloat(n!);
      }
    },
  },
  seed: { form: 'seed=n', examples: ['&ghost seed=7 step=4 0? 0? 0? 0?'], read: (s, b) => (b.seed = s.int('a whole number after seed=')) },
  title: { form: 'title="text"', examples: ['&piece title="Swing blues" tags="genre:jazz, rhythm" label="A blues in F."'], read: text('title', 'title="Swing blues"') },
  tags: {
    form: 'tags="tag, tag"',
    examples: ['&piece title="Swing blues" tags="genre:jazz, rhythm"', '&lead tags="melody" s=saw loop=C4'],
    read: text('tags', 'tags="jazz, blues"'),
  },
  tier: {
    form: 'tier=n',
    examples: ['&piece title="Steps: a tune on one line" tags="tutorial" tier=1 label="Numbers, rests, holds and repeats."'],
    read: (s, b, word, at) => {
      // its tier of the tutorial: 1, 2, 3 …
      const n = s.match(/[0-9]+(?![0-9.])/y);
      if (n === null || !(parseInt(n, 10) >= 1 && parseInt(n, 10) <= 9999)) s.fail('tier= is a tier of the tutorial, 1 to 9999: tier=1', at, word.length + 1);
      b.tier = parseInt(n!, 10);
    },
  },
  about: {
    form: 'about=&cell · about=(&a &b …)',
    examples: ['&fenvNote label="The filter opens on every note." about=&fenv', '&why label="Two cells at once." about=(&fenv &accent)'],
    read: (s, b, word, at) => {
      // a note's links: the cells it explains. One cell, or several in parentheses: about=(&fenv &accent)
      const what = 'a cell after about=, like about=&fenv or about=(&fenv &accent)';
      const about: Ref[] = [];
      b.about = about;
      if (s.peek() === '(') {
        s.i++;
        s.skipSpace();
        while (s.peek() !== ')') {
          if (s.done()) s.fail(`')' to close about=(…)`);
          about.push(s.ref(what));
          s.skipSpace();
        }
        s.i++;
        if (about.length === 0) s.fail(what, at, word.length + 1);
      } else about.push(s.ref(what));
    },
  },
};

/** What each parameter that names a cell asks for. */
const CELL_WANTS: Readonly<Record<string, string>> = {
  fm: 'a voice after fm=, like fm=&op',
  write: 'what the tape records, like write=&melody',
  play: 'the tape it reads, like play=&tape, or the notes a gate plays, like play=&tune',
  couple: 'the resonator it shares a table with, like couple=&fork',
  excite: 'what drives it, like excite=&mix',
  trigger: 'the melody whose notes it plays with, like trigger=&tune',
  velocity: 'a level cell, like velocity=&accent',
  gate: 'a level cell, like gate=&duck',
};

/** A parameter naming a cell: fm= its modulator; write= a tape's source; play= a read head's tape … */
const readCellParam: Reader = (s, b, word) => {
  const r = s.ref(CELL_WANTS[word]);
  b.params[word] = r.name;
  b.paramSpans[word] = r.span;
};

/** A parameter's value: a number or a word, free(…), a clock (a time), or cells it moves with. */
function readParam(s: LineScanner, b: Body, key: string): void {
  const vs = s.i;
  // a gate's level: a product of level cells and numbers, level=&accent*&duck*.4 (a number alone, level=.4, is read below)
  if (key === 'level' && (s.peek() === '&' || /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*\*/.test(s.text.slice(s.i)))) {
    const factors: Ref[] = [];
    let gain = 1;
    for (let first = true; ; first = false) {
      const save = s.i;
      if (!first) {
        s.skipSpace();
        if (s.peek() !== '*') {
          s.i = save;
          break;
        }
        s.i++;
        s.skipSpace();
      }
      const n = s.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
      if (n !== null) gain *= parseFloat(n);
      else factors.push(s.ref('a level cell or a number, like level=&accent*&duck*.4'));
    }
    b.paramCells[key] = { range: null, factors, span: s.span(vs) };
    if (gain !== 1) b.params[key] = gain;
    b.paramSpans[key] = s.span(vs);
    return;
  }
  // a time as a clock: delaytime=&bar/2
  if (s.peek() === '&' && TIME_PARAMS.has(key)) {
    const st = parseStep(s, false);
    if (st.kind !== 'driven') s.fail(`${key}= takes seconds, or a clock: ${key}=&bar/2`, vs, s.i - vs);
    b.paramClocks[key] = st;
    b.paramSpans[key] = s.span(vs);
    return;
  }
  // left free: lpf=free(1200, 200..5000), swing=free(.5, .5...75) — a slider, its name the setting's
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, 'param', false);
    (f as { param?: string }).param = key;
    b.params[key] = f.value;
    b.paramSpans[key] = s.span(vs);
    return;
  }
  // moving: lpf=&sweep, lpf=200..3000 * &fenv * &accent
  const range = s.text.slice(s.i).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
  if (s.peek() === '&' || range) {
    if (range) s.i += range[0].length;
    const factors: Ref[] = [];
    if (!range) factors.push(s.ref(`a cell after ${key}=`));
    for (;;) {
      const save = s.i;
      s.skipSpace();
      if (s.peek() !== '*') {
        s.i = save;
        break;
      }
      s.i++;
      s.skipSpace();
      factors.push(s.ref(`a cell after *, like ${key}=200..3000 * &fenv`));
    }
    if (range && factors.length === 0) s.fail(`${key}=${range[0]}: a range is scaled by cells — ${key}=${range[0]} * &fenv`, vs, s.i - vs);
    if (!range && factors.length > 1) s.fail(`${key}=: several cells multiply a range — ${key}=200..3000 * &a * &b`, vs, s.i - vs);
    b.paramCells[key] = { range: range ? [parseFloat(range[1]), parseFloat(range[2])] : null, factors, span: s.span(vs) };
    b.paramSpans[key] = s.span(vs);
    return;
  }
  const v = s.match(/-?[A-Za-z0-9_.]+/y);
  if (v === null) s.fail(`Expected a value after ${key}=`);
  b.params[key] = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(v) ? parseFloat(v) : v;
  b.paramSpans[key] = s.span(vs);
}

/** Keys that are gone, and what says the same now (the retired parameters are in dough-params.ts). */
const RETIRED_KEYS: Readonly<Record<string, string>> = {
  init: 'init= is now shift=',
  out: 'out= is now a command: out(voice, &cell) / step(&meter, bpm=…)',
  time: 'time= is now a command: out(voice, &cell) / step(&meter, bpm=…)',
  ...RETIRED_PARAMS,
};

/** The lines' own syntax: what a line is, comments, continuing, off. */
export const LINE_SYNTAX: readonly Syntax[] = [
  syntax(
    'line',
    '&name …',
    'A cell: one per line, its name first, then its attributes (key=value) and its braid, in any order.',
    ['&theme over=&major step=&bar 0 2 4 5'],
    'cell.md',
  ),
  syntax(
    'line',
    '&name label="…"',
    'A note: a cell with only a label= (and title=, tags=, about=) explains, in the graph; it does nothing.',
    ['&why label="The bass walks down a fifth each bar."'],
    'display.md',
  ),
  syntax(
    'line',
    'off',
    'Switched off: it, and everything that reads through it or plays it, is silent (and hidden from the graph).',
    ['&drums off over=&kit step=&bar 0 1'],
    'cell.md',
  ),
  syntax(
    'line',
    '# … · // …',
    'A comment, to the end of the line: # at the start of a line or after a space (a # glued to a number is a sharp), // anywhere.',
    ['&tune step=2 0 2 4  # the opening'],
    'cell.md',
  ),
  syntax('line', '… + · … * · … , · … [', 'A line ending in +, *, a comma or [ continues on the next one (a long mix).', [], 'cell.md'),
  syntax(
    'line',
    '&parts step=&bar &a &b',
    "Taps of a meter's bus (decision 016): a stepped table of names declares them, each stepped as the table is. What a tap steps plays while a selector reading the table picks it (`over=&parts`), from its top each time: an arrangement.",
    ['&parts step=&bar &verseBar &chorusBar'],
    'time.md',
  ),
];

/**
 * free(0 2 4 ~ …) at the scanner (it's at 'free'): a braid left to the performer, the cell's whole braid. Its steps are
 * numbers (accidentals and names too), rests and chords, with their modifiers; its length in steps is the frame a
 * recording fills (`hi`). Its free() is pushed with the scanner's others, so it is held, kept and reverted as they are.
 */
function parseFreeBraid(s: LineScanner): Braid {
  const start = s.i;
  s.i += 'free('.length;
  if (s.peek() === '"') s.fail('free("…") is a text, for spell(…): a braid left free is steps, free(0 2 4 ~)', start, 6);
  // (a braid of steps has no parentheses: the first ')' closes it)
  const close = s.text.indexOf(')', s.i);
  if (close < 0) s.fail(`')' to close free(…)`, start, s.i - start);
  const inner = s.within(s.text.slice(s.i, close), s.i);
  const tokens: Token[] = [];
  for (;;) {
    inner.skipSpace();
    if (inner.done()) break;
    const at = inner.i;
    const t = parseToken(inner);
    if (t.atom.kind !== 'note' && t.atom.kind !== 'rest' && t.atom.kind !== 'chord')
      inner.fail('A braid left free holds steps: numbers, rests (~) and chords ([0,4]), held (@n) or repeated (!n)', at, inner.i - at);
    tokens.push(t);
  }
  if (!tokens.length) s.fail('free(…) around a braid needs steps: free(0 2 4 ~)', start, close - start + 1);
  s.i = close + 1;
  const length = tokens.reduce((n, t) => n + t.repeat * t.elongate, 0);
  s.frees.push({ key: 'braid', value: 0, unit: '', lo: 0, hi: length, span: s.place(start), braid: inner.text.trim().replace(/\s+/g, ' ') });
  return { kind: 'list', tokens };
}

/** A cell's body: attributes and braid, up to the end of the scanner's text. */
export function parseBody(s: LineScanner, head: Ref): CellDecl {
  const b: Body = {
    over: null,
    base: null,
    shift: null,
    cycle: null,
    step: null,
    map: null,
    stride: null,
    env: null,
    pitch: null,
    show: null,
    label: null,
    laps: null,
    title: null,
    tags: null,
    tier: null,
    about: null,
    chance: null,
    seed: null,
    size: null,
    params: {},
    paramSpans: {},
    paramCells: {},
    paramClocks: {},
  };
  const seen = new Set<string>();
  let off = false;
  const tokens: Token[] = [];
  let generator: Braid | null = null;
  let scaleKey: Ref | null = null;
  let fifthsShift: number | null = null;
  // the braid is free(…): nothing else may be braid
  let freeBraid = false;

  while (!s.done()) {
    const at = s.i;
    const word = s.match(IDENT);
    if (word !== null && s.peek() === '=') {
      s.i++;
      const key = word in KEYS || word in PARAMS ? word : null;
      if (key === null) {
        if (word in RETIRED_KEYS) s.fail(RETIRED_KEYS[word], at, word.length);
        const near = nearestAttribute(word);
        s.fail(
          `Unknown attribute ${word}=${near ? ` — did you mean ${near}=?` : ''} (a cell: ${Object.keys(CORE).join(' ')}; a sound or a physical cell: ${Object.keys(PARAMS).join(' ')})`,
          at,
          word.length,
        );
      }
      // each at most once (step= and loop= are one setting)
      const slot = key === 'loop' ? 'step' : key;
      if (seen.has(slot))
        s.fail(slot === 'step' && b.step!.whole !== (word === 'loop') ? 'step= and loop= say the same thing two ways — pick one' : `${word}= is given twice`, at, word.length);
      seen.add(slot);
      const read = (KEYS as Readonly<Record<string, Key>>)[key]?.read ?? (CELL_PARAMS.has(key) ? readCellParam : readParam);
      read(s, b, word, at);
      if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
      continue;
    }
    if (word === 'free' && s.peek() === '(') {
      // free(0 2 4 ~ …): a braid left to the performer, the cell's whole braid
      if (generator || tokens.length) s.fail(FREE_BRAID_WHOLE, at, word.length);
      s.i = at;
      generator = parseFreeBraid(s);
      freeBraid = true;
      continue;
    }
    if (word !== null && isGenerator(word) && s.peek() === '(') {
      if (generator || tokens.length) s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps', at, word.length);
      if (word === 'fifths') {
        // fifths(n): the circle, turned n fifths round (the cell's shift)
        const f = parseFifths(s, at);
        generator = f.braid;
        fifthsShift = f.shift;
      } else if (word === 'scale') {
        // scale(name, tonic): its steps the cell's braid, read through the key it brings
        const sc = parseScale(s, at);
        generator = { kind: 'scan', steps: sc.steps, span: sc.span };
        scaleKey = sc.key;
      } else generator = parseGenerator(s, word, at);
      continue;
    }
    if (word !== null && (OPERATIONS as readonly string[]).includes(word) && s.peek() === '(') {
      // degree(&x, n), inverse(&x): a step, read with its modifiers
      if (generator) s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps');
      s.i = at;
      tokens.push(parseToken(s));
      continue;
    }
    if (word === 'off' && s.atBoundary()) {
      if (off) s.fail('off is given twice', at, word.length);
      off = true;
      continue;
    }
    // a note by name is a step (C, Bb3): read again as one
    // (and _, a step kept from the base: parser/base.ts)
    if (word !== null && (/^[A-G](?:b?-?[0-9]*)$/.test(word) || word === '_')) s.i = at;
    else if (word !== null) s.fail(`Unexpected '${word}'`, at, word.length);
    if (generator) s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps', at, 1);
    tokens.push(parseToken(s));
  }

  const braid: Braid = generator ?? (tokens.length ? { kind: 'list', tokens } : { kind: 'blank' });
  // (gain= is a gate's level, on the line of a gate (trigger=) only; anywhere else it is dough's, retired)
  if ('gain' in b.params && !('trigger' in b.params)) {
    const at = b.paramSpans.gain;
    s.fail(RETIRED_PARAMS.gain, at ? at.col - 1 : 0, 4);
  }
  if (fifthsShift !== null && fifthsShift !== 0) {
    if (b.shift !== null) s.fail('fifths(n) turns it already: write fifths() and shift=, or fifths(n) alone');
    b.shift = fifthsShift;
  }
  if (scaleKey) {
    if (b.over) s.fail('scale(…) reads through a key of its own: drop over=, or write the key as a cell (&mode over=&key scan(…))', b.over.span.col - 1, b.over.span.len);
    b.over = scaleKey;
  }
  const { over, base, shift, step, map, stride, cycle, env, pitch, show, label, title, tags, tier, about, laps, chance, seed, size, params, paramSpans, paramCells, paramClocks } =
    b;
  return {
    name: head.name,
    span: head.span,
    over,
    ...(base ? { base } : {}),
    shift,
    off,
    step,
    map,
    stride,
    cycle,
    env,
    pitch,
    show,
    label,
    title,
    tags,
    tier,
    about: about ?? undefined,
    laps,
    chance,
    seed,
    size,
    params,
    paramSpans,
    paramCells,
    paramClocks,
    braid,
    frees: [...s.frees],
  };
}

export function parseCell(s: LineScanner): CellDecl {
  s.skipSpace();
  if (s.text.startsWith('&(', s.i)) s.fail('An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …');
  const head = s.ref('a cell name like &theme');
  if (head.pick || head.shift) s.fail('Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here', head.span.col - 1, head.span.len);
  if (s.peek() === '(') s.fail(`&name(…) is gone — write over=&…`);
  return parseBody(s, head);
}
