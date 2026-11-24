import { describe, expect, it } from 'vitest';
import { compileSource } from '../src/engine/compile';
import {
  AXES,
  columns,
  EXAMPLE_DRIFT,
  measure,
  mulberry32,
  models,
  nearest,
  OCTAVES_DRIFT,
  radioText,
  reflected,
  row,
  SECTION_SECONDS,
  STEP,
  table,
  trajectory,
  walk,
  type Point,
} from './radio';
import { stylePoint } from '../src/repository/styles';

const point = (id: string): Point => Object.fromEntries(AXES.map((a) => [a, stylePoint(id)[a]!])) as Point;
const reach: Point = { sync: 0.28, harm: 0.35, bite: 0.35, mood: 0.21 };

describe('tools/radio.ts: npm run radio', () => {
  it('folds a step back off an end by as much, as often as it takes', () => {
    expect(reflected(1.2, 0, 1)).toBeCloseTo(0.8, 12);
    expect(reflected(-0.3, 0, 1)).toBeCloseTo(0.3, 12);
    expect(reflected(2.4, 0, 1)).toBeCloseTo(0.4, 12);
    expect(reflected(0.4, 0, 1)).toBeCloseTo(0.4, 12);
  });

  it('walks as Jambot’s radio does: from where it is tuned in, a step at most the entropy’s, inside the axes, the same each time', () => {
    const start = point('techno');
    const a = walk(start, 500, 7, 0.3);
    expect(a[0]).toEqual(start);
    for (let k = 1; k < a.length; k++)
      for (const axis of AXES) {
        expect(Math.abs(a[k]![axis] - a[k - 1]![axis])).toBeLessThanOrEqual(STEP[axis] * 0.3 + 1e-12);
        expect(a[k]![axis]).toBeGreaterThanOrEqual(0);
        expect(a[k]![axis]).toBeLessThanOrEqual(1);
      }
    expect(walk(start, 500, 7, 0.3)).toEqual(a);
    expect(walk(start, 500, 8, 0.3)).not.toEqual(a);
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });

  it('writes the radio as a text that compiles clean, and whose style is the preset’s point moved inside its window', () => {
    const start = point('funk');
    for (const drift of [EXAMPLE_DRIFT, OCTAVES_DRIFT]) {
      const text = radioText(start, drift, reach, 3);
      expect(
        compileSource(text)
          .diagnostics.filter((d) => d.severity !== 'info' && !d.message.startsWith('Nothing plays yet'))
          .map((d) => d.message),
      ).toEqual([]);
      const run = trajectory(text, 40);
      for (const p of run)
        for (const axis of AXES) {
          expect(p[axis]).toBeGreaterThanOrEqual(Math.max(0, start[axis] - reach[axis]) - 1e-9);
          expect(p[axis]).toBeLessThanOrEqual(Math.min(1, start[axis] + reach[axis]) + 1e-9);
        }
      expect(trajectory(text, 40)).toEqual(run);
      // (a seed is its own draws: another seed, another station)
      expect(trajectory(radioText(start, drift, reach, 4), 40)).not.toEqual(run);
    }
  });

  it('reads E30’s columns: a run that holds still walks nowhere, changes no preset and remembers nothing', () => {
    const still = Array.from({ length: 200 }, () => point('techno'));
    const c = columns([still, still]);
    expect(c.walked.bite).toEqual([0, 0, null]);
    expect(c.firstChange).toEqual({ minutes: null, runs: 0 });
    expect(c.changesAnHour).toBe(0);
    expect(c.atTunedIn).toBe(1);
    expect(c.visited).toBe(1);
    expect(c.remembers.bite).toBeNull();
    expect(c.largestStep.bite).toBe(0);
    expect(nearest(point('techno'))).toBe('techno');
  });

  it('reads the columns of a run that leaves: its distance, the minute its nearest preset changes, the change undone', () => {
    const perMinute = 60 / SECTION_SECONDS;
    const run = Array.from({ length: 200 }, (_, k) => (k < Math.round(5 * perMinute) ? point('techno') : point('ambient')));
    const c = columns([run]);
    expect(c.firstChange.minutes).toBeCloseTo(5, 0);
    expect(c.changesAnHour).toBeGreaterThan(0);
    expect(c.walked.sync[0]).toBeGreaterThan(0);
    // (a blip, there and back in a section: the first change undone by the next, the second not: E30's count, one of two)
    const blip = Array.from({ length: 20 }, (_, k) => (k === 5 ? point('ambient') : point('techno')));
    expect(columns([blip]).undone).toBe(0.5);
  });

  it('measures Jambot’s walk as E30 did: the distance it has walked, its steps, its memory (E30: 0.07 to 0.10 after 10 minutes at entropy 0.3, 53 to 142 sections at entropy 1)', () => {
    const [slow, fast] = models(3.5);
    const c = measure(slow!, 1, 3);
    // (24 runs: each axis within sampling's reach of E30's 0.07 to 0.10, their mean nearer)
    const walked = AXES.map((a) => c.walked[a][0]!);
    for (const w of walked) expect(w).toBeLessThan(0.2);
    expect(walked.reduce((a, b) => a + b, 0) / walked.length).toBeGreaterThan(0.04);
    expect(walked.reduce((a, b) => a + b, 0) / walked.length).toBeLessThan(0.12);
    expect(Math.max(...AXES.map((a) => c.largestStep[a]))).toBeLessThanOrEqual(0.03 + 1e-12);
    const f = measure(fast!, 1, 3);
    for (const axis of AXES) expect(f.remembers[axis]).toBeGreaterThan(20);
  });

  it('measures the radio as cells writes it, through the style a score plays: a short run per model, in a table', () => {
    const rows = models(3.5).map((m) => row(m.name, measure(m, 0.25, 1)));
    expect(rows).toHaveLength(4);
    expect(table(rows).split('\n')).toHaveLength(6);
    // (the example's drift holds no memory of its own beyond its walkers' rates: it forgets within a few sections)
    const example = measure(models(3.5)[2]!, 0.5, 2);
    for (const axis of AXES) expect(example.remembers[axis]!).toBeLessThan(20);
  });
});
