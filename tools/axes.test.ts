// tools/axes.ts: the brightness rule over every scale it knows, the statistics it measures with, and the options measured
// over the presets and the library (#539).
import { describe, expect, it } from 'vitest';
import { STYLES } from '../src/repository/styles';
import { brightness, correlation, eigenvalues, libraryPoints, measure, OPTIONS, placedStyles, report, scaleOf } from './axes';

describe('brightness, by rule from a mode', () => {
  it('orders the church modes in sixths, locrian 0 to lydian 1, and puts harmonic minor at 3/6', () => {
    const ids = ['locrian', 'phrygian', 'aeolian', 'dorian', 'mixolydian', 'ionian', 'lydian'].map((m) => `diatonic(mode=${m})`);
    expect(ids.map((id) => brightness(scaleOf(id)!))).toEqual([0, 1, 2, 3, 4, 5, 6].map((k) => k / 6));
    expect(brightness(scaleOf('harmonic_minor')!)).toBe(0.5);
    expect(scaleOf('bell_and_scale')).toEqual(scaleOf('diatonic(mode=ionian)'));
    expect(scaleOf('funk_drums')).toBeNull();
  });

  it('places every preset on the mode the repository finds at its point', () => {
    const placed = placedStyles();
    expect(placed.map((s) => s.id)).toEqual(STYLES.map((s) => s.id));
    for (const s of placed) expect(scaleOf(s.mode), s.id).not.toBeNull();
    // (it tells Spooky from Swing jazz, which the four axes put 0.154 apart)
    expect(placed.find((s) => s.id === 'spooky')!.bright).toBe(0.5);
    expect(placed.find((s) => s.id === 'swingJazz')!.bright).toBe(5 / 6);
  });
});

describe('the statistics', () => {
  it('correlates: 1 for a series with itself, −1 against its negation', () => {
    expect(correlation([1, 2, 4], [1, 2, 4])).toBeCloseTo(1, 12);
    expect(correlation([1, 2, 4], [-1, -2, -4])).toBeCloseTo(-1, 12);
  });

  it('finds a symmetric matrix’s eigenvalues, largest first', () => {
    expect(
      eigenvalues([
        [2, 0],
        [0, 5],
      ]),
    ).toEqual([5, 2]);
    const [a, b] = eigenvalues([
      [2, 1],
      [1, 2],
    ]);
    expect(a).toBeCloseTo(3, 12);
    expect(b).toBeCloseTo(1, 12);
  });
});

describe('the options', () => {
  it('measures the four axes against themselves as unchanged, and each other option as a change', () => {
    const [four, ...others] = measure();
    expect(four!.keeps).toBeCloseTo(1, 12);
    expect(four!.moved).toBe(0);
    // (it fires: every other option moves a pair's distance, and drive moves a library point's nearest preset)
    for (const o of others) expect(o.pairs[0]!.here, o.name).not.toBeCloseTo(o.pairs[0]!.four, 3);
    expect(others[0]!.moved).toBeGreaterThan(0);
  });

  it('measures the options with brightness over the library points that have a mode alone', () => {
    const points = libraryPoints();
    const withBright = points.filter((p) => 'bright' in p.point).length;
    expect(withBright).toBeGreaterThan(0);
    const m = measure();
    for (const [i, o] of OPTIONS.entries()) expect(m[i]!.points, o.name).toBe(o.axes.includes('bright') ? withBright : points.length);
  });

  it('reports every table the note quotes', () => {
    const text = report();
    for (const heading of ['correlations over the 11 presets', 'principal direction', 'The options', 'Named pairs']) expect(text).toContain(heading);
  });
});
