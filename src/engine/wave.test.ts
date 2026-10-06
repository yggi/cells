import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { harmonics, waveform } from './wave';

const wave = (src: string, name = 'v') => {
  const r = compileSource(src + `\n&m step=1\n&t step=&m 0\nout(&${name}, &t)`);
  return waveform(r, name, codeShifts(r), 240);
};
const mags = (x: Float32Array, n = 6) => {
  const { real, imag } = harmonics(x, n);
  return Array.from({ length: n }, (_, i) => Math.hypot(real[i + 1], imag[i + 1]));
};

describe('waveforms from braids', () => {
  it('0 1 held and lerped to −1…1 is a square: odd harmonics only, 4/(πk)', () => {
    const x = wave('&v loop=440 0 1');
    expect([x[0], x[119], x[120], x[239]]).toEqual([-1, -1, 1, 1]);
    const m = mags(x);
    expect(m[0]).toBeCloseTo(4 / Math.PI, 2);
    expect(m[1]).toBeLessThan(1e-6);
    expect(m[2]).toBeCloseTo(4 / (3 * Math.PI), 2);
  });

  it('no braid: the identity of the 12 grid, a 12-step saw (harmonics fall like 1/k)', () => {
    const x = wave('&v loop=440');
    expect(x[0]).toBe(-1);
    expect(x[239]).toBe(1);
    const m = mags(x);
    for (let k = 1; k < 5; k++) expect(m[k] / m[0]).toBeCloseTo(1 / (k + 1), 1);
  });

  it('sin(12): a 12-step sine, nearly all fundamental', () => {
    const m = mags(wave('&v loop=440 sin(12)'));
    expect(m[0]).toBeGreaterThan(0.95);
    for (let k = 1; k < 6; k++) expect(m[k]).toBeLessThan(0.02);
  });

  it('rests are silence; chords average; map=&table looks values up first', () => {
    const x = wave('&v loop=440 0 ~ 2');
    expect([x[0], x[100], x[200]]).toEqual([-1, 0, 1]);
    const y = wave('&curve 0 5 1\n&v loop=440 map=&curve 0 1 2'); // 0→0, 1→5, 2→1: middle is the peak
    expect([y[0], y[100], y[200]]).toEqual([-1, 1, expect.closeTo(-0.6, 5)]);
  });

  it('shifting a voice rotates its braid; wrapped values climb a lap (it is a helix)', () => {
    const r = compileSource('&v loop=440 0 3 1 2\n&m step=1\n&t step=&m 0\n&mix_ [&t * &v]\n&out_ loop=44k map=sample &mix_');
    const at = (k: number) => waveform(r, 'v', (n) => (n === 'v' ? k : 0), 240);
    // a full turn lifts every value by 12: lerped away, the same wave
    expect(Array.from(at(4))).toEqual(Array.from(at(0)));
    // one step: 3 1 2 12 — a different wave
    expect(Array.from(at(1))).not.toEqual(Array.from(at(0)));
  });
});

describe('map=lin: values ramp', () => {
  it('0 1 ramped is a triangle: odd harmonics falling like 1/k²', () => {
    const x = wave('&v loop=440 map=lin 0 1');
    expect(x[0]).toBeCloseTo(-1);
    expect(x[120]).toBeCloseTo(1); // half way round: the top
    const m = mags(x);
    expect(m[1]).toBeLessThan(1e-3); // no even harmonics
    expect(m[2] / m[0]).toBeCloseTo(1 / 9, 1);
  });
  it('the default braid ramped is a saw: up through 0…11, then straight back down', () => {
    const x = wave('&v loop=440 map=lin');
    // rises almost the whole way, falls in the last twelfth
    expect(x[200]).toBeGreaterThan(x[100]);
    expect(x[239]).toBeLessThan(x[219]);
    const m = mags(x);
    expect(m[1] / m[0]).toBeGreaterThan(0.4); // a saw's 1/k-ish series, not a triangle's
  });
});
