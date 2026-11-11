// The language's symmetries (#632 rung 3, decision 083): three actions on a text, each with what it does to the events,
// and five transformations, each checked to commute with each action: a matrix of fifteen cells, every example in
// each, its exceptions listed by name with why.
//
// - **Renaming** (L1's action, here the tools' side of it): every name a text defines, to a fresh name. On the events,
//   nothing.
// - **Transposition** by a whole tone: every voice's own frequency (`loop=` or `step=` at audio rate) times 2^(2/12),
//   an unnamed voice's in its line too. On the events: every frequency times 2^(2/12), times and lengths kept.
// - **Time scaling** by r = 5/4: every clock's own rate below audio (a tempo, a `loop=`, an LFO) times r. On the
//   events: every onset divided by r, pitches kept; a length divided by r, or held where the sound holds it in seconds
//   (a one-shot's ring, a drum's hit, a drone's whole length).
//
// The transformations: compile (the events), expand (the `from` lines written in), Normalise, Shorten, the core. A tool
// commutes with an action when the action then the tool plays what the tool then the action plays (S1); the compile row
// is the action's own statement on the events. Every text but expand's is an example with its `from` lines written in:
// an action reaches the cells a text writes, so on a text with `from` lines it reaches only its own lines (the expand
// row's exceptions say which).
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { FAMILIES, toCore } from './core';
import { setTiming } from './edit';
import { EXAMPLES } from './examples';
import { normalise } from './normalise';
import { parse } from './parser';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { soundsIdentical } from './sameness';
import { shortenAll } from './shorten';
import { LIBRARY, resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed };
const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;
const NAME = /&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])/g;
const TONE = 2 ** (2 / 12);
const R = 5 / 4;
const SECONDS = 8;

/** A text with each name it defines renamed to a fresh one (`&zq0` …). */
function renamed(text: string): string {
  const mine = [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !n.startsWith('λ'));
  const writes = new Set([...text.matchAll(NAME)].map((m) => m[1]!));
  const to = new Map<string, string>();
  let k = 0;
  for (const n of mine) {
    let fresh = `zq${k++}`;
    while (writes.has(fresh)) fresh = `zq${k++}`;
    to.set(n, fresh);
  }
  return text.replace(NAME, (w, n: string) => (to.has(n) ? `&${to.get(n)}` : w));
}

/** Replace each span of `text` (line and column from 1) by its value, right to left so the others stay put. */
function spliced(text: string, edits: readonly { line: number; col: number; len: number; value: string }[]): string {
  const lines = text.split('\n');
  for (const e of [...edits].sort((a, b) => b.line - a.line || b.col - a.col)) {
    const l = lines[e.line - 1]!;
    lines[e.line - 1] = l.slice(0, e.col - 1) + e.value + l.slice(e.col - 1 + e.len);
  }
  return lines.join('\n');
}

const number = (x: number) => String(+x.toPrecision(15));

/** A text transposed by a whole tone: each voice the text writes, its frequency times 2^(2/12). */
function transposed(text: string): string {
  const r = compileSource(text, undefined, O);
  const own = new Map(parse(text).cells.map((d) => [d.name, d] as const));
  // (an unnamed voice, `&(loop=C1 sin(12))`: its `loop=` rewritten inside its span)
  const lines = text.split('\n');
  const inline = [...r.cells.values()].flatMap((c) => {
    const d = own.get(c.name);
    if (!c.voice || !c.lambda || !d) return [];
    const inner = lines[d.span.line - 1]!.slice(d.span.col - 1, d.span.col - 1 + d.span.len);
    return [{ ...d.span, value: inner.replace(/\b(loop|step)=\S+?(?=[\s)])/, (_, k: string) => `${k}=${number(c.freq * TONE)}`) }];
  });
  let out = spliced(text, inline);
  for (const c of r.cells.values()) {
    const d = own.get(c.name);
    if (!c.voice || c.lambda || !d) continue;
    const step = d.step as { kind?: string; whole?: boolean } | undefined;
    out = setTiming(out, c.name, step?.kind === 'rate' && !step.whole ? 'step' : 'loop', number(c.freq * TONE));
  }
  return out;
}

/** A text scaled in time by r: each clock's own rate the text writes, below audio and not a voice's, times r. */
function timeScaled(text: string, r = R): string {
  const result = compileSource(text, undefined, O);
  return spliced(
    text,
    parse(text).cells.flatMap((d) => {
      const step = d.step as { kind?: string; perSecond?: number; span?: { line: number; col: number; len: number } } | undefined;
      const c = result.cells.get(d.name);
      if (step?.kind !== 'rate' || !step.span || step.perSecond === undefined || step.perSecond > 20 || !c || c.voice) return [];
      if (c.map?.kind === 'sample' || c.map?.kind === 'midi') return [];
      return [{ ...step.span, value: number(step.perSecond * r) }];
    }),
  );
}

type Event = { at: number; dur: number; freq: number; voice: string };

/** The events of the first `seconds`, ordered by onset, then voice and frequency (simultaneous events have no order; a transposition keeps this one). */
function events(text: string, seconds = SECONDS): Event[] {
  const r = compileSource(text, undefined, O);
  return eventsBetween(plan(r, codeShifts(r)), 0, seconds)
    .map((e) => ({ at: e.at, dur: e.dur, freq: e.freq, voice: e.voice }))
    .sort((a, b) => Math.round(a.at * 1e5) - Math.round(b.at * 1e5) || a.voice.localeCompare(b.voice) || a.freq - b.freq);
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const ACTIONS = { renaming: renamed, transposition: transposed, 'time scaling': (t: string) => timeScaled(t) } as const;
type Action = keyof typeof ACTIONS;

const TOOLS = {
  expand: (t: string) => written(t, O),
  Normalise: (t: string) => normalise(t, O).source,
  Shorten: (t: string) => shortenAll(t, 60, O).source,
  core: (t: string) => toCore(t, { ...O, library: LIBRARY }).source,
} as const;
type Tool = keyof typeof TOOLS;

/**
 * Time scaling's exceptions: a text that holds a time in seconds besides its sounds, which no rate it writes scales.
 * (Transposition has none; a text with an absolute pitch in a line, not a voice, would be one.)
 */
const SECONDS_HELD: Record<string, string> = {
  musicbox: 'a physical model: the bar’s motor, mass and friction act in seconds',
  automaton: 'a physical model: belts, masses and slips in seconds',
  echotape: 'a physical model: the reel’s motor, mass, friction and wow',
  tape: 'a physical model: the reel and its wow',
  daytime: 'a law over the wall clock: fiveto12 reads the day, 84 steps a minute',
  fiveto12: 'a law over the wall clock: fiveto12 reads the day, 84 steps a minute',
};

/**
 * The expand row's exceptions: an action reaches the lines a text writes, so a `from` line whose fragment writes its own
 * voice or clock (not one it takes) is out of its reach until written in, by name.
 */
const OUT_OF_REACH: Record<Exclude<Action, 'renaming'>, readonly string[]> = {
  transposition: ['drums', 'swing', 'midi-out', 'funk', 'twelve', 'aksak', 'patchbay', 'electroswing', 'spooky', 'kinderlied', 'radio'],
  'time scaling': [
    'transpose',
    'twinkle',
    'canon',
    'waveforms',
    'kalimba',
    'sympathy',
    'harmonograph',
    'echotape',
    'worn',
    'play-in',
    'midi-out',
    'aksak',
    'royal',
    'pertonos',
    'ricercar',
    'bossa',
    'pachelbel',
    'pop',
    'alpha',
    'bwv847',
    'onemore',
    'electroswing',
    'spooky',
    'soundtape',
    'testtones',
    'forks',
    'resonanz',
  ],
};

/** Each tool's exceptions per action, by example, with why (none known). */
const DOESNT_COMMUTE: Record<Tool, Partial<Record<Action, Record<string, string>>>> = { expand: {}, Normalise: {}, Shorten: {}, core: {} };

const KEYS = Object.keys(EXAMPLES);
/** The core's row takes every third example: coring is the matrix's cost (a core each way, 1.5 s an example), and the
 * full row, measured once over all 89 (2026-11-11), held for every action. */
const CORED = KEYS.filter((_, i) => i % 3 === 0);
const source = (key: string) => EXAMPLES[key as keyof typeof EXAMPLES].source;

// law L13, L14
describe('the language’s symmetries: each action on the events (the compile row)', () => {
  it.each(KEYS)('renaming: %s plays the same', (key) => {
    const text = written(source(key), O);
    expect(soundsIdentical(text, renamed(text), undefined, O)).toBe(true);
  });

  it.each(KEYS)('transposition: %s plays every frequency a whole tone up, at the same times and lengths', (key) => {
    const text = written(source(key), O);
    const a = events(text);
    const b = events(transposed(text));
    expect(b.length).toBe(a.length);
    const off = a.flatMap((e, i) => (near(b[i]!.at, e.at) && near(b[i]!.dur, e.dur) && near(b[i]!.freq / e.freq, TONE) ? [] : [i]));
    expect(off).toEqual([]);
  });

  it.each(KEYS.filter((k) => !(k in SECONDS_HELD)))('time scaling: %s plays every onset at its time over r, every pitch kept, every length over r or held', (key) => {
    const text = written(source(key), O);
    const a = events(text);
    const b = events(timeScaled(text), SECONDS / R);
    expect(b.length).toBe(a.length);
    const off = a.flatMap((e, i) => {
      const x = b[i]!;
      return near(x.at, e.at / R) && near(x.freq, e.freq) && (near(x.dur, e.dur / R) || near(x.dur, e.dur)) ? [] : [i];
    });
    expect(off).toEqual([]);
  });

  it.each(Object.keys(SECONDS_HELD))('time scaling: %s holds a time in seconds, and doesn’t scale (listed while it does)', (key) => {
    const text = written(source(key), O);
    const a = events(text).map((e) => `${(e.at / R).toFixed(5)} ${e.freq.toFixed(4)}`);
    const b = events(timeScaled(text), SECONDS / R).map((e) => `${e.at.toFixed(5)} ${e.freq.toFixed(4)}`);
    expect(b).not.toEqual(a);
  });
});

// law L12, L13, L14
describe('the language’s symmetries: each tool commutes with each action', () => {
  // (each tool's run on an example, kept for its three actions: the core's is the row's cost)
  const ran = new Map<string, string>();
  const once = (tool: Tool, text: string) => {
    const k = `${tool}\n${text}`;
    if (!ran.has(k)) ran.set(k, TOOLS[tool](text));
    return ran.get(k)!;
  };
  for (const [tool, run] of Object.entries(TOOLS) as [Tool, (t: string) => string][])
    for (const [action, act] of Object.entries(ACTIONS) as [Action, (t: string) => string][]) {
      const skip = {
        ...(tool === 'expand' && action !== 'renaming' ? Object.fromEntries(OUT_OF_REACH[action].map((k) => [k, 'out of reach'])) : {}),
        ...DOESNT_COMMUTE[tool][action],
      };
      describe(`${tool} × ${action}`, () => {
        it.each((tool === 'core' ? CORED : KEYS).filter((k) => !(k in skip)))('%s', (key) => {
          const text = tool === 'expand' ? source(key) : written(source(key), O);
          const a = run(act(text));
          const b = act(once(tool, text));
          expect(a === b || soundsIdentical(a, b, undefined, O)).toBe(true);
        });
        if (Object.keys(skip).length)
          it.each(Object.keys(skip))('%s is listed, and doesn’t commute', (key) => {
            const text = tool === 'expand' ? source(key) : written(source(key), O);
            const a = run(act(text));
            const b = act(run(text));
            expect(a !== b && !soundsIdentical(a, b, undefined, O)).toBe(true);
          });
      });
    }
});
