/**
 * The tutorial as a ladder (#170): each piece of it (a card with `tags="tutorial"` and `rung=n`)
 * introduces one concept, and uses only what the rungs before it introduced. A concept is a set of
 * the forms of docs/language/reference.md, and every form is some rung's: together the rungs cover
 * the language, each form once. `formsUsed` reads which forms a piece uses from what it parses to;
 * the ladder's test (ladder.test.ts) checks each form is first used on the rung that introduces it.
 */
import type { Atom, Expr, Ref, Span, Token } from './ast';
import { compileSource } from './compile';
import { voiceGrooves } from './compiler/declare';
import { context } from './compiler/context';
import { SORT_RULES } from './compiler/sorts';
import { parse } from './parser';
import { stripComment } from './parser/scanner';
import { DEFAULT_ENV } from './program';

/**
 * A form's key, from its reference entry: an attribute or a parameter by its word (`over`, `lpf`);
 * a sort by its sort and what makes it one (`signal: a mix`); anything else by its first spelling
 * (`x!n`, `step=&x`), each after its section (`modifier x!n`).
 */
export function formKey(e: { readonly section: string; readonly form: string; readonly means: string }): string {
  if (e.section === 'attribute' || e.section === 'parameter') return `${e.section} ${e.form.split('=')[0]}`;
  if (e.section === 'sort') return `sort ${e.form}: ${e.means.split(/[(:.]/)[0].trim().toLowerCase()}`;
  return `${e.section} ${e.form.split(' · ')[0]}`;
}

/** The rungs: what each introduces, as forms (formKey). The order is the tutorial's; rung n is LADDER[n − 1]. */
export const LADDER: readonly { readonly concept: string; readonly forms: readonly string[] }[] = [
  {
    concept: 'steps: numbers, rests, holds, repeats, a rate; a voice and the sound card',
    forms: [
      'line &name …',
      'line &name label="…"',
      'line # …',
      'step n',
      'step ~',
      'modifier x@n',
      'modifier x!n',
      'reference &name',
      'attribute step',
      'attribute loop',
      'attribute map',
      'attribute label',
      'attribute title',
      'attribute tags',
      'attribute about',
      'attribute rung',
      'rate step=r',
      'rate loop=NAME',
      'map map=sample',
      'parameter s',
      'parameter level',
      'mix [a, b, …]',
      'mix p * s',
      'mix n',
      'sort signal: a sound parameter',
      'sort pitch: anything else',
    ],
  },
  {
    concept: 'a clock: a bar, step=&bar, /2 and *2, a tempo marking',
    forms: ['generator scan(i …)', 'rate nbpm', 'rate step=&x', 'rate step=&x*n', 'rate step=free(r, lo..hi)', 'free free(marking)'],
  },
  { concept: 'a voice: a source and an envelope', forms: ['attribute env', 'reference &( … )', 'map map=adsr a d s r'] },
  {
    concept: 'filters and effects; a vibrato',
    forms: [
      'attribute pitch',
      'parameter lpf',
      'parameter lpq',
      'parameter hpf',
      'parameter hpq',
      'parameter room',
      'parameter delay',
      'parameter delaytime',
      'parameter delayfeedback',
      'parameter distort',
      'parameter crush',
    ],
  },
  { concept: 'tables: over=, scale(), shift=; show= and size=', forms: ['attribute over', 'attribute shift', 'attribute show', 'attribute size', 'generator scale(name)'] },
  { concept: 'motifs: splicing, reuse, degrees (^n)', forms: ['step &x', 'reference &name^n'] },
  { concept: 'chords and a progression: accidentals, a sum of pitches', forms: ['step [a, b, c]', 'step n#', 'mix a + b', 'mix ( … )'] },
  { concept: 'meter and feel: a bent bar, gates', forms: ['map map=amp', 'sort volume: map=amp, map=db or map=adsr'] },
  {
    concept: 'drums: a groove of voices, ratchets, euclid, a kit',
    forms: ['step &voice (stepped)', 'modifier x*n', 'generator euclid(k, n)', 'sort signal: a pattern read through a kit'],
  },
  { concept: 'swing: a swing clock, swing= and beat=', forms: ['parameter swing', 'parameter beat'] },
  { concept: 'canon: a theme shifted', forms: ['reference &name[<<n]'] },
  {
    concept: 'mirrors: retrograde, slices, picks, transposing, inverse()',
    forms: ['reference &name[i]', 'reference &name[a:b]', 'reference &name^$n', 'reference inverse(&name)'],
  },
  { concept: 'chance and choice', forms: ['modifier x?', 'step [a|b|c]', 'attribute chance', 'attribute seed'] },
  { concept: 'turning tables: stride=, cycle(&x); the circle of fifths', forms: ['attribute stride', 'rate step=cycle(&x)', 'generator fifths()'] },
  { concept: 'arrangement: parts as taps of the bar, a selector, laps=, off', forms: ['line &parts step=&bar &a &b', 'attribute laps', 'line off', 'line … +'] },
  { concept: 'stereo: pan=', forms: ['parameter pan'] },
  {
    concept: 'waveforms from braids: audio rates, sin(), ramps, tables, an instrument',
    forms: ['sort wave: a braid turning at an audio rate', 'generator sin(n)', 'map map=lin', 'sort plain: map=lin', 'map map=&table', 'rate nhz', 'rate nk', 'sort signal: a mix'],
  },
  { concept: 'moving parameters: a filter that opens, a fade in decibels', forms: ['map map=db'] },
  { concept: 'tuning: grids', forms: ['map map=edo', 'map map=ed(r)', 'map map=ratios', 'step n/d', 'attribute cycle'] },
  { concept: 'free(): sliders and named choices; meter()', forms: ['free free(v, lo..hi)', 'free free(v, lo..hi, "names")', 'mix free(v, lo..hi)', 'generator meter("sig")'] },
  { concept: 'FM', forms: ['parameter fm', 'parameter ratio', 'parameter index'] },
  { concept: 'a motor', forms: ['parameter motor', 'parameter mass', 'parameter friction', 'parameter wind'] },
  { concept: 'a belt', forms: ['parameter belt', 'parameter damping', 'parameter slip'] },
  { concept: 'a resonator', forms: ['parameter body', 'parameter ring', 'parameter hard', 'parameter board', 'parameter coupling'] },
  { concept: 'resonators that answer: coupled, excited', forms: ['parameter couple', 'parameter excite'] },
  { concept: 'a scope', forms: ['parameter scope', 'parameter fold', 'parameter bins', 'parameter channels'] },
  { concept: 'a tape', forms: ['parameter write', 'parameter length', 'parameter erase', 'parameter play', 'parameter at', 'parameter wow', 'parameter varispeed'] },
  {
    concept: 'a sound tape: worn, wandering heads',
    forms: [
      'sort signal: a read head of a sound tape',
      'parameter tone',
      'parameter drive',
      'parameter hiss',
      'parameter print',
      'parameter printgap',
      'parameter dropout',
      'parameter wander',
      'parameter wanderhz',
    ],
  },
  { concept: 'text: spell()', forms: ['generator spell("text", &table, "names")', 'free free("text")'] },
  { concept: 'clock time and a law', forms: ['rate nmin', 'rate nh', 'rate nd', 'rate nwk', 'parameter anchor', 'parameter law'] },
];

const TEMPO_MARKINGS = /free\(\s*(largo|larghetto|adagio|andante|moderato|allegro|vivace|presto)\s*\)/;
const UNIT_AFTER = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(bpm|hz|min|wk|h|d|k)\b/;

/** Every form a piece uses (formKey), read from its text as parsed. */
export function formsUsed(source: string): Set<string> {
  const used = new Set<string>();
  const use = (k: string) => used.add(k);
  const parsed = parse(source);
  const decls = new Map(parsed.cells.map((d) => [d.name, d]));
  const lines = source.split('\n');
  const textOf = (sp: Span) => (lines[sp.line - 1] ?? '').slice(sp.col - 1, sp.col - 1 + sp.len);

  // lines: comments, a line continued, generators and tempo markings (read from the text, quotes left out)
  let code = '';
  for (const raw of lines) {
    const line = stripComment(raw);
    if (line !== raw) use('line # …');
    if (/[+*,[]\s*$/.test(line)) use('line … +');
    code += line.replace(/"[^"]*"/g, '""') + '\n';
  }
  for (const [word, form] of [
    ['scan', 'scan(i …)'],
    ['euclid', 'euclid(k, n)'],
    ['sin', 'sin(n)'],
    ['meter', 'meter("sig")'],
    ['spell', 'spell("text", &table, "names")'],
    ['scale', 'scale(name)'],
    ['fifths', 'fifths()'],
  ])
    if (new RegExp(`\\b${word}\\(`).test(code)) use(`generator ${form}`);
  if (TEMPO_MARKINGS.test(code)) use('free free(marking)');

  const compiled = compileSource(source);
  const grooves = voiceGrooves(decls);
  const ctx = context(parsed, DEFAULT_ENV);
  const seen = { decls, rateOf: ctx.rateOf };

  const ref = (r: Pick<Ref, 'pick' | 'shift' | 'transpose'> & { values?: Extract<Atom, { kind: 'ref' }>['values'] }) => {
    use('reference &name');
    if (r.pick?.kind === 'at') use('reference &name[i]');
    if (r.pick?.kind === 'slice') use('reference &name[a:b]');
    if (r.shift) use('reference &name[<<n]');
    if (r.transpose) use('reference &name^$n');
    if (r.values?.add) use('reference &name^n');
    if (r.values && r.values.mul < 0) use('reference inverse(&name)');
  };
  const isMix = (name: string) => {
    const b = decls.get(name)?.braid;
    return b?.kind === 'list' && b.tokens.length === 1 && b.tokens[0].atom.kind === 'mix';
  };
  // what a cell is in a mix: a sort for each cell a mix names
  const sortOf = (name: string) => {
    const d = decls.get(name);
    const rule = d ? SORT_RULES.find((r) => r.holds(d, seen)) : undefined;
    if (rule) use(formKey({ section: 'sort', form: rule.sort, means: rule.is }));
  };
  const expr = (e: Expr): void => {
    if (e.k === 'ref') {
      ref(e.ref);
      sortOf(e.ref.name);
    } else if (e.k === 'num') use('mix n');
    else if (e.k === 'prod') {
      use('mix p * s');
      for (const f of e.factors) {
        if (f.k === 'sum' || f.k === 'prod') use('mix ( … )');
        expr(f);
      }
    } else {
      use('mix a + b');
      for (const it of e.items) {
        if (it.e.k === 'sum') use('mix ( … )');
        expr(it.e);
      }
    }
  };
  const token = (t: Token, groove: boolean, card: boolean) => {
    if (t.repeat > 1) use('modifier x!n');
    if (t.subdivide > 1) use('modifier x*n');
    if (t.elongate !== 1) use('modifier x@n');
    if (t.chance !== undefined) use('modifier x?');
    const a = t.atom;
    if (a.kind === 'note') {
      use('step n');
      if (a.alter) use('step n#');
      if (/^-?[0-9.]+\/[0-9]/.test(textOf(t.span))) use('step n/d');
    } else if (a.kind === 'rest') use('step ~');
    else if (a.kind === 'chord') {
      use('step [a, b, c]');
      if (a.alters.some(Boolean)) use('step n#');
    } else if (a.kind === 'choice') {
      use('step [a|b|c]');
      if (a.alters.some(Boolean)) use('step n#');
    } else if (a.kind === 'ref' && card) {
      // (the sound card's entries are its channels: a mix there is a channel, not an instrument)
      ref(a);
      if (!isMix(a.name)) sortOf(a.name);
    } else if (a.kind === 'ref') {
      if (groove && Object.keys(decls.get(a.name)?.params ?? {}).length) use('step &voice (stepped)');
      else use('step &x');
      ref(a);
    } else if (groove) {
      use('step &voice (stepped)');
      for (const e of a.exprs) if (e.k === 'ref') ref(e.ref);
    } else {
      use('mix [a, b, …]');
      for (const e of a.exprs) expr(e);
    }
  };

  for (const d of parsed.cells) {
    const c = compiled.cells.get(d.name);
    use('line &name …');
    if (c?.note) use('line &name label="…"');
    if (d.off) use('line off');
    // (a stepped table of names that declares taps: decision 016)
    if ([...(compiled.taps?.values() ?? [])].includes(d.name)) use('line &parts step=&bar &a &b');
    if (d.lambda) use('reference &( … )');
    // attributes
    if (d.over) {
      use('attribute over');
      ref(d.over);
    }
    if (d.step) use(d.step.whole ? 'attribute loop' : 'attribute step');
    for (const [k, v] of [
      ['shift', d.shift],
      ['stride', d.stride],
      ['map', d.map],
      ['show', d.show],
      ['label', d.label],
      ['env', d.env],
      ['pitch', d.pitch ?? d.paramCells?.pitch],
      ['cycle', d.cycle],
      ['size', d.size],
      ['laps', d.laps],
      ['chance', d.chance],
      ['seed', d.seed],
      ['title', d.title],
      ['tags', d.tags],
      ['about', d.about],
      ['rung', d.rung],
    ] as const)
      if (v !== null && v !== undefined) use(`attribute ${k}`);
    if (d.env) ref(d.env);
    if (d.pitch) ref(d.pitch);
    for (const r of d.about ?? []) ref(r);
    // parameters
    for (const k of [...Object.keys(d.params), ...Object.keys(d.paramCells ?? {}), ...Object.keys(d.paramClocks ?? {})]) if (k !== 'pitch') use(`parameter ${k}`);
    for (const pc of Object.values(d.paramCells ?? {})) for (const r of pc.factors) ref(r);
    for (const st of Object.values(d.paramClocks ?? {})) if (st.kind === 'driven') ref(st.driver);
    // step= and loop=
    const st = d.step;
    if (st?.kind === 'rate') {
      use(st.free ? 'rate step=free(r, lo..hi)' : 'rate step=r');
      const unit = st.free ? st.free.unit : UNIT_AFTER.exec(textOf(st.span))?.[1];
      if (unit) use(`rate n${unit}`);
    } else if (st?.kind === 'env') use('rate loop=NAME');
    else if (st?.kind === 'driven') {
      use(st.cycle ? 'rate step=cycle(&x)' : 'rate step=&x');
      if (st.chain.length) use('rate step=&x*n');
      ref(st.driver);
    }
    // map=
    const m = d.map;
    if (m?.kind === 'table') {
      use('map map=&table');
      ref(m.table);
    } else if (m?.kind === 'edo') use(/^ed\(/.test(textOf(m.span)) ? 'map map=ed(r)' : 'map map=edo');
    else if (m) use(`map map=${m.kind === 'adsr' ? 'adsr a d s r' : m.kind}`);
    // free(…)
    for (const f of d.frees ?? []) {
      if (f.labels) use('free free(v, lo..hi, "names")');
      else if (f.text !== undefined) use('free free("text")');
      else if (f.key === 'gain') use('mix free(v, lo..hi)');
      else if (!TEMPO_MARKINGS.test(textOf(f.span))) use('free free(v, lo..hi)');
      if (f.key === 'step' || f.key === 'loop') {
        use('rate step=free(r, lo..hi)');
        if (f.unit) use(`rate n${f.unit}`);
      }
    }
    // the braid
    const groove = !!grooves?.cells.has(d.name);
    if (d.braid.kind === 'list') for (const t of d.braid.tokens) token(t, groove, d.map?.kind === 'sample');
  }
  return used;
}
