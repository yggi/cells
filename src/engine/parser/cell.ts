/** A cell's line: its name, then attributes and its braid, in any order. */
import type { Braid, CellDecl, MapSpec, ParamCells, Ref, Span, StepSpec, Token } from '../ast';
import { RETIRED_PARAMS, TIME_PARAMS, canonical, isDoughParam } from '../dough-params';
import { CELL_PARAMS, CORE, PARAMS, nearestAttribute } from '../attributes';
import { IDENT, type LineScanner } from './scanner';
import { parseToken } from './braid';
import { parseFree } from './free';
import { isGenerator, parseGenerator } from './generators';
import { parseMap, parseStep } from './values';
import { syntax, type Syntax } from './syntax';

/** What a cell's attributes have set so far, as its line is read. */
interface Body {
  over: Ref | null;
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
export const SHOWS = ['braid', 'pattern', 'notes', 'midi', 'do', 'degrees', 'table', 'scale', 'mode', 'key', 'grid', 'meter', 'spectrum', 'wave', 'levels', 'adsr', 'mix', 'note', 'petal', 'off', 'matrix', 'lfo'] as const;
/** Naming conventions, after a colon: show=notes:flats. */
export const SHOW_CONVENTIONS: Readonly<Record<string, readonly string[]>> = { notes: ['flats', 'sharps', 'german'], do: ['fixed', 'movable'] };

const whole = (key: 'shift' | 'stride'): Reader => (s, b) => {
  b[key] = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, key, false).value) : s.int(`a whole number after ${key}=`);
};
const text = (key: 'title' | 'tags' | 'label', example: string): Reader => (s, b) => {
  const q = s.match(/"([^"]*)"/y);
  if (q === null) s.fail(`${key}= takes a text in quotes: ${example}`);
  b[key] = q!.slice(1, -1);
};
const voiceOwn = (key: 'env' | 'pitch'): Reader => (s, b) => {
  b[key] = s.ref(`a cell after ${key}=, like ${key}=&pluck or ${key}=&(map=adsr .01 .3 .5 .4)`);
};
const timing: Reader = (s, b, word) => {
  b.step = parseStep(s, word === 'loop');
};

/** The core attributes, each with a syntax of its own: the parser reads a cell's line through this table. */
export const KEYS: Readonly<Record<keyof typeof CORE, Key>> = {
  over: {
    form: 'over=&table · over=&table[<<n] · over=scale(tonic, phase)',
    examples: ['&tune over=&major step=2 0 2 4', '&mode over=&major[<<2] 0 2 4', '&tune over=scale(9, 2) step=2 0 2 4'],
    read: (s, b, _, at) => {
      const sc = s.match(/scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/y);
      if (sc) {
        // scale(tonic, phase): the 12 shifted to the tonic, even(7,12,phase) over it — written once
        const [, tonic, phase] = /scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/.exec(sc)!;
        b.over = { name: `scale:${parseInt(tonic, 10)}:${parseInt(phase, 10)}`, pick: null, shift: 0, span: s.span(at + 5) };
      } else if (s.match(/scale\(/y)) s.fail('scale(tonic, phase): like scale(0,2) for C Aeolian');
      else b.over = s.ref('a cell or scale(tonic, phase) after over=, like over=&scale');
      if (b.over!.pick) s.fail('over= takes a whole table (shifting it is fine: over=&scale[<<])', b.over!.span.col - 1, b.over!.span.len);
    },
  },
  step: { form: 'step=…', examples: ['&tune step=&bar 0 2 4'], read: timing },
  loop: { form: 'loop=…', examples: ['&lead s=saw loop=C4'], read: timing },
  shift: { form: 'shift=n · shift=free(n, lo..hi)', examples: ['&mode over=&major shift=5 0 2 4', '&key shift=free(0, 0..11)'], read: whole('shift') },
  stride: { form: 'stride=n · stride=free(n, lo..hi)', examples: ['&key step=cycle(&theme) stride=7'], read: whole('stride') },
  map: { form: 'map=…', examples: ['&accent map=amp step=&bar 1 .5'], read: (s, b) => (b.map = parseMap(s)) },
  show: {
    form: `show=kind · show=notes:convention · show=do:convention`,
    examples: ['&tune show=notes step=2 0 2 4', '&tune show=notes:german step=2 0 2 4', '&tune show=do:movable step=2 0 2 4'],
    read: (s, b) => {
      const at2 = s.i;
      const w = s.match(/[a-z]+/y);
      if (w === null || !(SHOWS as readonly string[]).includes(w)) s.fail(`show= takes one of: ${SHOWS.join(' ')}`, at2, Math.max(1, (w ?? '').length));
      // a naming convention: notes:flats, notes:sharps, notes:german, do:fixed
      let conv = '';
      if (s.peek() === ':') {
        s.i++;
        const cw = s.match(/[a-z]+/y) ?? '';
        const ok = SHOW_CONVENTIONS[w!]?.includes(cw);
        if (!ok) s.fail(`show=${w}: takes ${w === 'notes' ? 'flats, sharps or german' : w === 'do' ? 'fixed or movable' : 'no convention'}`, at2, s.i - at2);
        conv = `:${cw}`;
      }
      b.show = w + conv;
    },
  },
  label: { form: 'label="text"', examples: ['&theme label="the King\'s theme" step=2 0 2 4', '&note label="A note in the graph: alone on its cell."'], read: text('label', 'label="the King\'s theme"') },
  env: { form: 'env=&envelope', examples: ['&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)'], read: voiceOwn('env') },
  pitch: { form: 'pitch=&vibrato', examples: ['&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)'], read: voiceOwn('pitch') },
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
  title: { form: 'title="text"', examples: ['&piece title="Swing blues" tags="genre:jazz, basics" label="A blues in F."'], read: text('title', 'title="Swing blues"') },
  tags: { form: 'tags="tag, tag"', examples: ['&piece title="Swing blues" tags="genre:jazz, basics"', '&lead tags="melody" s=saw loop=C4'], read: text('tags', 'tags="jazz, blues"') },
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
  play: 'the tape it reads, like play=&tape',
  couple: 'the resonator it shares a table with, like couple=&fork',
  sun: 'the law whose day it shows, like sun=&cycle',
  excite: 'what drives it, like excite=&mix',
};

/** A parameter naming a cell: fm= its modulator; write= a tape's source; play= a read head's tape … */
const readCellParam: Reader = (s, b, word) => {
  const r = s.ref(CELL_WANTS[word]);
  b.params[word] = r.name;
  b.paramSpans[word] = r.span;
};

/** A parameter's value: a number or a word, free(…), a clock (a time), or cells it moves with. */
function readParam(s: LineScanner, b: Body, word: string): void {
  const key = canonical(word);
  const vs = s.i;
  // a time as a clock: delaytime=&bar/2
  if (s.peek() === '&' && TIME_PARAMS.has(key)) {
    const st = parseStep(s, false);
    if (st.kind !== 'driven') s.fail(`${word}= takes seconds, or a clock: ${word}=&bar/2`, vs, s.i - vs);
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
    if (!range) factors.push(s.ref(`a cell after ${word}=`));
    for (;;) {
      const save = s.i;
      s.skipSpace();
      if (s.peek() !== '*') {
        s.i = save;
        break;
      }
      s.i++;
      s.skipSpace();
      factors.push(s.ref(`a cell after *, like ${word}=200..3000 * &fenv`));
    }
    if (range && factors.length === 0) s.fail(`${word}=${range[0]}: a range is scaled by cells — ${word}=${range[0]} * &fenv`, vs, s.i - vs);
    if (!range && factors.length > 1) s.fail(`${word}=: several cells multiply a range — ${word}=200..3000 * &a * &b`, vs, s.i - vs);
    b.paramCells[key] = { range: range ? [parseFloat(range[1]), parseFloat(range[2])] : null, factors, span: s.span(vs) };
    b.paramSpans[key] = s.span(vs);
    return;
  }
  const v = s.match(/-?[A-Za-z0-9_.]+/y);
  if (v === null) s.fail(`Expected a value after ${word}=`);
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
  syntax('line', '&name …', 'A cell: one per line, its name first, then its attributes (key=value) and its braid, in any order.', ['&theme over=&major step=&bar 0 2 4 5'], 'cell.md'),
  syntax('line', '&name label="…"', 'A note: a cell with only a label= (and title=, tags=, about=) explains, in the graph; it does nothing.', ['&why label="The bass walks down a fifth each bar."'], 'display.md'),
  syntax('line', 'off', 'Switched off: it, and everything that reads through it or plays it, is silent (and hidden from the graph).', ['&drums off over=&kit step=&bar 0 1'], 'cell.md'),
  syntax('line', '# … · // …', 'A comment, to the end of the line: # at the start of a line or after a space (a # glued to a number is a sharp), // anywhere.', ['&tune step=2 0 2 4  # the opening'], 'cell.md'),
  syntax('line', '… + · … * · … , · … [', 'A line ending in +, *, a comma or [ continues on the next one (a long mix).', [], 'cell.md'),
];

/** A cell's body: attributes and braid, up to the end of the scanner's text. */
export function parseBody(s: LineScanner, head: Ref): CellDecl {
  const b: Body = {
    over: null,
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

  while (!s.done()) {
    const at = s.i;
    const word = s.match(IDENT);
    if (word !== null && s.peek() === '=') {
      s.i++;
      const key = word in KEYS ? word : CELL_PARAMS.has(word) ? word : isDoughParam(word) ? canonical(word) : null;
      if (key === null) {
        if (word in RETIRED_KEYS) s.fail(RETIRED_KEYS[word], at, word.length);
        const near = nearestAttribute(word);
        s.fail(`Unknown attribute ${word}=${near ? ` — did you mean ${near}=?` : ''} (a cell: ${Object.keys(CORE).join(' ')}; a sound or a physical cell: ${Object.keys(PARAMS).join(' ')})`, at, word.length);
      }
      // each at most once (step= and loop= are one setting)
      const slot = key === 'loop' ? 'step' : key;
      if (seen.has(slot))
        s.fail(slot === 'step' && b.step!.whole !== (word === 'loop') ? 'step= and loop= say the same thing two ways — pick one' : `${word}= is given twice`, at, word.length);
      seen.add(slot);
      if (key !== word) s.warn(`${word}= is dough's other name for ${key}=: write ${key}=`, at, word.length);
      const read = (KEYS as Readonly<Record<string, Key>>)[key]?.read ?? (CELL_PARAMS.has(key) ? readCellParam : readParam);
      read(s, b, word, at);
      if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
      continue;
    }
    if (word !== null && isGenerator(word) && s.peek() === '(') {
      if (generator || tokens.length) s.fail('A cell has one braid: a generator or a list of steps', at, word.length);
      generator = parseGenerator(s, word, at);
      continue;
    }
    if (word === 'off' && s.atBoundary()) {
      if (off) s.fail('off is given twice', at, word.length);
      off = true;
      continue;
    }
    if (word !== null) s.fail(`Unexpected '${word}'`, at, word.length);
    if (generator) s.fail('A cell has one braid: a generator or a list of steps');
    tokens.push(parseToken(s));
  }

  const braid: Braid = generator ?? (tokens.length ? { kind: 'list', tokens } : { kind: 'blank' });
  const { over, shift, step, map, stride, cycle, env, pitch, show, label, title, tags, about, laps, chance, seed, size, params, paramSpans, paramCells, paramClocks } = b;
  return { name: head.name, span: head.span, over, shift, off, step, map, stride, cycle, env, pitch, show, label, title, tags, about: about ?? undefined, laps, chance, seed, size, params, paramSpans, paramCells, paramClocks, braid, frees: [...s.frees] };
}

export function parseCell(s: LineScanner): CellDecl {
  s.skipSpace();
  if (s.text.startsWith('&(', s.i)) s.fail('An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …');
  const head = s.ref('a cell name like &theme');
  if (head.pick || head.shift)
    s.fail('Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here', head.span.col - 1, head.span.len);
  if (s.peek() === '(') s.fail(`&name(…) is gone — write over=&…`);
  return parseBody(s, head);
}
