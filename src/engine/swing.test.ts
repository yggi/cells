import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { shorten } from './shorten';
import vectors from '../../fixtures/jambot-swing.json';

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
    expect(warnings(bare)).toEqual(["swing=.67 leans the meter cell's own steps: name the level it leans, swing=8n:.67 (Migrate rewrites it)"]);
    expect(onsets('meter("4/4", 2) swing=.67', '8n')).toEqual(onsets('meter("4/4", 2) swing=8n:.67', '8n'));
    const s = shorten(bare).find((x) => x.kind === 'swing')!;
    expect(s.after).toBe('&bar meter("4/4", 2) step=60bpm swing=8n:.67');
    expect(warnings(s.apply(bare))).toEqual([]);
    // (left free, it stays free)
    const free = bare.replace('swing=.67', 'swing=free(.5, .5..75)');
    expect(shorten(free).find((x) => x.kind === 'swing')!.after).toBe('&bar meter("4/4", 2) step=60bpm swing=8n:free(.5, .5..75)');
  });

  it('several levels at once nest, each node keeping its ends', () => {
    expect(rounded(onsets('meter("4/4") swing=8n:.6,16n:.55', '16n').slice(0, 4))).toEqual([0, 0.33, 0.6, 0.82]);
    expect(() => compiled(`&bar meter("4/4") step=60bpm swing=8n:free(.5, .5..75),16n:.55\n&x step=8n 0${VOICE}`)).toThrow(/one level alone/);
  });
});

describe('Jambot’s swing axis, pinned by vectors (fixtures/jambot-swing.json)', () => {
  it('holds s from 0 to 1 in steps of .05, each with its two levels’ shares', () => {
    expect(vectors.vectors.map((v) => v.s)).toEqual(Array.from({ length: 21 }, (_, i) => i / 20));
    expect(vectors.lifted).toMatch(/^Lifted from yggi\/jambot packages\/engine\/src\/swing\.ts @ [0-9a-f]{40}$/);
  });

  it.each(vectors.vectors.map((v) => [v.s, v] as const))('s = %s: a 4/4 bar swung by its two shares places every 16th within 1e-9 of leanMap', (_, v) => {
    const r = compiled(`&bar meter("4/4") step=60bpm swing=8n:${v.shares.eighth},16n:${v.shares.sixteenth}\n&x step=16n 0${VOICE}`);
    // (a bar of 4 s: a sixteenth is a quarter of a second)
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => e.at * 4);
    expect(at).toHaveLength(16);
    at.forEach((x, k) => expect(Math.abs(x - v.onsets[k]), `the ${k}th sixteenth`).toBeLessThan(1e-9));
  });
});
