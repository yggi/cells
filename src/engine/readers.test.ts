import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { clocking } from './clocking';
import { codeShifts } from './program';
import { PRESETS } from './presets';
import { lapOf, ownRate, refsOf, stepsAt, stepsPerSecond } from './readers';

const compiled = (src: string) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};

const SRC = `&bar scan(4) step=120bpm
&a 0 1 2
&b step=&bar*2 &a 3 &a!2
&c step=&bar 0 1
&kit &bd &sd
&bd s=sine
&sd s=white
&drums over=&kit step=&bar 0 1`;

describe("a cell's readers", () => {
  const r = compiled(SRC);
  it('refsOf: the &refs in its braid, in order, as often as written; none for a missing cell', () => {
    expect(refsOf(r.cells.get('b'))).toEqual(['a', 'a']);
    expect(refsOf(r.cells.get('kit'))).toEqual(['bd', 'sd']);
    expect(refsOf(r.cells.get('a'))).toEqual([]);
    expect(refsOf(undefined)).toEqual([]);
  });
  it('ownRate: 1 for its own clock, else its rate; stepsPerSecond: the clock times that', () => {
    const bar = r.cells.get('bar')!;
    expect(bar.clock).toBe('bar');
    expect(ownRate(bar)).toBe(1);
    expect(ownRate(r.cells.get('b')!)).toBe(r.cells.get('b')!.rate);
    expect(stepsPerSecond(r, 'b')).toBeCloseTo(stepsPerSecond(r, 'c')! / 2); // (a step two of its clock's)
    expect(stepsPerSecond(r, 'c')).toBeCloseTo(r.clocks.get(r.cells.get('c')!.clock!)!.perSecond * r.cells.get('c')!.rate);
    expect(stepsPerSecond(r, 'a')).toBeNull(); // (spliced in, not clocked itself)
    expect(stepsPerSecond(r, 'nothing')).toBeNull();
  });
  it('lapOf: its steps, at least 1; a missing cell 1', () => {
    expect(lapOf(r, 'b')).toBe(r.cells.get('b')!.steps);
    expect(lapOf(r, 'b')).toBeGreaterThan(1);
    expect(lapOf(r, 'nothing')).toBe(1);
  });
  it('stepsAt: its clock stepped to a time, times its own rate', () => {
    const clk = clocking(r, codeShifts(r), 1);
    const c = r.cells.get('c')!;
    expect(stepsAt(clk, c)).toBeCloseTo(clk.stepOf('bar') * c.rate);
    expect(stepsAt(clk, r.cells.get('b')!)).toBeCloseTo(stepsAt(clk, c) / 2);
  });
  it('every example keys its cells by their own names (ownRate reads cell.name)', () => {
    for (const p of Object.values(PRESETS)) for (const [k, c] of compileSource(p.source).cells) expect(c.name).toBe(k);
  });
});
