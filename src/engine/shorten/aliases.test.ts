import { describe, expect, it } from 'vitest';
import { shorten } from './index';
import { samePiece } from './harness';

const BASE = `&bar scan(1 1 1 1) step=120bpm
&tune over=scale(major) step=&bar 0 2 4 2
`;

describe("Shorten: Strudel's or dough's name for a parameter (decision 027)", () => {
  it('offers ours where it is shorter, the value and its place kept', () => {
    const src = BASE + '&lead sound=saw loop=C4 cutoff=800 resonance=2 dt=.25 delay=.3\n&mix [&tune * &lead]';
    const found = shorten(src).filter((x) => x.kind === 'alias');
    expect(found.map((s) => [s.before, s.after]).sort()).toEqual([
      ['cutoff=800', 'lpf=800'],
      ['resonance=2', 'lpq=2'],
      ['sound=saw', 's=saw'],
    ]);
    const cutoff = found.find((s) => s.before === 'cutoff=800')!;
    const next = cutoff.apply(src);
    expect(next).toBe(BASE + '&lead sound=saw loop=C4 lpf=800 resonance=2 dt=.25 delay=.3\n&mix [&tune * &lead]');
    expect(samePiece(src, next)).toBe(true);
  });
  it('nothing for ours, or for an alias no shorter than ours (dt=, verb=)', () => {
    expect(shorten(BASE + '&lead s=saw loop=C4 lpf=800 verb=.3 dt=.25 delay=.3\n&mix [&tune * &lead]').some((x) => x.kind === 'alias')).toBe(false);
  });
});
