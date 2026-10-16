// tools/groove.ts: the swing share of a pair, the pairs and bars a performance gives, the metric levels, and the command
// line over the committed fixture of three Groove MIDI files (fixtures/groove/, CC-BY 4.0).
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { agogicShares, levelOf, main, quantile, report, sampleOf, swingShare, swingShares, VELOCITY_LEVELS, type Onset, type Performance } from './groove';

const fixture = fileURLToPath(new URL('../fixtures/groove', import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A performance at 120 bpm (a beat each half second) for `bars` bars, its onsets at these beat positions, shifted by `ahead` seconds. */
function played(positions: readonly number[], bars = 8, ahead = 0): Performance {
  const beats = Array.from({ length: 4 * bars + 2 }, (_, k) => k / 2);
  const onsets: Onset[] = [];
  for (let bar = 0; bar < bars; bar++) for (const x of positions) onsets.push({ time: (4 * bar + x) / 2 - ahead, key: 42, velocity: 64 });
  onsets.push({ time: 2 * bars - ahead, key: 42, velocity: 64 });
  return { file: 'synthetic', style: 'test', onsets: onsets.sort((a, b) => a.time - b.time), beats };
}

/** 8ths swung 2:1: each beat's second onset two thirds of the way through it. */
const swungEighths = played([0, 2 / 3, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3, 3 + 2 / 3]);

/** The check the law of meaningful tests asks for: every 8th pair of a 2:1 swing measures 0.667. */
const expectTwoToOne = (shares: readonly number[]) => {
  expect(shares.length).toBe(32);
  for (const s of shares) expect(s).toBeCloseTo(0.667, 3);
};

describe('swingShare', () => {
  it('is the second onset’s place in the pair: 2:1 is 0.667, straight 0.5, 3:1 0.75', () => {
    expect(swingShare(0, 2, 3)).toBeCloseTo(0.667, 3);
    expect(swingShare(10, 10.25, 10.5)).toBe(0.5);
    expect(swingShare(0, 0.75, 1)).toBe(0.75);
  });
});

describe('swingShares', () => {
  it('measures a 2:1 swung pair of 8ths as 0.667, every pair', () => expectTwoToOne(swingShares(swungEighths, 1)));

  it('is shown firing: a share computed wrongly (the first part over the second, or against the grid) fails the check', () => {
    expect(() => expectTwoToOne(swingShares(swungEighths, 1, (a, b, c) => (b - a) / (c - b)))).toThrow();
    expect(() => expectTwoToOne(swingShares(swungEighths, 1, (a, b, c) => (c - b) / (c - a)))).toThrow();
    expect(() => expectTwoToOne(swingShares(played([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]), 1))).toThrow();
  });

  it('reads the pair between the onsets, so a drummer 30 ms ahead of the click measures the same', () => {
    expectTwoToOne(swingShares(played([0, 2 / 3, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3, 3 + 2 / 3], 8, 0.03), 1));
  });

  it('measures 16ths in half-beat pairs, and finds no 16th pairs in swung 8ths', () => {
    const swungSixteenths = played([0, 0.3, 0.5, 0.8, 1, 1.3, 1.5, 1.8, 2, 2.3, 2.5, 2.8, 3, 3.3, 3.5, 3.8]);
    const shares = swingShares(swungSixteenths, 0.5);
    expect(shares).toHaveLength(64);
    for (const s of shares) expect(s).toBeCloseTo(0.6, 9);
    // a swung 8th at 2/3 of the beat is more than a quarter of a half-beat pair from its 16th slot at 1/2
    expect(swingShares(swungEighths, 0.5)).toEqual([]);
  });

  it('takes an onset only within a quarter of the pair of its slot: 4:1 is not a pair, 3:1 is', () => {
    expect(swingShares(played([0, 0.8, 1, 1.8, 2, 2.8, 3, 3.8]), 1)).toEqual([]);
    expect(swingShares(played([0, 0.75, 1, 1.75, 2, 2.75, 3, 3.75]), 1).every((s) => s === 0.75)).toBe(true);
  });

  it('measures nothing where a slot is empty: quarter notes alone give no 8th pairs', () => {
    expect(swingShares(played([0, 1, 2, 3]), 1)).toEqual([]);
  });
});

describe('agogicShares', () => {
  it('reads each beat’s share of the bar, as scan(27 23 26 24) writes it', () => {
    const bars = agogicShares(played([0, 1.08, 2, 3.04]));
    expect(bars).toHaveLength(8);
    for (const bar of bars) [0.27, 0.23, 0.26, 0.24].forEach((share, i) => expect(bar[i]).toBeCloseTo(share, 9));
  });

  it('needs an onset near every beat and the next downbeat', () => {
    expect(agogicShares(played([0, 1, 3]))).toEqual([]);
  });
});

describe('levelOf', () => {
  it('names a 16th’s place in a 4/4 bar: downbeat, beat 3, beats 2 and 4, 8th and 16th off-beats', () => {
    const { beats } = played([]);
    const levels = [0, 0.25, 0.5, 1, 1.75, 2, 3, 3.5, 4, 4.02].map((x) => VELOCITY_LEVELS[levelOf(beats, x / 2)]);
    expect(levels).toEqual([
      'downbeat (*)',
      '16th off-beats (,)',
      '8th off-beats (.)',
      'beats 2, 4 (+)',
      '16th off-beats (,)',
      'beat 3 (+)',
      'beats 2, 4 (+)',
      '8th off-beats (.)',
      'downbeat (*)',
      'downbeat (*)',
    ]);
  });
});

describe('quantile', () => {
  it('interpolates between neighbours', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([], 0.5)).toBeNaN();
  });
});

describe('report', () => {
  it('prints the 2:1 swing of a style as 0.667, and a wrong share function does not', () => {
    const sample = [0, 1, 2, 3].map((i) => ({ ...swungEighths, file: `swung${i}` }));
    expect(report(sample)).toMatch(/\| test \| 4 \| 0\.667 \| 0\.667–0\.667 \| 128 \(4\) \|/);
    expect(report(sample, (a, b, c) => (b - a) / (c - b))).not.toMatch(/\| test \| 4 \| 0\.667 \|/);
  });

  it('turns the velocities by level into dB from the downbeat through velocity = 127·√level: half the velocity is −12.0 dB', () => {
    const sixteenths = played(
      Array.from({ length: 16 }, (_, i) => i / 4),
      40,
    );
    const loud = { ...sixteenths, onsets: sixteenths.onsets.map((o) => ({ ...o, velocity: levelOf(sixteenths.beats, o.time) === 4 ? 60 : 120 })) };
    expect(report([0, 1, 2].map((i) => ({ ...loud, file: `loud${i}` })))).toContain('| all, in dB from the downbeat | +0.0 | +0.0 | +0.0 | +0.0 | −12.0 |');
  });

  it('names the performances that lean a beat, with their own medians', () => {
    const leaning = played([0, 1.08, 2, 3.04], 30);
    const printed = report([leaning, leaning, leaning, leaning]);
    expect(printed).toContain('`scan(27 23 26 24)` | 4 / 4 |');
    expect(printed).toContain('- synthetic (test, 120 bpm, 30 bars): 0.270 0.230 0.260 0.240');
    expect(report([swungEighths])).not.toContain('lean a beat');
  });

  it('says a median is too few rather than print it, under 3 performances or 100 pairs', () => {
    expect(report([swungEighths])).toMatch(/\| test \| 1 \| too few \(32 from 1\) \|/);
  });
});

describe('the fixture: three Groove MIDI files', () => {
  it('samples the two of 4/4 with a minute of playing, by style, and leaves the 28 s one out', () => {
    const sample = sampleOf(fixture);
    expect(sample.map((p) => [p.file, p.style])).toEqual([
      ['drummer3/session1/8_jazz_105_beat_4-4.mid', 'jazz'],
      ['drummer3/session2/16_rock_100_beat_4-4.mid', 'rock'],
    ]);
    expect(60 / (sample[0].beats[1] - sample[0].beats[0])).toBeCloseTo(105, 3);
  });

  it('measures what the files play: pairs, bars and shares as read', () => {
    const [jazz, rock] = sampleOf(fixture);
    const median = (xs: number[]) =>
      quantile(
        xs.sort((a, b) => a - b),
        0.5,
      );
    expect([swingShares(jazz, 1).length, swingShares(jazz, 0.5).length, agogicShares(jazz).length]).toEqual([124, 71, 30]);
    expect([swingShares(rock, 1).length, swingShares(rock, 0.5).length, agogicShares(rock).length]).toEqual([102, 22, 24]);
    expect(median(swingShares(jazz, 1))).toBeCloseTo(0.498, 3);
    expect(median(swingShares(jazz, 0.5))).toBeCloseTo(0.609, 3);
  });

  it('runs from the command line, and --list names the sample', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cells-groove-'));
    dirs.push(dir);
    const list = join(dir, 'sample.txt');
    expect(main([fixture, '--list', list])).toMatch(/^2 performances in 4\/4 with at least 60 s of playing, 2 styles\./);
    expect(readFileSync(list, 'utf8')).toBe('drummer3/session1/8_jazz_105_beat_4-4.mid\ndrummer3/session2/16_rock_100_beat_4-4.mid\n');
    expect(() => main([])).toThrow(/usage/);
  });
});
