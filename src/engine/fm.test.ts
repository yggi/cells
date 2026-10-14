import { describe, expect, it } from 'vitest';
import { besselJ, fmLines } from './fm';
import { compileSource } from './compile';

describe('FM, exactly', () => {
  it('Bessel functions: the known values', () => {
    expect(besselJ(0, 1)).toBeCloseTo(0.7651976866, 9);
    expect(besselJ(1, 1)).toBeCloseTo(0.4400505857, 9);
    expect(besselJ(2, 2.5)).toBeCloseTo(0.4460590584, 9);
    expect(besselJ(0, 2.404825557695773)).toBeCloseTo(0, 9); // the first zero: the carrier vanishes
    expect(besselJ(-3, 2)).toBeCloseTo(-besselJ(3, 2), 12);
  });
  const lines = (src: string, voice = 'car') => {
    const r = compileSource(src);
    return fmLines(r, voice, r.cells.get(voice)!.freq);
  };
  it('one modulator: lines at f + k·f·ratio, J_k(index) strong', () => {
    const ls = lines('&op s=sine ratio=3.5\n&car s=sine loop=100 fm=&op index=1');
    const at = (f: number) => ls.find((l) => Math.abs(l.f - f) < 1e-6)?.a ?? 0;
    // (normalised to the strongest, the carrier: J0(1))
    expect(at(100)).toBeCloseTo(1, 6);
    expect(at(450)).toBeCloseTo(besselJ(1, 1) / besselJ(0, 1), 6);
    expect(at(800)).toBeCloseTo(besselJ(2, 1) / besselJ(0, 1), 6);
    // below: 100 − 350 = −250 folds to 250, its sign turned (no other line there)
    expect(at(250)).toBeCloseTo(besselJ(1, 1) / besselJ(0, 1), 6);
  });
  it('at a Bessel zero the carrier itself is gone', () => {
    const ls = lines('&op s=sine ratio=3.5\n&car s=sine loop=100 fm=&op index=2.404825557695773');
    expect(ls.find((l) => Math.abs(l.f - 100) < 1e-6)?.a ?? 0).toBeLessThan(1e-6);
  });
  it('a whole-number ratio: the lines fall on harmonics (folded ones add or cancel)', () => {
    const ls = lines('&op s=sine ratio=1\n&car s=sine loop=100 fm=&op index=2');
    expect(ls.every((l) => Math.abs(l.f / 100 - Math.round(l.f / 100)) < 1e-6)).toBe(true);
  });
  it('a moving index: shown at its brightest (the top of its range)', () => {
    const a = lines('&op s=sine ratio=3.5\n&car s=sine loop=100 fm=&op index=.5..4 * &(map=adsr .01 .2 .1 .1)');
    const b = lines('&op s=sine ratio=3.5\n&car s=sine loop=100 fm=&op index=4');
    expect(a).toEqual(b);
  });
  it('a chain (a modulated modulator) adds lines of its own', () => {
    const one = lines('&op s=sine ratio=2\n&car s=sine loop=100 fm=&op index=1');
    const two = lines('&m2 s=sine ratio=3\n&op s=sine ratio=2 fm=&m2 index=1\n&car s=sine loop=100 fm=&op index=1');
    expect(two.length).toBeGreaterThan(one.length);
    expect(two.some((l) => Math.abs(l.f - 700) < 1e-6)).toBe(true); // 100 + 600: the second modulator, through the first
  });
});
