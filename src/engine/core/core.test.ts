import { describe, expect, it } from 'vitest';
import { coreFold, FAMILIES, meaningfulNames, minify, toCore } from '.';
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
    ['from', `${BAR}\n&bd from gm_kit\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`, '&bd s=sine'],
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
  it('a gate a role reads stays: the role is a performer’s part', () => {
    const text = `${BAR}\n&t step=8n 0 2 4\n&g play=&t &a\n&lead map=role &g\n&a s=sine loop=C4\n&out map=sample [&g]`;
    expect(family('gates')(text, O)).toBe(text);
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
