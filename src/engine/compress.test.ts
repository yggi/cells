import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { shorten, shortenAll } from './compress';
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';
import { PRESETS } from './presets';

const tail = '\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
const sounds = (src: string, until = 20) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, until)
    .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(4)).join(',')}`)
    .sort();
};
const first = (src: string, kind: string) => shorten(src).find((s) => s.kind === kind)!;

describe('shorten', () => {
  it('runs: the same step again and again, counted', () => {
    const src = '&t step=4 0 0 0 0 4 7 7 7' + tail;
    const s = first(src, 'run');
    expect(s.apply(src)).toContain('&t step=4 0!4 4 7!3');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('a phrase in two cells: one cell, used in both (when it pays: the new line costs too)', () => {
    const src = '&t step=4 0 4 7 11 14 11 7 4 2 5 9 1' + tail.replace('[&t * &v]', '[&t * &v, &u * &v]') + '\n&u step=4 3 0 4 7 11 14 11 7 4 2 5 9';
    const s = first(src, 'phrase');
    const next = s.apply(src);
    expect(next).toMatch(/&m1 0 4 7 11 14 11 7 4 2 5 9/);
    expect(sounds(next)).toEqual(sounds(src));
    expect(s.saving).toBe(src.length - next.length);
  });
  it('a phrase backwards: &m[::-1]', () => {
    const src = '&t step=4 0 4 7 11 14 17 21 24 28 31 35 38 1 38 35 31 28 24 21 17 14 11 7 4 0' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('backwards'))!;
    expect(s.apply(src)).toContain('[::-1]');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('transposed, where the numbers are steps of a grid: &m^7', () => {
    const src = '&t step=4 0 4 7 11 14 17 21 17 14 11 7 4 7 11 14 18 21 24 28 24 21 18 14 11' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('transposed'))!;
    expect(s.apply(src)).toMatch(/\^-?7/); // (either one, transposed to the other)
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('… but not through a scale (degrees aren’t a transposition)', () => {
    const src = '&major scan(2 2 1 2 2 2 1)\n&t over=&major step=4 0 2 4 2 0 1 3 5 3 1' + tail;
    expect(shorten(src).some((x) => x.title.includes('transposed'))).toBe(false);
  });
  it('fractions: every step held twice — divide by 2, step twice as slow', () => {
    const src = '&bar step=120bpm 0 0 0 0\n&t step=&bar/2 4@2 2@2 0@4 ~@2' + tail;
    const s = first(src, 'fraction');
    const next = s.apply(src);
    expect(next).toContain('&t step=&bar 4 2 0@2 ~');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('a phrase too short to pay for its own line is left as it is', () => {
    const src = '&t step=4 0 4 7 2 5 9 1 0 4 7 2 5 9' + tail;
    expect(shorten(src).filter((x) => x.kind === 'phrase')).toEqual([]);
  });
  it('… and leaves alone what something else splices in (it would hear the lengths)', () => {
    const src = '&m 4@2 2@2\n&t step=4 &m 0' + tail;
    expect(shorten(src).some((x) => x.kind === 'fraction')).toBe(false);
  });
});

describe('shorten, on every example: every suggestion sounds the same, and is shorter', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    it(
      key,
      () => {
        const suggestions = shorten(p.source);
        const before = sounds(p.source);
        for (const s of suggestions) {
          const next = s.apply(p.source);
          expect(next.length, s.title).toBeLessThan(p.source.length);
          expect(sounds(next), `${key}: ${s.title}`).toEqual(before);
        }
      },
      60_000,
    );
  }
});

describe('shorten: turns, alike cells, and all the way', () => {
  it('a phrase turned round its helix: &m[>>k] (the steps that wrap climb a lap)', () => {
    // a phrase, then the same begun two on: the 0 and the 4 come round an octave up
    const src = '&t step=4 0 4 7 9 11 14 16 19 2 7 9 11 14 16 19 12 16 5 0 4 7 9 11 14 16 19' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('turned'))!;
    expect(s).toBeTruthy();
    expect(s.apply(src)).toContain('[>>2]');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('two cells written exactly alike: one, used by both', () => {
    const src = '&a 0 4 7 11 14 11 7 4\n&b 0 4 7 11 14 11 7 4\n&t step=4 &a 2 &b 5\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const s = shorten(src).find((x) => x.kind === 'same')!;
    const next = s.apply(src);
    expect(next).not.toMatch(/^&b /m);
    expect(next).toContain('&t step=4 &a 2 &a 5');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('all the way: again and again until nothing more pays — and still the same sound', () => {
    const src = '&t step=4 0 0 0 0 4 7 11 14 11 7 4 1 4 7 11 14 11 7 4 2 4 7 11 14 11 7 4' + tail;
    const { source, steps } = shortenAll(src);
    expect(steps.length).toBeGreaterThan(1);
    expect(source.length).toBeLessThan(src.length);
    expect(sounds(source)).toEqual(sounds(src));
  });
});
