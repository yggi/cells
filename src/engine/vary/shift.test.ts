// One slot moved n degrees, the shift every level shares (#910, decision 052 point 11): a note of a pitched line, a chord
// of a progression (whose `third` is its shift by a third), a letter of a form on a grid (a sequence, `&a` to `&a^n`).
// Asked by name, so no level's list moves. Each compiles, plays other notes than its source and the others, moves the
// one slot it names by the degrees it names and no other, keeps the level's fixed slots, and is given back by its `by:`.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { flatten } from '../flatten';
import { codeShifts } from '../program';
import { resolveSeed } from '../../repository/library';
import { seedFragments } from '../../repository/seed';
import { fixedStepsOf, HARMONY_OPERATORS, SHIFT, variationBy, variations, type Variation, type VaryOptions } from '.';

const KEY = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const FORM = `${KEY}\n&a over=&key step=8n 0 2 4 2\n&call over=&key step=8n 7 5 3 1`;
const HARMS = ['&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]', '&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]'];
const BASS = (harm: string) => `${KEY}\n${harm}\n${seedFragments('instruments').find((f) => f.id === 'bass')!.text}`;
const SHIFTS = { operators: [SHIFT] };

/** A cell's events as they play: onset, length, and degree. */
const eventsOf = (text: string, cell: string) => {
  const result = compileSource(text, undefined, { resolve: resolveSeed });
  if (!result.ok) throw new Error(`does not compile:\n${text}`);
  return flatten(result, cell, codeShifts(result)).map((e) => ({ step: e.step, duration: e.duration, value: e.value + (e.transpose ?? 0) }));
};
const played = (text: string, cell: string) =>
  eventsOf(text, cell)
    .map((e) => `${e.step}:${e.duration}:${e.value}`)
    .join(' ');

/** Each variation plays other notes than its source and the ones before it, and is given back by its `by:`. */
function distinctAndReplayed(text: string, all: readonly Variation[], options: VaryOptions, bench: string, cell: (v: Variation) => string) {
  const heard = new Set<string>();
  for (const v of all) {
    expect(variationBy(text, v.by, options)?.after, v.by).toBe(v.after);
    const c = cell(v);
    heard.add(played(`${bench}\n${text}`, c));
    const notes = played(`${bench}\n${v.apply(text)}`, c);
    expect(heard.has(notes), v.by).toBe(false);
    heard.add(notes);
  }
}

describe('a progression’s third is its shift by a third', () => {
  it.each(seedFragments('harmony').map((f) => [f.id, f] as const))('%s: each third is the shift of that chord by those degrees', (_, { text }) => {
    const options = { workbench: KEY, operators: HARMONY_OPERATORS };
    for (const v of variations(text, options).filter((x) => x.rule === 'third'))
      expect(variationBy(text, v.by.replace(/^third /, 'shift '), { workbench: KEY, ...SHIFTS })?.after, v.by).toBe(v.after);
  });

  it('gives 356 shifts of the 19 seeds in C major alone, and 137 beside the harmony operators (its ±2 are their thirds)', () => {
    const count = (operators: VaryOptions['operators']) => seedFragments('harmony').reduce((n, f) => n + variations(f.text, { workbench: KEY, operators }).length, 0);
    expect(count([SHIFT])).toBe(356);
    expect(count([...HARMONY_OPERATORS, SHIFT]) - count(HARMONY_OPERATORS)).toBe(137);
  });
});

describe('a line’s note shifted', () => {
  const CASES = HARMS.flatMap((harm) => seedFragments('bass').map((f) => ({ id: `${f.id} ${harm.split(' ')[3]}`, text: f.text, bench: BASS(harm) })));

  it('gives the bass seeds 504 over both harmonies, none on a root', () => {
    let n = 0;
    for (const { text, bench } of CASES) {
      const fixed = fixedStepsOf(text, { workbench: bench })['&bassline'] ?? [];
      for (const v of variations(text, { workbench: bench, ...SHIFTS })) {
        n++;
        expect(fixed.includes(Number(v.by.split(' ')[2])), v.by).toBe(false);
      }
    }
    expect(n).toBe(504);
  });

  it.each(CASES.map((c) => [c.id, c] as const))('%s: each moves its one note by its degrees, plays other notes, and is given back', (_, { text, bench }) => {
    const options = { workbench: bench, ...SHIFTS };
    const all = variations(text, options);
    distinctAndReplayed(text, all, options, bench, () => 'bassline');
    // (its one step's written degree moved by its amount, where both are plain degrees)
    let checked = 0;
    const steps = (t: string) =>
      t
        .split('\n')
        .find((l) => l.startsWith('&bassline ') && / step=/.test(l))!
        .split(' ')
        .filter((w) => !/^(&bassline|over=|step=)/.test(w));
    for (const v of all) {
      const [, , slot, by] = v.by.split(' ').map(Number) as [number, number, number, number];
      const [before, after] = [steps(text), steps(v.apply(text))];
      const plain = (w: string) => /^-?\d+(@\d+)?$/.test(w);
      const at = (ws: string[], step: number) => {
        let s = 0;
        for (const w of ws) {
          const held = /@(\d+)$/.exec(w);
          const run = /!(\d+)$/.exec(w);
          if (step >= s && step < s + (held ? Number(held[1]) : run ? Number(run[1]) : 1)) return run ? w.replace(/!\d+$/, '') : w;
          s += held ? Number(held[1]) : run ? Number(run[1]) : 1;
        }
        return null;
      };
      const [b, a] = [at(before, slot), at(after, slot)];
      if (b && a && plain(b) && plain(a)) {
        expect(parseInt(a) - parseInt(b), v.by).toBe(by);
        checked++;
      }
    }
    expect(checked > 0 || all.length === 0).toBe(true);
  });

  it('the decision’s bass: one note a degree up, the roots on 0 and 4 kept', () => {
    const bench = '&bar meter("4/4") step=120bpm\n&key scale(minor, A)\n&harm over=&key step=2n [0,2,4] [3,5,7]';
    const bass = '&bass over=&harm step=8n 0 ~ 1 2 0 ~ 2 1\n&low s=tri loop=C2\n&mix map=sample [&bass * &low]';
    const v = variationBy(bass, 'shift &bass 2 1', { workbench: bench, ...SHIFTS })!;
    expect(v.apply(bass).split('\n')[0]).toBe('&bass over=&harm step=8n 0 ~ 2 2 0 ~ 2 1');
    expect(variations(bass, { workbench: bench, ...SHIFTS }).map((x) => x.by.split(' ')[2])).not.toContain('0');
    expect(variations(bass, { workbench: bench, ...SHIFTS }).map((x) => x.by.split(' ')[2])).not.toContain('4');
  });
});

describe('a form’s letter shifted: a sequence', () => {
  const FORMS = seedFragments('forms');

  it('gives the seed forms 52, never their first or last letter, and the song plans none', () => {
    let n = 0;
    for (const f of FORMS)
      for (const v of variations(f.text, { workbench: FORM, ...SHIFTS })) {
        n++;
        const slot = Number(v.by.split(' ')[2]);
        expect(fixedStepsOf(f.text, { workbench: FORM })[v.line], v.by).not.toContain(slot);
      }
    expect(n).toBe(52);
    for (const f of seedFragments('songs')) expect(variations(f.text, { workbench: '&bar meter("4/4") step=120bpm\n&song .55', resolve: resolveSeed, ...SHIFTS })).toEqual([]);
  });

  it.each(FORMS.map((f) => [f.id, f] as const))('%s: each plays other notes and is given back by its by:', (_, { text }) => {
    const options = { workbench: FORM, ...SHIFTS };
    distinctAndReplayed(text, variations(text, options), options, FORM, (v) => v.line.slice(1));
  });

  it('AABA: its second A moved up two degrees, its bridge moved down one; the first and last A kept', () => {
    const aaba = FORMS.find((f) => f.id === 'AABA')!;
    const after = (by: string) =>
      variationBy(aaba.text, by, { workbench: FORM, ...SHIFTS })!
        .apply(aaba.text)
        .split('\n')[1];
    expect(after('shift &chorus 1 2')).toBe('&chorus step=8n &a &a^2 &b &a');
    expect(after('shift &chorus 2 -1')).toBe('&chorus step=8n &a &a &b^-1 &a');
    expect(variationBy(aaba.text, 'shift &chorus 1 2', { workbench: FORM, ...SHIFTS })!.reference?.form).toBe('base=&chorus = &a^2');
  });
});
