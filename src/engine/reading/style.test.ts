// Lifted from yggi/jambot packages/engine/src/style-reading.test.ts @ a34d13c6 (all but the tests that read Jambot's
// band, which stay there): `artic` is `bite`, and a bar is cells' (`barOf`).
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { BAR_4_4, type Bar, barOf, levelOf, type Part, readStyle, readTiming, syncopation } from './style';

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

describe('reading a style from notes: sync, syncopation proper (#681)', () => {
  it('reads none where every onset is on a beat or an eighth and its line strikes the next stronger place', () => {
    expect(readStyle([0, 2, 4, 6, 8, 10, 12, 14].map((s) => note('lead', s))).sync).toBe(0);
    expect(readStyle([0, 4, 8, 12].map((s) => note('lead', s))).sync).toBe(0);
  });

  it('reads an onset whose line leaves the next stronger place silent, by how much weaker its place is, over 3', () => {
    // (the and of one before a silent two: an eighth before a pulse, one level; a sixteenth before a silent eighth, one; before a silent pulse, two)
    expect(readStyle([note('lead', 0), note('lead', 2)]).sync).toBeCloseTo(1 / 6, 12);
    expect(syncopation([note('lead', 1)])).toBeCloseTo(1 / 3, 12);
    expect(syncopation([note('lead', 3)])).toBeCloseTo(2 / 3, 12);
    // (the bar is a cycle: a sixteenth before the downbeat, its line silent there, is the deepest, 3; the pulse on 8 is
    // struck again at 15 before the downbeat comes, so it isn't syncopated)
    expect(syncopation([note('lead', 15), note('lead', 8)])).toBeCloseTo(3 / 6, 12);
  });

  it('reads the clave and the tresillo, which the onsets on the grid alone read as none', () => {
    expect(syncopation([0, 6, 12].map((s) => note('drums', s, 1, 75)))).toBeCloseTo(1 / 9, 12);
    expect(syncopation([4, 8].map((s) => note('drums', s, 1, 75)))).toBeCloseTo(1 / 6, 12);
    expect(syncopation([2, 6, 10, 14].map((s) => note('lead', s)))).toBeCloseTo(5 / 12, 12);
  });

  it('reads each line once, a drum by its note: steady hats don’t drown a syncopated kick', () => {
    const kick = [0, 6, 12].map((s) => note('drums', s, 1, 36));
    const hats = [0, 2, 4, 6, 8, 10, 12, 14].map((s) => note('drums', s, 1, 42));
    expect(readStyle([...kick, ...hats]).sync).toBeCloseTo(1 / 9 / 2, 12);
  });

  it('keeps to 0 to 1 over every set of a line’s onsets in a bar of 4/4 (finite: all 2^16)', () => {
    for (let mask = 1; mask < 1 << 16; mask++) {
      const v = syncopation(
        range(16)
          .filter((s) => mask & (1 << s))
          .map((s) => note('lead', s)),
      );
      if (v < 0 || v > 1) throw new Error(`${mask}: ${v}`);
    }
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

  it('reads a lone note on the downbeat as none, and on any other place as its level’s gap to the next stronger place, over 3 (finite: every meter, every step)', () => {
    for (const [sig, bar] of bars)
      for (const step of range(bar.steps)) {
        const w = levelOf(step, bar);
        let j = step + 1;
        while (j < step + bar.steps && levelOf(j % bar.steps, bar) >= w) j++;
        const expected = step === 0 ? 0 : (w - levelOf(j % bar.steps, bar)) / 3;
        expect([sig, step, readStyle([note('lead', step)], bar).sync]).toEqual([sig, step, expected]);
      }
  });

  it('reads a note’s share of the gap to the bar’s end in the meter’s bar, not 4/4’s', () => {
    for (const [sig, bar] of bars) {
      expect([sig, readStyle([note('bass', 0, bar.steps)], bar).bite]).toEqual([sig, 0]);
      expect([sig, readStyle([note('bass', 0, bar.steps / 2)], bar).bite]).toEqual([sig, 0.5]);
    }
  });
});
