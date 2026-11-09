import { describe, expect, it } from 'vitest';
import { coreFold, FAMILIES, interfaceOf, LEFT, meaningfulNames, minify, stillWritten, toCore } from '.';
import { normalise } from '../normalise';
import { soundsIdentical } from '../sameness';
import { compileSource } from '../compile';
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
    ['from', `${BAR}\n&bd from gm_kit\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`, '&bd note=36 s=sine'],
    [
      'copies',
      `&bar base=&grouping step=&tempo\n&grouping meter("4/4")\n&tempo step=2\n&t step=8n 0 2 4\n&v s=sine loop=C4\n&out map=sample [&t * &v]`,
      '&bar meter("4/4") step=&tempo',
    ],
    ['meters', `&bar meter("4/4", 2) step=&tempo\n&tempo step=2\n&t step=8n 0 2 4\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&bar meter("*.-.+.-.")'],
    ['chains', `${BAR}\n&t step=pulse*2*2 0 2\n&u step=pulse*1 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v, &u * &v]`, '&t step=pulse*4 0 2\n&u step=pulse 0 2'],
    [
      'sliders',
      `&bar meter("4/4") step=&tempo\n&tempo step=free(120bpm, 90..150)\n&t step=8n 0 2 4\n&v s=sine loop=C4\n&out map=sample [&t * &v]`,
      '&tempo step=free(2, 1.5..2.5, unit=bpm)',
    ],
    ['taps', `${BAR}\n&t step=16n 0 2 4 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&t step=pulse*4 0 2 4 5'],
    ['counts', '&t step=4 0 0 0 2 [4 4] ~ ~ 5*2\n&v s=sine loop=C4\n&out map=sample [&t * &v]', '&t step=4 0!3 2 [4!2] ~!2 [5!2]'],
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

// #545: a signature is written as its levels with the step's note value where the levels alone read another step, and
// left as written where even that is another meter (6/4's quarters, and a half's under x/2 at 2, grade `-`, which written
// starts a beat). Every signature the rule names at 1, 2 and 3 steps a pulse, under a quarter tap and a beat tap: each
// rewrite plays the same, and only those stay as written.
describe('de-sugar meters: every signature, written as levels that play the same, or left (#545)', () => {
  const SIGS = [
    '2/4',
    '3/4',
    '4/4',
    '5/4',
    '7/4',
    '6/4',
    '9/4',
    '12/4',
    '2/2',
    '3/2',
    '4/2',
    '3/8',
    '5/8',
    '6/8',
    '7/8',
    '8/8',
    '9/8',
    '10/8',
    '11/8',
    '12/8',
    '13/8',
    '16/8',
    '6/16',
    '2+2+3',
  ];
  const LEFT = ['6/4', '9/4', '12/4']
    .flatMap((sig) => [`meter("${sig}")`, `meter("${sig}", 2)`, `meter("${sig}", 3)`])
    .concat(['meter("2/2", 2)', 'meter("3/2", 2)', 'meter("4/2", 2)']);
  const written = SIGS.flatMap((sig) => [`meter("${sig}")`, `meter("${sig}", 2)`, `meter("${sig}", 3)`]);
  const text = (meter: string) => `&bar ${meter} step=60bpm\n&t step=4n 0 2 4 7 4 2\n&u step=&bar:beat 0 7\n&v s=sine loop=C4\n&out map=sample [&t * &v, &u * &v]`;
  it.each(written)('%s', (meter) => {
    const after = family('meters')(text(meter), O);
    if (LEFT.includes(meter)) expect(after).toBe(text(meter));
    else {
      expect(after.split('\n')[0]).toMatch(/^&bar meter\("[*+\-.,]+"(, [0-9]+n)?\) step=60bpm$/);
      expect(soundsIdentical(text(meter), after, undefined, O)).toBe(true);
    }
  });
  it('writes the step’s note value where the levels alone read another: 2/2 in halves, 6/16 in sixteenths', () => {
    expect(family('meters')(text('meter("2/2")'), O).split('\n')[0]).toBe('&bar meter("*+", 2n) step=60bpm');
    expect(family('meters')(text('meter("6/16")'), O).split('\n')[0]).toBe('&bar meter("*..+..", 16n) step=60bpm');
    expect(family('meters')(text('meter("4/4")'), O).split('\n')[0]).toBe('&bar meter("*-+-") step=60bpm');
  });
});

describe('minify: the names that mean something besides themselves are kept', () => {
  it('a drum’s name is kept; a cell that draws, and one that splices it, are renamed as any other and draw as they did (#481)', () => {
    const text = `${BAR}\n&a1 0 2? 4\n&arp step=8n &a1 &a1\n&hh note=42 s=white\n&kick note=36 s=sine loop=A1\n&hat step=8n &hh ~ &kick ~\n&v s=sine loop=C4\n&out map=sample [&arp * &v, &hat]`;
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
    const text = `${BAR}\n&bd note=36 s=sine loop=A1\n&rim note=37 s=square loop=C5\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`;
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

describe('keys in the core: the mode as its table, the tonic a cell read (decision 069, keys (a))', () => {
  const O2 = { resolve: resolveSeed };
  const fam = FAMILIES.find((f) => f.key === 'keys')!.rewrite;
  const at = (key: string, tune = '&tune over=&key step=8n 0 2 4 5 7 6 -1 9') => `&bar meter("4/4") step=120bpm\n${key}\n${tune}\n&v s=sine loop=C4\n&out map=sample [&tune * &v]`;
  it.each([
    ['a tonic cell', at('&key scale(minor, &tonic)\n&tonic step=1m/2 D F'), ['&key scale(&_m1, &tonic)', '&_m1 0 2 3 5 7 8 10']],
    ['a tonic written', at('&key scale(dorian, D)'), ['&key scale(&_m1, 2)', '&_m1 0 2 3 5 7 9 10']],
    ['a mode read from a cell', at('&mode lydian\n&key scale(&mode, &tonic)\n&tonic C'), ['&key scale(&_m1, &tonic)', '&_m1 0 2 4 6 7 9 11']],
    ['a key after over=, unnamed', at('&x 0', '&tune over=scale(major, G) step=8n 0 2 4 5'), ['&tune over=&_k1 step=8n', '&_k1 scale(&_m1, 7)', '&_m1 0 2 4 5 7 9 11']],
  ])('%s', (_, text, written) => {
    const after = fam(text, O2);
    for (const w of written) expect(after).toContain(w);
    expect(soundsIdentical(text, after, undefined, O2)).toBe(true);
  });
});

describe('a slider in the core: its numbers a second, its unit an argument (decision 069, sliders (a))', () => {
  const at = (tempo: string) => `&bar meter("4/4") step=&tempo\n&tempo step=${tempo}\n&t step=8n 0 2 4 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
  const frees = (text: string) =>
    compileSource(text)
      .cells.get('tempo')
      ?.frees.map(({ span: _, ...f }) => f);
  it('free(2, 1.5..2.5, unit=bpm) is the slider free(120bpm, 90..150) makes, and plays the same; a marking too', () => {
    expect(frees(at('free(2, 1.5..2.5, unit=bpm)'))).toEqual(frees(at('free(120bpm, 90..150)')));
    expect(soundsIdentical(at('free(120bpm, 90..150)'), at('free(2, 1.5..2.5, unit=bpm)'))).toBe(true);
    const marking = FAMILIES.find((f) => f.key === 'sliders')!.rewrite(at('free(andante)'), {});
    // (andante: 76–108 bpm, from 92)
    expect(marking).toContain(`free(${92 / 60}, ${76 / 60}..${108 / 60}, unit=bpm)`);
    expect(soundsIdentical(at('free(andante)'), marking)).toBe(true);
  });
  it('the unit is said once, and only on a rate', () => {
    const said = (text: string) => compileSource(text).diagnostics.map((d) => d.message);
    expect(said(at('free(120bpm, 90..150, unit=bpm)'))).toContain(
      'free(…bpm, …, unit=bpm): the unit is given twice — written after the number, or as unit= with the numbers a second',
    );
    expect(said(at('free(2, 1..3, unit=furlongs)'))[0]).toMatch(/^unit=furlongs: a rate's unit/);
    expect(said('&v s=sine loop=C4 lpf=free(800, 200..2000, unit=bpm)\n&t step=2 0\n&out map=sample [&t * &v]')).toEqual(['unit=: a unit is for a rate (step=, loop=)']);
  });
});

describe('gates, pitch= and what nothing reads, in the core (decision 069 §2, #482)', () => {
  const after = (key: string, text: string) => {
    const out = family(key)(text, O);
    expect(soundsIdentical(text, out, undefined, O)).toBe(true);
    expect(family(key)(out, O)).toBe(out);
    return out;
  };
  it('a note and a label go, and a braid that runs on past its line stays whole', () => {
    const text = `${BAR}\n&n label="the tune" about=&t\n&t step=8n label="tune" [0] [\n     2,4] 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
    expect(after('inert', text)).toBe(`${BAR}\n&t step=8n [0] [\n     2,4] 5\n&v s=sine loop=C4\n&out map=sample [&t * &v]`);
  });
  it('a gate is its products: its notes moved, its level, each receiver, one entry each, over a mix written on lines', () => {
    const text = `${BAR}\n&t step=8n 0 2 4\n&acc .5 1\n&g play=&t^$-12 level=&acc*.4 [&a, &b]\n&a s=sine loop=C4\n&b s=tri loop=C4\n&out map=sample [&g,\n  &t * &a * .1]`;
    expect(after('gates', text)).toBe(
      `${BAR}\n&t step=8n 0 2 4\n&acc .5 1\n&a s=sine loop=C4\n&b s=tri loop=C4\n&out map=sample [(&t + -12) * &acc * .4 * &a, (&t + -12) * &acc * .4 * &b,\n  &t * &a * .1]`,
    );
  });
  it('a role goes and its gate is its products; kept by the interface, both stay (decision 077)', () => {
    const text = `${BAR}\n&t step=8n 0 2 4\n&g play=&t &a\n&lead map=role &g\n&a s=sine loop=C4\n&out map=sample [&g]`;
    expect(after('gates', text)).toBe(`${BAR}\n&t step=8n 0 2 4\n&a s=sine loop=C4\n&out map=sample [&t * &a]`);
    expect(family('gates')(text, { ...O, keep: new Set(['lead', 'g']) })).toBe(text);
  });
  it('a gate over a kit is its notes read through the kit, its level a factor; the others are products', () => {
    const text = `${BAR}\n&t step=8n 0 1\n&g play=&t level=.5 &k\n&h play=&t &a\n&k &a &b\n&a s=sine loop=C4\n&b s=tri loop=C4\n&out map=sample [&g, &h]`;
    expect(after('gates', text)).toBe(`${BAR}\n&t step=8n 0 1\n&g over=&k step=8n 0 1\n&k &a &b\n&a s=sine loop=C4\n&b s=tri loop=C4\n&out map=sample [&g * .5, &t * &a]`);
  });
  it('a voice’s pitch= is a sum in the product it is in: added to its notes, never to a cell read inside another', () => {
    const text = `${BAR}\n&t step=8n 0 2 4\n&vib map=lin loop=5 0 .1 0 -.1\n&a s=sine loop=C4 pitch=&vib\n&out map=sample [&t * &(map=amp step=cycle(&t) 1 .5) * &a]`;
    expect(after('pitch', text)).toBe(
      `${BAR}\n&t step=8n 0 2 4\n&vib map=lin loop=5 0 .1 0 -.1\n&a s=sine loop=C4\n&out map=sample [(&t + &vib) * &(map=amp step=cycle(&t) 1 .5) * &a]`,
    );
  });
  it('a pitch written in place stays', () => {
    const text = `${BAR}\n&t step=8n 0 2 4\n&a s=sine loop=C4 pitch=&(map=lin loop=5 0 .1 0 -.1)\n&out map=sample [&t * &a]`;
    expect(family('pitch')(text, O)).toBe(text);
  });
});

describe('Core.left reports only what is left (decision 077)', () => {
  const left = (text: string) => LEFT.filter((l) => stillWritten(l, text)).map((l) => l.key);
  it('a tape’s read head, a [ ] kept as dilate and a count are core; x*n, <a b> and a euclid are not yet', () => {
    expect(left('&h play=&g at=.375 wander=.06')).toEqual([]);
    expect(left('&t step=pulse*2 0 [2 4] 5')).toEqual([]);
    expect(left('&t step=pulse*2 &d!2 0!3')).toEqual([]);
    expect(left('&t step=pulse*2 0 2*2')).toEqual(['subsequences']);
    expect(left('&t step=pulse*2 0 <2 4>')).toEqual(['subsequences']);
    expect(left('&t step=pulse*2 [0 2(3,8)] 4')).toEqual(['subsequences']);
    expect(left('&t step=pulse*2 euclid(5, 16)')).toEqual(['subsequences']);
    expect(left('&g play=&t &v')).toEqual(['gates']);
  });
});

describe('the core up to an interface (decision 077 §2)', () => {
  const score = `${BAR}\n&t step=pulse*2 0 2 4\n&g play=&t &v\n&lead map=role &g\n&v s=sine loop=C4\n&out map=sample [&g]`;
  const performers = (text: string) => (compileSource(text, undefined, O).performers ?? []).map((p) => p.name);
  it('an interface names cells: a list, the roles and the gates each lists, a signature’s heads and parameters', () => {
    expect([...interfaceOf(score, ['&tempo', 'v', 'nowhere'])]).toEqual(['tempo', 'v']);
    expect([...interfaceOf(score, 'roles')]).toEqual(['lead', 'g']);
    expect([...interfaceOf(score, ['lead'])]).toEqual(['lead', 'g']);
    expect([...interfaceOf('&bass, &out from (&level) &line\n&bass 0\n&out 1\n&level .8', 'signature')].sort()).toEqual(['bass', 'level', 'out']);
  });
  it('with none, the core is what plays: no role, no performer; up to its roles, both stay, by name', () => {
    const none = toCore(score, O).source;
    expect(performers(none)).toEqual([]);
    expect(none).not.toMatch(/map=role/);
    const roles = toCore(score, { ...O, interface: 'roles' }).source;
    expect(performers(roles)).toEqual(['g']);
    expect(roles).toMatch(/^&lead map=role &g$/m);
    for (const t of [none, roles]) expect(soundsIdentical(score, t, undefined, O)).toBe(true);
  });
  it('a piece up to its tempo keeps &tempo, and nothing else of its names', () => {
    const core = toCore(score, { ...O, interface: ['&tempo'] }).source;
    expect(core).toMatch(/step=&tempo\b/);
    expect(core).not.toMatch(/&lead|&out\b/);
  });
  it('narrowing: cored up to its roles, then to nothing, is cored to nothing', () => {
    const roles = toCore(score, { ...O, interface: 'roles' }).source;
    expect(toCore(roles, O).source).toBe(toCore(score, O).source);
  });
});

describe('repetition is a count (decision 077 §3)', () => {
  const counts = family('counts');
  it('a run, a run with a count, at any depth; a run of rests ~!n; x*n as [x!n]', () => {
    expect(counts('&t step=2 0 0 0 2', O)).toBe('&t step=2 0!3 2');
    expect(counts('&t step=2 0!2 0 ~ ~ ~', O)).toBe('&t step=2 0!3 ~!3');
    expect(counts('&t step=2 [2 2 4] 0@2 0@2', O)).toBe('&t step=2 [2!2 4] 0@2!2');
    expect(counts('&t step=2 0 2*3', O)).toBe('&t step=2 0 [2!3]');
  });
  it('as written: a cell read by its units, one counting its laps, a map’s arguments, a splice in brackets, a generator', () => {
    for (const t of ['&j step=4 &a &a 4\n&o [&j[<<]]', '&t step=2 cycle=8 0 0', '&e map=adsr 0 .04 0 0', '&t step=2 [&sd &sd] &sd*3', '&bar meter("*-+-") step=2'])
      expect(counts(t, O)).toBe(t);
  });
});

describe('the mechanical rows (decision 077, #581 rung 4)', () => {
  const exact = (key: string, text: string, written: string) => {
    const out = family(key)(text, O);
    expect(out).toContain(written);
    expect(soundsIdentical(text, out, undefined, O)).toBe(true);
    expect(family(key)(out, O)).toBe(out);
  };
  const play = (lines: string) => `${BAR}\n${lines}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
  it('a euclid as its steps', () => exact('euclids', play('&t step=pulse*4 euclid(3, 8)'), '&t step=pulse*4 0 ~ ~ 0 ~ ~ 0 ~'));
  it('a copy’s braid over its base’s steps: kept and moved, held, replaced, the rest after', () =>
    exact('copy steps', play('&e 0 -1 0@2 -5@2 -4@2\n&f base=&e^$7 =!2 =@4 9\n&t step=pulse*2 &e &f'), '&f 7 6 7@4 9 3@2'));
  it('x*n of a splice as n of it in brackets', () => {
    const t = `${BAR}\n&sd note=38 s=white env=&(map=adsr 0 .1 0 .01)\n&t step=pulse*2 &sd &sd*3\n&out map=sample [&t]`;
    exact('splice subdivisions', t, '&t step=pulse*2 &sd [&sd &sd &sd]');
  });
  it('a voice’s pitch= in a product whose pitch is a sum: one more term of it', () => {
    const t = `${BAR}\n&t step=pulse*2 0 2 4\n&u step=pulse 0 7\n&vib map=lin loop=5 0 .1 0 -.1\n&a s=sine loop=C4 pitch=&vib\n&out map=sample [(&t + &u) * &a]`;
    exact('pitch', t, '[(&t + &u + &vib) * &a]');
  });
});
