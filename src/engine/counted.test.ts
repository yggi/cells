// A meter counted in n beats (decision 102): `meter("4/4 in 2")`, its tree its signature's, its beats the tier that has n.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { groupingOf, meterCounts } from './parser/generators';
import { resolveSeed } from '../repository/library';

const lines = (...xs: string[]) => xs.join('\n');
const compiled = (text: string) => compileSource(text, undefined, { resolve: resolveSeed });
const errors = (text: string) =>
  compiled(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const meterOf = (m: string, bpm = 60) => {
  const text = `&bar ${m} step=${bpm}bpm`;
  expect(errors(text), m).toEqual([]);
  return compiled(text).cells.get('bar')!.meter!;
};
/** Every event of a line tapping the meter by note value, and by its beat, in the first seconds. */
const played = (m: string, bpm = 60) => {
  const text = lines(`&bar ${m} step=${bpm}bpm`, '&t step=8n 0 2 4 5 7 9', '&b step=&bar:beat 12 7', '&v s=sine loop=C4', '&out map=sample [&t * &v, &b * &v]');
  const r = compiled(text);
  expect(errors(text), m).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 8).map((e) => [+e.at.toFixed(9), +e.dur.toFixed(9), +e.freq.toFixed(6)]);
};

describe('the counts a meter may be counted in: the tiers of its tree at or above its pulse (decision 102)', () => {
  const counts = (sig: string) => Object.fromEntries(meterCounts(groupingOf(sig)!));
  it('each tier’s nodes, in pulses', () => {
    expect(counts('4/4')).toEqual({ 1: [4], 2: [2, 2], 4: [1, 1, 1, 1] });
    expect(counts('3/4')).toEqual({ 1: [3], 3: [1, 1, 1] });
    expect(counts('2/2')).toEqual({ 1: [2], 2: [1, 1] });
    expect(counts('6/8')).toEqual({ 1: [6], 2: [3, 3], 6: [1, 1, 1, 1, 1, 1] });
    expect(counts('12/8')).toEqual({ 1: [12], 2: [6, 6], 4: [3, 3, 3, 3], 12: Array(12).fill(1) });
    // (three groups are flat under the bar: no halving tier, so no count of 2)
    expect(counts('7/8')).toEqual({ 1: [7], 3: [3, 2, 2], 7: Array(7).fill(1) });
    expect(counts('10/8')).toEqual({ 1: [10], 2: [5, 5], 4: [3, 2, 3, 2], 10: Array(10).fill(1) });
    expect(counts('5/4')).toEqual({ 1: [5], 2: [3, 2], 5: [1, 1, 1, 1, 1] });
    expect(counts('2+2+3')).toEqual({ 1: [7], 3: [2, 2, 3], 7: Array(7).fill(1) });
  });
});

describe('meter("sig in n")', () => {
  it('counts the same tree in n beats: its steps and grades as written, its beats the tier’s nodes', () => {
    const a = meterOf('meter("4/4 in 2")');
    const b = meterOf('meter("4/4")');
    expect(a.beats).toEqual([2, 2]);
    expect({ ...a, beats: b.beats }).toEqual(b);
    expect(meterOf('meter("3/4 in 1")').beats).toEqual([3]);
    expect(meterOf('meter("12/8 in 2")').beats).toEqual([6, 6]);
    expect(meterOf('meter("6/8 in 6")').beats).toEqual([1, 1, 1, 1, 1, 1]);
    expect(meterOf('meter("10/8 in 2")').beats).toEqual([5, 5]);
  });

  it('its own count is the signature alone', () => {
    for (const [counted, plain] of [
      ['4/4 in 4', '4/4'],
      ['3/4 in 3', '3/4'],
      ['12/8 in 4', '12/8'],
      ['7/8 in 3', '7/8'],
      ['2+2+3 in 3', '2+2+3'],
    ])
      expect(meterOf(`meter("${counted}")`)).toEqual(meterOf(`meter("${plain}")`));
  });

  it('bpm counts its beats: 4/4 in 2 at 60 bpm is a bar of 4 s, alla breve, and plays as meter("2/2", 2) does', () => {
    expect(played('meter("4/4 in 2")')).toEqual(played('meter("2/2", 2)'));
    // (a bar of 4/4 at 120 bpm counting quarters: its eighths alike, its beat a quarter where 4/4 in 2's is a half)
    const eighths = (m: string, bpm: number) => {
      const r = compiled(lines(`&bar ${m} step=${bpm}bpm`, '&t step=8n 0 2 4 5 7 9', '&v s=sine loop=C4', '&out map=sample [&t * &v]'));
      return eventsBetween(plan(r, codeShifts(r), r.off), 0, 8).map((e) => [+e.at.toFixed(9), +e.dur.toFixed(9)]);
    };
    expect(eighths('meter("4/4 in 2")', 60)).toEqual(eighths('meter("4/4")', 120));
  });

  it('a waltz in one plays as its levels written in one, meter("*..", 4n)', () => {
    expect(played('meter("3/4 in 1")', 40)).toEqual(played('meter("*..", 4n)', 40));
  });

  it('with a step, and through a text cell', () => {
    expect(meterOf('meter("6/8 in 6", 16n)').beats).toEqual([1, 1, 1, 1, 1, 1]);
    const viaCell = compiled(lines('&m "4/4 in 2"', '&bar meter(&m) step=60bpm'));
    expect(viaCell.cells.get('bar')!.meter).toEqual(meterOf('meter("4/4 in 2")'));
  });

  it('says what it may be counted in, and that levels count by their marks', () => {
    expect(errors('&bar meter("3/4 in 2") step=60bpm')[0]).toMatch(/3\/4 is counted in 1, 3 .*not 2/);
    expect(errors('&bar meter("7/8 in 4") step=60bpm')[0]).toMatch(/7\/8 is counted in 1, 3, 7 .*not 4/);
    expect(errors('&bar meter("*.+. in 1") step=60bpm')[0]).toMatch(/levels say their beats by their marks/);
  });
});
