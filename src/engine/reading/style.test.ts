// Lifted from yggi/jambot packages/engine/src/style-reading.test.ts @ a34d13c6 (all but the tests that read Jambot's
// band, which stay there): `artic` is `bite`, and a bar is cells' (`barOf`).
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { BAR_4_4, type Bar, barOf, type Part, readStyle, readTiming } from './style';

const note = (part: Part, step: number, length = 1, midi = 60) => ({ part, step, note: midi, length });
const range = (n: number) => [...Array(n).keys()];

const meterOf = (sig: string) => {
  const r = compileSource(`&m meter("${sig}")`);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.cells.get('m')!.meter!;
};
/** Jambot's meters, each its bar's steps and its pulses as steps, as `meterOnSteps` gives them (yggi/jambot packages/theory @ a34d13c6). */
const JAMBOT_BARS: Record<string, Bar> = {
  '3/4': { steps: 12, pulses: [0, 4, 8] },
  '4/4': { steps: 16, pulses: [0, 4, 8, 12] },
  '5/4': { steps: 20, pulses: [0, 4, 8, 12, 16] },
  '5/8': { steps: 10, pulses: [0, 6] },
  '6/8': { steps: 12, pulses: [0, 6] },
  '7/8': { steps: 14, pulses: [0, 6, 10] },
  '9/8': { steps: 18, pulses: [0, 6, 12] },
  '10/8': { steps: 20, pulses: [0, 6, 10, 16] },
  '12/8': { steps: 24, pulses: [0, 6, 12, 18] },
};

describe('a meter as a reading counts it', () => {
  it('lays each of Jambot’s nine meters on the steps and pulses Jambot did (finite: every one)', () => {
    for (const [sig, bar] of Object.entries(JAMBOT_BARS)) expect([sig, barOf(meterOf(sig))]).toEqual([sig, bar]);
    expect(barOf(meterOf('4/4'))).toEqual(BAR_4_4);
  });

  it('has no bar for a scan, whose steps aren’t sixteenths', () => {
    const r = compileSource('&m scan(3 2 2)');
    expect(barOf(r.cells.get('m')!.meter!)).toBeNull();
  });
});

describe('reading a style from notes: sync', () => {
  it('reads no syncopation where every onset is on a beat or an eighth', () => {
    expect(readStyle([0, 2, 4, 6, 8, 10, 12, 14].map((s) => note('lead', s))).sync).toBe(0);
  });

  it('reads all of it where every onset is off the beat and the eighth', () => {
    expect(readStyle([1, 3, 5, 7, 9, 11, 13, 15].map((s) => note('lead', s))).sync).toBe(1);
  });

  it('reads the share of onsets that fall off them, from every part', () => {
    expect(readStyle([note('drums', 0), note('bass', 3), note('lead', 4), note('stab', 7)]).sync).toBe(0.5);
  });
});

describe('reading a style from notes: bite', () => {
  it('reads paddy where each note fills the gap to the next', () => {
    expect(readStyle([note('lead', 0, 4), note('lead', 4, 4), note('lead', 8, 8)]).bite).toBe(0);
  });

  it('reads stabby where each note is a fraction of its gap', () => {
    expect(readStyle([note('lead', 0, 1), note('lead', 4, 1), note('lead', 8, 1), note('lead', 12, 1)]).bite).toBeCloseTo(0.75, 12);
  });

  it('measures the bass and the lead alone, by their median', () => {
    const long = [note('bass', 0, 8), note('bass', 8, 8)];
    const short = [note('lead', 0, 1), note('lead', 8, 1)];
    const drums = [0, 4, 8, 12].map((s) => note('drums', s, 1));
    expect(readStyle([...long, ...drums]).bite).toBe(0);
    expect(readStyle([...short, ...drums]).bite).toBeCloseTo(7 / 8, 12);
    // Two stabby notes and one paddy: the median is the middle one.
    expect(readStyle([note('bass', 0, 8), note('lead', 0, 1), note('lead', 8, 1)]).bite).toBeCloseTo(7 / 8, 12);
  });

  it('runs a part’s last note to the bar’s end, and clips a note that runs past it', () => {
    expect(readStyle([note('lead', 12, 4)]).bite).toBe(0);
    expect(readStyle([note('lead', 12, 9)]).bite).toBe(0);
    expect(readStyle([note('lead', 12, 1)]).bite).toBe(0.75);
  });

  it('is unread where neither the bass nor the lead plays', () => {
    expect(readStyle([note('drums', 0)]).bite).toBeUndefined();
  });
});

describe('reading a style from notes: density', () => {
  it('counts onsets per step of the bar, and a chord’s notes at one step as one onset', () => {
    expect(readStyle([note('pad', 0), note('pad', 0, 1, 64), note('pad', 0, 1, 67), note('lead', 8)]).density).toBe(2 / 16);
  });

  it('reads an empty bar as silent, on no axis', () => {
    expect(readStyle([])).toEqual({ density: 0 });
  });
});

describe('reading a style from timing: bpm', () => {
  const bar = (bpm: number) => range(16).map(() => ({ length: 15 / bpm }));

  it.each([60, 90, 120, 148, 180])('reads the tempo from how long the steps last: %s bpm', (bpm) => {
    expect(readTiming(bar(bpm)).bpm).toBeCloseTo(bpm, 9);
  });

  it('reads no tempo from no steps', () => {
    expect(readTiming([])).toEqual({});
  });
});

describe('a style read on other meters', () => {
  const bars = Object.entries(JAMBOT_BARS);

  it('reads a bar’s density over its own steps (finite: every meter)', () => {
    for (const [sig, bar] of bars) {
      expect([
        sig,
        readStyle(
          range(bar.steps).map((s) => note('bass', s)),
          bar,
        ).density,
      ]).toEqual([sig, 1]);
      expect([sig, readStyle([note('bass', 0)], bar).density]).toEqual([sig, 1 / bar.steps]);
    }
  });

  it('counts a note off its meter’s pulses and off its eighths as syncopated, and no other (finite: every meter, every step)', () => {
    for (const [sig, bar] of bars)
      for (const step of range(bar.steps)) {
        const onGrid = bar.pulses.includes(step) || step % 2 === 0;
        expect([sig, step, readStyle([note('lead', step)], bar).sync]).toEqual([sig, step, onGrid ? 0 : 1]);
      }
  });

  it('reads a note’s share of the gap to the bar’s end in the meter’s bar, not 4/4’s', () => {
    for (const [sig, bar] of bars) {
      expect([sig, readStyle([note('bass', 0, bar.steps)], bar).bite]).toEqual([sig, 0]);
      expect([sig, readStyle([note('bass', 0, bar.steps / 2)], bar).bite]).toEqual([sig, 0.5]);
    }
  });
});
