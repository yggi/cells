import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { shorten } from './shorten';
import swing from '../../fixtures/contracts/swing.json';
import { METER_FRAGMENTS } from '../repository/meters';

// Swing on the bar (#18, the first rung): a meter leans one level of its tree, named by note value (`swing=8n:.67`), and
// every node keeps its ends: a bar line, a beat and an odd bar never drift. Taps are placed through it.

const VOICE = '\n&v s=sine loop=C4\n&out map=sample [&x * &v]';
const compiled = (src: string) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return r;
};
const warnings = (src: string) => compileSource(src).diagnostics.map((d) => d.message);
/** Where a tap's notes fall in the first `bars` bars of a meter at 60 bpm, in pulses from the downbeat, unrounded. */
const onsets = (meter: string, tap: string, bars = 1) => {
  const r = compiled(`&bar ${meter} step=60bpm\n&x step=${tap} 0${VOICE}`);
  const bar = r.cells.get('bar')!;
  const barSeconds = bar.steps / r.clocks.get('bar')!.perSecond;
  return eventsBetween(plan(r, codeShifts(r)), 0, bars * barSeconds - 1e-6).map((e) => (e.at / barSeconds) * bar.meter!.pulses);
};
const rounded = (xs: number[]) => xs.map((x) => +x.toFixed(4));

describe('swing on the bar: one level of the meter leans, named by note value', () => {
  it('a share written as a fraction (decision 042) is that share: 8n:2/3 is 8n:.6666666666666666, 16n:31/60 is 16n:.5166666666666667, and it nests', () => {
    const share = (src: string) =>
      compiled(`&bar ${src}`)
        .cells.get('bar')!
        .meter!.swing!.map((l) => [l.level, l.share]);
    expect(share('meter("4/4") swing=8n:2/3')).toEqual(share('meter("4/4") swing=8n:.6666666666666666'));
    expect(share('meter("4/4") swing=16n:31/60')).toEqual(share('meter("4/4") swing=16n:.5166666666666667'));
    expect(share('meter("4/4") swing=8n:3/5,16n:11/20')).toEqual([
      ['8n', 0.6],
      ['16n', 0.55],
    ]);
    expect(share('meter("4/4") swing=8n:1/1')).toEqual([['8n', 1]]);
    expect(onsets('meter("4/4") swing=8n:2/3', '8n')).toEqual(onsets('meter("4/4") swing=8n:.6666666666666666', '8n'));
  });

  it('a fraction above 1 or over zero fails, at the fraction, and a fraction is a share of a level only', () => {
    const fail = (src: string) => compileSource(src).diagnostics.filter((d) => d.severity === 'error');
    const above = fail('&bar meter("4/4") swing=8n:3/2');
    expect(above.map((d) => d.message)).toEqual([expect.stringContaining('3/2 is above it')]);
    expect(above[0]!.span.col).toBe('&bar meter("4/4") swing=8n:'.length + 1);
    expect(fail('&bar meter("4/4") swing=8n:1/0').map((d) => d.message)).toEqual([expect.stringContaining('denominator')]);
    expect(fail('&bar meter("4/4") swing=8n:2/3.5')).not.toEqual([]);
  });

  it('swing=8n:.67 in 4/4: the second eighth of each beat two thirds through, every beat where it was', () => {
    expect(rounded(onsets('meter("4/4") swing=8n:.67', '8n'))).toEqual([0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67]);
    expect(rounded(onsets('meter("4/4") swing=8n:.67', 'beat'))).toEqual([0, 1, 2, 3]);
    // (whatever the meter's own steps: a bar of quarters and a bar of eighths swing alike)
    expect(onsets('meter("4/4", 2) swing=8n:.67', '8n')).toEqual(onsets('meter("4/4") swing=8n:.67', '8n'));
  });

  it('a finer division the tree holds is even within its node: 16ths under swung eighths', () => {
    expect(rounded(onsets('meter("4/4") swing=8n:.67', '16n').slice(0, 4))).toEqual([0, 0.335, 0.67, 0.835]);
  });

  it('a division the tree doesn’t hold is even within its node, not warped: triplets under swung eighths stay', () => {
    expect(rounded(onsets('meter("4/4") swing=8n:.67', '8t'))).toEqual(rounded(onsets('meter("4/4")', '8t')));
  });

  it('16th swing leans the 16ths and leaves the eighths straight', () => {
    expect(rounded(onsets('meter("4/4") swing=16n:.6', '16n').slice(0, 4))).toEqual([0, 0.3, 0.5, 0.8]);
  });

  it('a chain on a tap swings as the note value it says: step=pulse*2 in 4/4 is step=8n', () => {
    expect(onsets('meter("4/4") swing=8n:.67', 'pulse*2')).toEqual(onsets('meter("4/4") swing=8n:.67', '8n'));
  });

  it('a group of three leans its second and third eighths (Jambot’s ternary lean): 6/8, and 7/8’s first beat', () => {
    // (.67 moves the second as far as a pair's would, from a third to a half; the third halfway to the end)
    const second = 1 / 3 + (0.67 - 0.5);
    const third = (second + 1) / 2;
    const six = onsets('meter("6/8") swing=8n:.67', '8n');
    expect(six.slice(0, 3).map((x) => x / 3)).toEqual([0, second, third].map((x) => expect.closeTo(x, 12)));
    expect(six[3]).toBeCloseTo(3, 12);
    // (7/8 is 3+2+2: the group of three leans, each pair swings)
    expect(rounded(onsets('meter("7/8") swing=8n:.67', '8n'))).toEqual(rounded([0, 3 * second, 3 * third, 3, 4.34, 5, 6.34]));
    // (straight is .5: nothing moves)
    expect(onsets('meter("6/8") swing=8n:.5', '8n')).toEqual(onsets('meter("6/8")', '8n'));
  });

  it('odd bars keep their bar lines: 7/8 (3+2+2) swung .67 for 8 bars, every bar line within 1e-9 of its unswung place', () => {
    const r = compiled(`&bar meter("7/8") step=60bpm swing=8n:.67\n&x step=8n 0${VOICE}`);
    const barSeconds = r.cells.get('bar')!.steps / r.clocks.get('bar')!.perSecond;
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 8 * barSeconds - 1e-6).map((e) => e.at);
    expect(at).toHaveLength(8 * 7);
    for (let b = 0; b < 8; b++) {
      expect(Math.abs(at[b * 7] - b * barSeconds)).toBeLessThan(1e-9);
      // (and each beat: 3 + 2 + 2 eighths)
      for (const [k, pulse] of [
        [3, 3],
        [5, 5],
      ])
        expect(Math.abs(at[b * 7 + k] - (b + pulse / 7) * barSeconds)).toBeLessThan(1e-9);
    }
    // (the meter's own steps too, played: its downbeats where they were)
    const own = compiled(`&bar meter("7/8") step=60bpm swing=8n:.67\n&v s=sine loop=C4\n&out map=sample [&bar * &v]`);
    const steps = eventsBetween(plan(own, codeShifts(own)), 0, 8 * barSeconds - 1e-6).map((e) => e.at);
    for (let b = 0; b < 8; b++) expect(Math.abs(steps[b * 7] - b * barSeconds)).toBeLessThan(1e-9);
    expect(steps[1] / barSeconds).toBeCloseTo((3 * (1 / 3 + 0.17)) / 7, 9);
  });

  it('a swing on a scan swings it, through its taps and its bend', () => {
    expect(warnings(`&bar scan(1 1 1 1) step=60bpm swing=8n:.67\n&x step=8n 0${VOICE}`)).toEqual([]);
    expect(rounded(onsets('scan(1 1 1 1) swing=8n:.67', '8n'))).toEqual([0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67]);
    // (a bent bar: each beat where the scan puts it, its second eighth two thirds through it)
    expect(rounded(onsets('scan(27 23 26 24) swing=8n:.67', '8n'))).toEqual(rounded([0, 0.67 * 1.08, 1.08, 1.08 + 0.67 * 0.92, 2, 2 + 0.67 * 1.04, 3.04, 3.04 + 0.67 * 0.96]));
  });

  it('swing never moves a beat: a level no beat divides into leans nothing, and says so', () => {
    expect(warnings(`&bar meter("4/4") step=60bpm swing=4n:.67\n&x step=8n 0${VOICE}`)).toEqual([
      'swing=4n:.67 leans nothing on &bar: no beat of this meter divides into two or more of 4n (its beats: 4n 4n 4n 4n), and swing never moves a beat',
    ]);
    expect(onsets('meter("4/4") swing=4n:.67', '8n')).toEqual(onsets('meter("4/4")', '8n'));
  });

  it('a bare swing= on a meter leans its own steps’ level, with a warning, and Shorten names the level', () => {
    const bare = `&bar meter("4/4", 2) step=60bpm swing=.67\n&x step=8n 0${VOICE}`;
    expect(warnings(bare)).toEqual(["swing=.67 leans the meter cell's own steps: name the level it leans, swing=8n:.67"]);
    expect(onsets('meter("4/4", 2) swing=.67', '8n')).toEqual(onsets('meter("4/4", 2) swing=8n:.67', '8n'));
    const s = shorten(bare).find((x) => x.kind === 'swing')!;
    expect(s.after).toBe('&bar meter("4/4", 2) step=60bpm swing=8n:.67');
    expect(warnings(s.apply(bare))).toEqual([]);
    // (left free, it stays free)
    const free = bare.replace('swing=.67', 'swing=free(.5, .5..75)');
    expect(shorten(free).find((x) => x.kind === 'swing')!.after).toBe('&bar meter("4/4", 2) step=60bpm swing=8n:free(.5, .5..75)');
  });

  it('a bare swing= on beats that are the meter’s own steps is left to the author: the warning stands, Shorten offers nothing (#166)', () => {
    const bare = `&bar meter("4/4") step=120bpm swing=.67\n&x step=8n 0${VOICE}`;
    expect(warnings(bare)).toEqual(["swing=.67 leans the meter cell's own steps, and they are its beats, which swing never moves: name the level it leans, swing=8n:.67"]);
    expect(shorten(bare).find((x) => x.kind === 'swing')).toBeUndefined();
  });

  it('several levels at once nest, each node keeping its ends', () => {
    expect(rounded(onsets('meter("4/4") swing=8n:.6,16n:.55', '16n').slice(0, 4))).toEqual([0, 0.33, 0.6, 0.82]);
    expect(() => compiled(`&bar meter("4/4") step=60bpm swing=8n:free(.5, .5..75),16n:.55\n&x step=8n 0${VOICE}`)).toThrow(/one level alone/);
  });
});

describe('Jambot’s swing axis, the readers’ path of the swing contract (fixtures/contracts/swing.json)', () => {
  /** The path's vectors: 4/4, each s with its two levels' shares (`8n`, then `16n`) and where its 16ths play. */
  const path = swing.vectors.filter((v) => v.s !== undefined);
  const share = (v: (typeof path)[number], level: string) => v.swing.find((l) => l.level === level)!.share;

  it('holds s from 0 to 1 in steps of .05, each with its two levels’ shares, on 4/4', () => {
    expect(path.map((v) => v.s)).toEqual(Array.from({ length: 21 }, (_, i) => i / 20));
    expect(path.every((v) => v.name === '4/4' && v.swing.length === 2)).toBe(true);
    expect(swing.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/swing\/vectors\.json @ [0-9a-f]{7,40}$/);
  });

  it.each(path.map((v) => [v.s, v] as const))('s = %s: a 4/4 bar swung by its two shares places every 16th within 1e-9 of leanMap', (_, v) => {
    const r = compiled(`&bar meter("4/4") step=60bpm swing=8n:${share(v, '8n')},16n:${share(v, '16n')}\n&x step=16n 0${VOICE}`);
    // (a bar of 4 s: a sixteenth is a quarter of a second)
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => e.at * 4);
    expect(at).toHaveLength(16);
    at.forEach((x, k) => expect(Math.abs(x - v.onsets[k]), `the ${k}th sixteenth`).toBeLessThan(1e-9));
  });
});

describe('the pairs alone, `swing=8n:r:pairs` (#204, decision 053): a level’s pairs lean, its groups of three stay straight', () => {
  /** A meter fragment's text with its eighths' pairs leaned at 2/3: a level of its own, coarsest, beside a swing it has. */
  const pairsOn = (text: string) =>
    /swing=8n:[^ ]*/.test(text)
      ? text.replace(/swing=8n:[^ ,]*/, 'swing=8n:2/3:pairs')
      : /swing=/.test(text)
        ? text.replace('swing=', 'swing=8n:2/3:pairs,')
        : `${text} swing=8n:2/3:pairs`;
  // (a meter fragment's tempo is a hole, `step=&tempo` (#290): `onsets` writes one)
  const meterOf = (text: string) => text.replace(/^&bar /, '').replace(' step=&tempo', '');
  // Where each eighth of one bar is played, in the meter's pulses, under the meter's own text with :pairs: a pair's second
  // eighth two thirds through it, a group of three at thirds of its beat (an eighth each). Literal, one row a meter.
  const expected: Record<string, readonly number[]> = {
    '4/4': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '4/4 swung on 8n': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '4/4 leaning on 16n': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '4/4 leaning lightly on 16n': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '4/4 leaning faintly on 16n': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '4/4 alla breve': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3],
    '2/4': [0, 2 / 3, 1, 5 / 3],
    '3/4': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3],
    '6/8': [0, 1, 2, 3, 4, 5],
    '12/8': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    '5/4': [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3, 4, 14 / 3],
    '7/8': [0, 1, 2, 3, 3 + 4 / 3, 5, 5 + 4 / 3],
    '10/8': [0, 1, 2, 3, 3 + 4 / 3, 5, 6, 7, 8, 8 + 4 / 3],
  };

  it('the table holds every meter of the repository, thirteen', () => {
    expect(Object.keys(expected)).toEqual(METER_FRAGMENTS.map((f) => f.id));
    expect(METER_FRAGMENTS).toHaveLength(13);
  });

  it.each(METER_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s: its eighths with :pairs land where the table says', (id, text) => {
    const meter = meterOf(pairsOn(text));
    expect(onsets(meter, '8n')).toEqual(expected[id]!.map((x) => expect.closeTo(x, 12)));
  });

  it.each(METER_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s: a pair leans exactly as swing=8n does, a group of three exactly as straight', (_, text) => {
    const meter = meterOf(pairsOn(text));
    const pairs = onsets(meter, '8n');
    const leaned = onsets(meter.replace(':pairs', ''), '8n');
    const straight = onsets(meterOf(text).replace(/ swing=[^ ]*/, ''), '8n');
    const { beats, unit } = compiled(`&bar ${meter}`).cells.get('bar')!.meter!;
    // (each eighth by the beat it starts in: a beat of three eighths is a group of three, any other a pair or pairs)
    const starts = beats.map((_, i) => beats.slice(0, i).reduce((a, b) => a + b, 0));
    const three = (x: number) => (beats[starts.filter((s) => s <= x + 1e-9).length - 1]! * 8) / unit === 3;
    pairs.forEach((x, k) => expect(x, `eighth ${k}`).toBe(three(straight[k]!) ? straight[k] : leaned[k]));
  });
});

describe('the pairs alone in a mixed meter play the band’s T16 (yggi/jambot docs/language-time.md)', () => {
  // Lifted from yggi/jambot docs/language-time.md T16 @ 71530f8: "A pulse of more than two eighths plays straight at the
  // 8th level ...; 5/8, 7/8 and 10/8's 2-eighth pulses still swing". Each eighth of one bar in Jambot's steps (two an
  // eighth): a pulse of two swung at the share (2/3: the offbeat at 2/3 of its 4 steps), a pulse of three straight.
  // Measured there by `swingMapAt({ level: '8n', share: 2 / 3 }, start, length)` over `METERS[…].heights`.
  const T16: Record<string, readonly number[]> = {
    '5/8': [0, 2, 4, 6, 26 / 3],
    '7/8': [0, 2, 4, 6, 26 / 3, 10, 38 / 3],
    '10/8': [0, 2, 4, 6, 26 / 3, 10, 12, 14, 16, 56 / 3],
  };

  it.each(Object.entries(T16))('%s at 90 bpm with swing=8n:2/3:pairs: every eighth where the band plays it', (signature, steps) => {
    const r = compiled(`&bar meter("${signature}") step=90bpm swing=8n:2/3:pairs\n&x step=8n 0${VOICE}`);
    const bar = r.cells.get('bar')!;
    const barSeconds = bar.steps / r.clocks.get('bar')!.perSecond;
    const at = eventsBetween(plan(r, codeShifts(r)), 0, barSeconds - 1e-6).map((e) => (e.at / barSeconds) * 2 * bar.meter!.pulses);
    expect(at).toEqual(steps.map((x) => expect.closeTo(x, 9)));
  });

  it('the issue’s text, 7/8 at 90 bpm: a bar of 2 s, its pairs leaned, its three straight', () => {
    const r = compiled(`&bar meter("7/8") step=90bpm swing=8n:2/3:pairs\n&x step=8n 0!7${VOICE}`);
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 2 - 1e-6).map((e) => e.at);
    // (an eighth is 2/7 s: T16's steps times 1/7 s)
    expect(at).toEqual(T16['7/8']!.map((x) => expect.closeTo(x / 7, 9)));
  });
});

describe('`:pairs` as written', () => {
  const errors = (src: string) =>
    compileSource(src)
      .diagnostics.filter((d) => d.severity === 'error')
      .map((d) => d.message);

  it('is a word after a level’s share: a decimal, a fraction or one free(…), and on several levels each its own', () => {
    const levels = (src: string) =>
      compiled(`&bar ${src}`)
        .cells.get('bar')!
        .meter!.swing!.map((l) => [l.level, l.share, l.pairs ?? false]);
    expect(levels('meter("7/8") swing=8n:.67:pairs')).toEqual([['8n', 0.67, true]]);
    expect(levels('meter("7/8") swing=8n:2/3:pairs,16n:.55')).toEqual([
      ['8n', 2 / 3, true],
      ['16n', 0.55, false],
    ]);
    expect(levels('meter("7/8") swing=8n:free(.6, .5..75):pairs')).toEqual([['8n', 0.6, true]]);
    expect(onsets('meter("7/8") swing=8n:free(.67, .5..75):pairs', '8n')).toEqual(onsets('meter("7/8") swing=8n:.67:pairs', '8n'));
  });

  it('leans each level’s pairs alone, its finer levels as before: 16ths swing inside 7/8’s straight three', () => {
    expect(rounded(onsets('meter("7/8") swing=8n:2/3:pairs,16n:.6', '16n'))).toEqual(
      rounded([0, 0.6, 1, 1.6, 2, 2.6, 3, 3 + 0.6 * (4 / 3), 3 + 4 / 3, 3 + 4 / 3 + 0.6 * (2 / 3), 5, 5 + 0.6 * (4 / 3), 5 + 4 / 3, 5 + 4 / 3 + 0.6 * (2 / 3)]),
    );
  });

  it('another word, or :pairs on legato=, fails at the word', () => {
    expect(errors('&bar meter("7/8") swing=8n:2/3:threes')).toEqual([expect.stringContaining(":pairs leans a level's pairs alone")]);
    expect(errors('&bar meter("7/8") legato=8n:.5:pairs')).toEqual([expect.stringContaining(":pairs is swing='s")]);
    expect(errors('&bar meter("7/8") swing=8n:free(.6, .5..75):pairs,16n:.55')).toEqual([expect.stringContaining('one level alone')]);
  });

  it('where every group of the level is three, it leans nothing, and says so', () => {
    expect(warnings(`&bar meter("6/8") step=60bpm swing=8n:2/3:pairs\n&x step=8n 0${VOICE}`)).toEqual([
      'swing=8n:.6666666666666666:pairs leans nothing on &bar: every group of 8n in it is three, and :pairs keeps those straight',
    ]);
    expect(warnings(`&bar meter("7/8") step=60bpm swing=8n:2/3:pairs\n&x step=8n 0${VOICE}`)).toEqual([]);
  });
});

// #287: a level line multiplying a line is read at each note's written step, before the swing, as Strudel's .gain is read
// at a hit's onset in the cycle; so a straight Euclid on 1m, times a level line on 16n under a leaning meter, keeps its levels.
describe('a note’s level is read where it is written', () => {
  const levels = (meter: string, line: string) => {
    const r = compiled(
      `&bar ${meter} step=60bpm\n${line}\n&lv map=amp step=16n .1 .2 .3 .4 .5 .6 .7 .8 .9 1 .11 .12 .13 .14 .15 .16\n&v s=sine loop=C4\n&out map=sample [&x * &lv * &v]`,
    );
    return eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => +(e.levels[0]?.level ?? NaN).toFixed(4));
  };
  it('a straight stroke on a leaned sixteenth reads that sixteenth’s level, not the one before', () => {
    const straight = levels('meter("4/4")', '&x step=1m [0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]');
    expect(straight).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16]);
    expect(levels('meter("4/4") swing=16n:.65', '&x step=1m [0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]')).toEqual(straight);
    // (a swung line reads its own swung step, as it did)
    expect(levels('meter("4/4") swing=16n:.65', '&x step=16n 0')).toEqual(straight);
  });
});

// #121: the parts of a step (a subsequence, a Euclid's strokes) are placed through the swing from where they are written,
// as a tap of their level is: what a Euclid on 1m or a pair inside a beat plays lands where the finer tap's steps land.
describe('the parts of a step swing as a tap of their level does', () => {
  const at = (meter: string, line: string) => rounded(onsetsOf(meter, line));
  const onsetsOf = (meter: string, line: string) => {
    const r = compiled(`&bar ${meter} step=60bpm\n${line}${VOICE}`);
    const bar = r.cells.get('bar')!;
    const barSeconds = bar.steps / r.clocks.get('bar')!.perSecond;
    return eventsBetween(plan(r, codeShifts(r)), 0, barSeconds - 1e-6).map((e) => (e.at / barSeconds) * bar.meter!.pulses);
  };
  it('a Euclid on 1m strikes where step=16n does', () => {
    // (its strokes' sixteenths, read under a straight 4/4: a pulse is a quarter, four sixteenths)
    const strokes = onsetsOf('meter("4/4")', '&x step=1m 0(5,16,3)').map((p) => Math.round(p * 4));
    expect(strokes).toEqual([3, 6, 9, 12, 15]);
    for (const m of ['meter("4/4") swing=16n:.6', 'meter("4/4") swing=8n:.67', 'meter("4/4") swing=8n:.6,16n:.55']) {
      const sixteenths = onsetsOf(m, '&x step=16n 0');
      expect(at(m, '&x step=1m 0(5,16,3)'), m).toEqual(rounded(strokes.map((s) => sixteenths[s]!)));
    }
  });
  it('a pair inside a beat plays where step=8n does; a triplet tap stays even', () => {
    expect(at('meter("4/4") swing=8n:.67', '&x step=4n [0 0]')).toEqual(at('meter("4/4") swing=8n:.67', '&x step=8n 0'));
    expect(at('meter("4/4") swing=16n:.6', '&x step=4n [0 0 0 0]')).toEqual(at('meter("4/4") swing=16n:.6', '&x step=16n 0'));
    expect(at('meter("4/4") swing=8n:.67', '&x step=8t 0')).toEqual(at('meter("4/4")', '&x step=8t 0'));
  });
});
