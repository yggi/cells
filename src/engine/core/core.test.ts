import { describe, expect, it } from 'vitest';
import { coreFold, FAMILIES, meaningfulNames, minify, toCore } from '.';
import { normalise } from '../normalise';
import { soundsIdentical } from '../sameness';
import { LIBRARY, resolveSeed } from '../../repository/library';

// The core of a text (decision 069, #482): each pass on a small text, sounding identical; the properties over every
// example are core.slow.test.ts's.
const O = { resolve: resolveSeed, library: LIBRARY };
const family = (key: string) => FAMILIES.find((f) => f.key === key)!.rewrite;
const BAR = '&bar meter("4/4") step=&tempo\n&tempo step=120bpm';

describe('de-sugar: each family’s rewrite plays the same (S1), and a second finds nothing more', () => {
  const cases: [string, string, string][] = [
    ['units', `${BAR}\n&t step=8n 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&tempo step=2'],
    ['note names', '&t step=2 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]', 'loop=261.6255653005986'],
    ['unnamed cells', '&t step=2 0 2\n&v s=sine loop=C4 env=&(map=adsr .01 .2 0 0)\n&out map=sample [&t * &v]', '&_c1 map=adsr .01 .2 0 0'],
    ['repeats', '&t step=4 0!3 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]', '&t step=4 0 0 0 2'],
    ['scans', '&major scan(2 2 1 2 2 2 1)\n&t over=&major step=2 0 2 4 6\n&v s=sine loop=C4\n&out map=sample [&t * &v]', '&major 0 2 4 5 7 9 11'],
    ['from', `${BAR}\n&bd from gm_kit\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`, '&bd s=sine'],
    [
      'copies',
      `&bar base=&grouping step=&tempo\n&grouping meter("4/4")\n&tempo step=2\n&t step=8n 0 2 4\n&v s=sine loop=C4\n&out map=sample [&t * &v]`,
      '&bar meter("4/4") step=&tempo',
    ],
    ['meters', `&bar meter("4/4", 2) step=&tempo\n&tempo step=2\n&t step=8n 0 2 4\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&bar meter("*.-.+.-.")'],
    ['chains', `${BAR}\n&t step=pulse*2*2 0 2\n&u step=pulse*1 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v, &u * &v]`, '&t step=pulse*4 0 2\n&u step=pulse 0 2'],
    ['taps', `${BAR}\n&t step=16n 0 2 4 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&t step=pulse*4 0 2 4 5'],
    ['subsequences', `${BAR}\n&t step=8n 0 [2 4] 5 7*2\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&t step=8n*2 0@2 2 4 5@2 7 7'],
  ];
  it.each(cases)('%s', (key, text, written) => {
    const after = family(key)(text, O);
    expect(after).toContain(written);
    expect(soundsIdentical(text, after, undefined, O)).toBe(true);
    // (and a second time finds nothing more)
    expect(family(key)(after, O)).toBe(after);
  });

  it('a slider keeps its unit, a label its words, and a cell read by its units its repeats', () => {
    const slider = `&tempo step=free(100bpm, 70..140)`;
    expect(family('units')(slider, O)).toBe(slider);
    const label = '&n label="&( … ) is a cell without a name"';
    expect(family('unnamed cells')(label, O)).toBe(label);
    const turned = '&a 0 2\n&j step=4 &a!2 4\n&v s=sine loop=C4\n&out map=sample [&j * &v, &j[<<] * &v]';
    expect(family('repeats')(turned, O)).toBe(turned);
  });
});

describe('minify: the names that mean something besides themselves are kept', () => {
  it('a drum’s name is kept; a cell that draws, and one that splices it, are renamed as any other and draw as they did (#481)', () => {
    const text = `${BAR}\n&a1 0 2? 4\n&arp step=8n &a1 &a1\n&hh s=white\n&kick s=sine loop=A1\n&hat step=8n &hh ~ &kick ~\n&v s=sine loop=C4\n&out map=sample [&arp * &v, &hat]`;
    expect([...meaningfulNames(text)].sort()).toEqual(['hh', 'kick']);
    const min = minify(text);
    expect(min).not.toMatch(/&hat\b|&v\b|&out\b|&a1\b|&arp\b/);
    for (const kept of ['&hh', '&kick']) expect(min).toContain(kept);
    expect(soundsIdentical(text, min, undefined, O)).toBe(true);
  });
});

describe('the core fold: Shorten’s core kinds, and the lines nothing reads, each checked', () => {
  it('the core fold takes only Shorten’s core kinds, each checked: it writes no run back', () => {
    const text = '&t step=4 0 0 0 0 2 2 2 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]';
    const { source, steps } = coreFold(text, O);
    expect(source).not.toContain('!');
    expect(steps.every((s) => !s.startsWith('Runs'))).toBe(true);
  });

  it('a fragment’s line that nothing reads and nothing plays goes; one that plays by itself stays', () => {
    const text = `${BAR}\n&bd s=sine loop=A1\n&rim s=square loop=C5\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`;
    const { source, steps } = coreFold(text, O);
    expect(source).not.toMatch(/^&rim/m);
    expect(steps).toContain('&rim is read by nothing and plays nothing: gone');
    expect(soundsIdentical(text, source, undefined, O)).toBe(true);
  });
});

describe('toCore: Normalise, de-sugar, fold, minify, until nothing changes', () => {
  const piece = (bar: string, kit: string, v: string) =>
    `${bar}\n&tempo step=120bpm\n${kit}\n&beat step=8n &bd ~ &hh ~ &bd &bd &hh ~\n&t step=4n 0 2 4\n${v}\n&mix [&beat * .6, &t * &v]`;
  it('the core of texts Normalise makes alike is one: an alias, the narrowest from, a 4/4 written as a scan; the seed meter sounds as one', () => {
    const core = (bar: string, kit: string, v: string) => toCore(piece(bar, kit, v), O).source;
    const one = core('&bar meter("4/4") step=&tempo', '&bd, &hh from gm_kit', '&v s=saw lpf=800 loop=C4');
    expect(core('&bar meter("4/4") step=&tempo', '&bd, &hh from gm_kit', '&v s=saw cutoff=800 loop=C4')).toBe(one);
    expect(core('&bar meter("4/4") step=&tempo', '* from gm_kit', '&v s=saw lpf=800 loop=C4')).toBe(one);
    expect(core('&bar scan(1 1 1 1) step=&tempo', '&bd, &hh from gm_kit', '&v s=saw lpf=800 loop=C4')).toBe(one);
    // (the seed meter is a template, #507: its core writes its lines in, `base=` and a straight swing, which the compile
    //  tool doesn't fold yet (#482); it sounds as the bar written by hand)
    expect(soundsIdentical(core('&bar from meter &tempo', '&bd, &hh from gm_kit', '&v s=saw lpf=800 loop=C4'), one, undefined, O)).toBe(true);
  });
  it('plays the same, is its own core, and says which rows it hasn’t rewritten yet', () => {
    const text = piece('&bar meter("4/4") step=&tempo', '* from gm_kit', '&v s=saw cutoff=800 loop=C4');
    const c = toCore(text, O);
    expect(soundsIdentical(text, c.source, undefined, O)).toBe(true);
    expect(toCore(c.source, O).source).toBe(c.source);
    expect(toCore(normalise(text, O).source, O).source).toBe(c.source);
    expect(c.source).not.toMatch(/from|bpm|loop=C4|#/);
    expect(c.left.map((l) => l.key)).toEqual([]);
    expect(c.source).toMatch(/meter\("\*-\+-"\)/);
    expect(c.source).toMatch(/step=pulse\*2 /);
  });
});

// Decision 069 §2 and §4, as measured for the owner on #441: a tap is its pulse with a chain, a subsequence the chain on
// its own tap, under a swing too: a division is placed where a tap of it plays (#15, amending §4).
describe('taps and subsequences in the core (decision 069)', () => {
  const piece = (meter: string, extra: string, line: string) =>
    `&bar meter("${meter}") step=&tempo ${extra}\n&tempo step=100bpm\n&t ${line}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
  const alike = (meter: string, extra: string, a: string, b: string) => soundsIdentical(piece(meter, extra, a), piece(meter, extra, b), 20);
  const scale = '0 2 4 5 7 9 11 12';
  it.each([
    ['4/4', '', '16n', 'pulse*4'],
    ['4/4', 'swing=8n:.67', '8n', 'pulse*2'],
    ['7/8', 'swing=16n:.6', '16n', 'pulse*2'],
    ['6/8', '', '4n.', 'pulse/3'],
    ['4/4', 'legato=16n:.5,8n:.9', '8n', 'pulse*2'],
    ['4/4', '', '1m', 'pulse/4'],
  ])('%s %s: step=%s is step=%s', (meter, extra, tap, pulse) => expect(alike(meter, extra, `step=${tap} ${scale}`, `step=${pulse} ${scale}`)).toBe(true));

  it('a subsequence is the chain on its own tap: in 4/4, under a swing that holds it, and in 7/8’s unequal beats', () => {
    expect(alike('4/4', '', 'step=8n 0 [2 4] 5 7', 'step=8n*2 0@2 2 4 5@2 7@2')).toBe(true);
    expect(alike('4/4', 'swing=8n:.67', 'step=4n 0 [2 4] 5 7', 'step=4n*2 0@2 2 4 5@2 7@2')).toBe(true);
    expect(alike('7/8', 'swing=8n:.6', 'step=beat 0 [2 4] 5', 'step=beat*2 0@2 2 4 5@2')).toBe(true);
    // (no note value is half of 7/8's unequal beats)
    expect(alike('7/8', '', 'step=beat 0 [2 4] 5', 'step=8n 0@2 2 4 5@2')).toBe(false);
  });

  it('where the meter sets legato by level, the line states what it played', () => {
    expect(alike('4/4', 'legato=16n:.5,8n:.9', 'step=8n 0 [2 4] 5 7', 'step=8n*2 0@2 2 4 5@2 7@2')).toBe(false);
    expect(alike('4/4', 'legato=16n:.5,8n:.9', 'step=8n 0 [2 4] 5 7', 'step=8n*2 legato=.9 0@2 2 4 5@2 7@2')).toBe(true);
  });

  it('under a swing, a subsequence is the chain on its tap too: thirds of a swung eighth are 8n*3 and 16t, of a beat 4n*3 and 8t (#15)', () => {
    for (const tap of ['step=8n*3', 'step=16t']) expect(alike('4/4', 'swing=8n:.67', 'step=8n 0 [2 4 5] 7', `${tap} 0@3 2 4 5 7@3`)).toBe(true);
    for (const tap of ['step=4n*3', 'step=8t']) expect(alike('4/4', 'swing=8n:2/3', 'step=4n 0 [2 4 5] 7', `${tap} 0@3 2 4 5 7@3`)).toBe(true);
    expect(alike('4/4', '', 'step=8n 0 [2 4 5] 7', 'step=8n*3 0@3 2 4 5 7@3')).toBe(true);
  });
});

describe('taps and subsequences, as the program reads them (decision 069 §2, §4)', () => {
  const O2 = { resolve: resolveSeed };
  const fam = (key: string) => FAMILIES.find((f) => f.key === key)!.rewrite;
  const at = (meter: string, line: string) => `&bar meter("${meter}") step=&tempo\n&tempo step=100bpm\n&t ${line}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
  it.each([
    ['7/8', 'step=16n 0 2 4', 'step=pulse*2 0 2 4'],
    ['6/8', 'step=4n. 0 2', 'step=pulse/3 0 2'],
    ['4/4', 'step=1m 0 2', 'step=pulse/4 0 2'],
    ['4/4', 'step=8t 0 2 4', 'step=pulse*3 0 2 4'],
    ['4/4', 'step=16n*2 0 2', 'step=pulse*4*2 0 2'],
  ])('%s: %s is written %s, and plays the same', (meter, written, core) => {
    const text = at(meter, written);
    const after = fam('taps')(text, O2);
    expect(after).toContain(`&t ${core}`);
    expect(soundsIdentical(text, after, undefined, O2)).toBe(true);
  });

  it('a subsequence stays where a finer grid would change what the line plays: it draws, it is spliced, it is read by its units', () => {
    for (const text of [
      at('4/4', 'step=8n 0 [2? 4] 5'),
      `${BAR}\n&m 0 [2 4]\n&t step=8n &m 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`,
      `${BAR}\n&t step=8n 0 [2 4] 5\n&v s=sine loop=C4\n&out map=sample [&t * &v, &t[<<] * &v]`,
    ])
      expect(fam('subsequences')(text, O2)).toBe(text);
  });
});
