// One slot split in two halves, the split every level shares (#912, decision 052 point 11): a pitched line's note and its
// neighbour (an ornament, `0 [1 2] 2`), a line of hits' hit struck twice (a double, `[&hh &hh]`), a progression's chord and the next chord's secondary dominant (its `dominant` is
// this split), a form's letter on a grid and another letter of the form (`&a [&a &b] &b &a`). Asked by name. Each
// compiles, plays other notes than its source and the others, keeps the level's fixed slots, is given back by its `by:`,
// and a line split reads back: a step in halves is read, varied again, and written as it was.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { flatten } from '../flatten';
import { codeShifts } from '../program';
import { resolveSeed } from '../../repository/library';
import { seedFragments } from '../../repository/seed';
import { expand } from '../use';
import { fixedStepsOf, NEIGHBOURS, SPLIT, variationBy, variations, type Variation, type VaryOptions } from '.';

const KEY = (mode = 'major') => `&bar meter("4/4") step=120bpm\n&key scale(${mode}, C)`;
const FORM = `${KEY()}\n&a over=&key step=8n 0 2 4 2\n&call over=&key step=8n 7 5 3 1`;
const HARMS = ['&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]', '&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]'];
const BASS = (harm: string) => `${KEY()}\n${harm}\n${seedFragments('instruments').find((f) => f.id === 'bass')!.text}`;
const SPLITS = { operators: [SPLIT] };

/** A cell's events as they play: onset, length and degree. */
const played = (text: string, cell: string) => {
  const result = compileSource(text, undefined, { resolve: resolveSeed });
  if (!result.ok) throw new Error(`does not compile:\n${text}`);
  return flatten(result, cell, codeShifts(result))
    .map((e) => `${e.step}:${e.duration}:${e.value + (e.transpose ?? 0)}`)
    .join(' ');
};

/** Each variation plays other notes than its source and the ones before it, and is given back by its `by:`. */
function distinctAndReplayed(text: string, all: readonly Variation[], options: VaryOptions, bench: string, cell: (v: Variation) => string) {
  const heard = new Set<string>();
  for (const v of all) {
    expect(variationBy(text, v.by, options)?.after, v.by).toBe(v.after);
    heard.add(played(`${bench}\n${text}`, cell(v)));
    const notes = played(`${bench}\n${v.apply(text)}`, cell(v));
    expect(heard.has(notes), v.by).toBe(false);
    heard.add(notes);
  }
}

describe('a line’s note split: an ornament', () => {
  const CASES = HARMS.flatMap((harm) => seedFragments('bass').map((f) => ({ id: `${f.id} ${harm.split(' ')[3]}`, text: f.text, bench: BASS(harm) })));

  it('gives the bass seeds 236 over both harmonies, none on a root, each with a reference', () => {
    let n = 0;
    for (const { text, bench } of CASES) {
      const fixed = fixedStepsOf(text, { workbench: bench })['&bassline'] ?? [];
      for (const v of variations(text, { workbench: bench, ...SPLITS })) {
        n++;
        expect(fixed, v.by).not.toContain(Number(v.by.split(' ')[2]));
        expect(v.reference, v.by).toBeDefined();
      }
    }
    expect(n).toBe(236);
  });

  it.each(CASES.map((c) => [c.id, c] as const))('%s: each plays other notes, is given back, and reads back to be varied again', (_, { text, bench }) => {
    const options = { workbench: bench, ...SPLITS };
    const all = variations(text, options);
    distinctAndReplayed(text, all, options, bench, () => 'bassline');
    for (const v of all.filter((x) => /\[-?\d+ -?\d+\]/.test(x.after))) {
      // (a step in plain degrees reads back: its line varied again by a transposition, which keeps its halves)
      const again = variations(v.apply(text), { workbench: bench, operators: ['transpose'] });
      expect(again.length, v.by).toBeGreaterThan(0);
      expect(again[0]!.after, v.by).toMatch(/\[-?\d+ -?\d+\]/);
    }
  });

  it('the decision’s bass: a note and its neighbour above, in two halves of its step; a root never split', () => {
    const bench = '&bar meter("4/4") step=120bpm\n&key scale(minor, A)\n&harm over=&key step=2n [0,2,4] [3,5,7]';
    const bass = '&bass over=&harm step=8n 0 ~ 1 2 0 ~ 2 1\n&low s=tri loop=C2\n&mix map=sample [&bass * &low]';
    const v = variationBy(bass, 'split &bass 2 1', { workbench: bench, ...SPLITS })!;
    expect(v.apply(bass).split('\n')[0]).toBe('&bass over=&harm step=8n 0 ~ [1 2] 2 0 ~ 2 1');
    expect(v.reference?.form).toBe('base=&bass =!2 [1 2]');
    const steps = variations(bass, { workbench: bench, ...SPLITS }).map((x) => x.by.split(' ')[2]);
    expect(steps).not.toContain('0');
    expect(steps).not.toContain('4');
    expect(NEIGHBOURS).toEqual([-1, 1]);
  });
});

describe('a hit split: a double', () => {
  const DRUMS = `&bar meter("4/4") step=120bpm\n${expand('&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit', resolveSeed).trim()}`;
  const OPTIONS = { workbench: DRUMS, keep: ['&fill'], fewest: 3, resolve: resolveSeed, ...SPLITS };
  const RHYTHMS = seedFragments('rhythms');

  it('gives the 33 seed rhythms 144, never on a fixed step (a kick’s or a backbeat’s line, every step), each with a reference', () => {
    let n = 0;
    for (const f of RHYTHMS)
      for (const v of variations(f.text, OPTIONS)) {
        n++;
        expect(fixedStepsOf(f.text, OPTIONS)[v.line] ?? [], v.by).not.toContain(Number(v.by.split(' ')[2]));
        expect(v.reference, v.by).toBeDefined();
      }
    expect(n).toBe(144);
  });

  it.each(RHYTHMS.map((f) => [f.id, f] as const))('%s: each strikes its hit twice in halves of its step, plays other notes, is given back, and reads back', (_, { text }) => {
    const all = variations(text, OPTIONS);
    distinctAndReplayed(text, all, OPTIONS, DRUMS, (v) => v.line.slice(1));
    for (const v of all) {
      const step = Number(v.by.split(' ')[2]);
      const events = (t: string) => {
        const r = compileSource(`${DRUMS}\n${t}`, undefined, { resolve: resolveSeed });
        return flatten(r, v.line.slice(1), codeShifts(r)).filter((e) => Math.floor(e.step + 1e-9) === step);
      };
      const [before, after] = [events(text), events(v.apply(text))];
      expect(
        before.map((e) => e.duration),
        v.by,
      ).toEqual([1]);
      expect(
        after.map((e) => [e.step, e.duration]),
        v.by,
      ).toEqual([
        [step, 0.5],
        [step + 0.5, 0.5],
      ]);
      expect(
        after.map((e) => e.value),
        v.by,
      ).toEqual([before[0]!.value, before[0]!.value]);
      // (a groove with a step in halves reads back: varied again by the rhythm operators, its halves kept or moved whole)
      expect(variations(v.apply(text), { ...OPTIONS, operators: ['rotate', 'drop', 'add'] }).length, v.by).toBeGreaterThan(0);
    }
  });

  it('funk’s hat: its first hit struck twice, its reference a copy changed on that step', () => {
    const funk = RHYTHMS.find((f) => f.id === 'funk_drums')!;
    const v = variationBy(funk.text, 'split &hat 0', OPTIONS)!;
    expect(v.after).toMatch(/^&hat role=hat step=16n \[&hh:0:\.348751 &hh:0:\.348751\] ~ /);
    expect(v.reference?.form).toBe('base=&hat [&hh:0:.348751 &hh:0:.348751]');
  });
});

describe('a progression’s split is its dominant', () => {
  it.each(seedFragments('harmony').map((f) => [f.id, f] as const))('%s: in major and minor, each split the dominant on that step', (_, { text }) => {
    for (const mode of ['major', 'minor']) {
      const split = variations(text, { workbench: KEY(mode), ...SPLITS });
      const dominant = variations(text, { workbench: KEY(mode), operators: ['dominant'] });
      expect(split.map((v) => v.after)).toEqual(dominant.map((v) => v.after));
      expect(split.map((v) => v.by)).toEqual(dominant.map((v) => v.by.replace(/^dominant /, 'split ')));
    }
  });

  it('gives the 21 seeds 63 over C major and minor, as their dominants', () => {
    const n = ['major', 'minor'].reduce((sum, mode) => sum + seedFragments('harmony').reduce((k, f) => k + variations(f.text, { workbench: KEY(mode), ...SPLITS }).length, 0), 0);
    expect(n).toBe(63);
  });
});

describe('a form’s letter split', () => {
  const FORMS = seedFragments('forms');

  it('gives the seed forms 32, never their first or last letter, and the song plans none', () => {
    let n = 0;
    for (const f of FORMS)
      for (const v of variations(f.text, { workbench: FORM, ...SPLITS })) {
        n++;
        expect(fixedStepsOf(f.text, { workbench: FORM })[v.line], v.by).not.toContain(Number(v.by.split(' ')[2]));
      }
    expect(n).toBe(32);
    for (const f of seedFragments('songs')) expect(variations(f.text, { workbench: '&bar meter("4/4") step=120bpm\n&song .55', resolve: resolveSeed, ...SPLITS })).toEqual([]);
  });

  it.each(FORMS.map((f) => [f.id, f] as const))('%s: each plays other notes and is given back by its by:', (_, { text }) => {
    const options = { workbench: FORM, ...SPLITS };
    distinctAndReplayed(text, variations(text, options), options, FORM, (v) => v.line.slice(1));
  });

  it('AABA: its second A split with the bridge, the bridge with the A', () => {
    const aaba = FORMS.find((f) => f.id === 'AABA')!;
    const vs = variations(aaba.text, { workbench: FORM, ...SPLITS });
    expect(vs.map((v) => v.by)).toEqual(['split &chorus 1 2', 'split &chorus 2 0']);
    expect(vs[0]!.apply(aaba.text).split('\n')[1]).toBe('&chorus step=8n &a [&a &b] &b &a');
    expect(vs[0]!.reference?.form).toBe('base=&chorus = [&a &b]');
  });
});
