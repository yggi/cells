import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { durationText, pieceTime } from './duration';
import { PRESETS } from './presets';

const time = (key: string) => pieceTime(compileSource((PRESETS as Record<string, { source: string }>)[key].source));

describe('how long a piece is', () => {
  it('a piece that ends: when', () => {
    expect(time('pop').ends).toBeCloseTo(96, 6);
    expect(time('bwv847').ends).toBeGreaterThan(180);
  });
  it('a loop: when every layer is back together', () => {
    expect(time('korobeiniki').cycle).toBeCloseTo(200, 3); // five sections of 13⅓ s, and the 40 s of its parts
    expect(time('royal').cycle).toBeCloseTo(1200, 1); // 12 keys × 7 modes of a 14 s theme
    expect(time('metronome').cycle).toBeCloseTo(2.4, 6); // a bar at 100
  });
  it('chance: the notes differ every time round, whatever the cycle', () => {
    expect(time('cellscape2').chance).toBe(true);
    expect(time('cellscape2').cycle).toBeGreaterThan(86400);
    expect(time('royal').chance).toBe(false);
  });
  it('in words', () => {
    expect([13, 320, 11520, 950400, 3.2e10, 3.2e20].map(durationText)).toEqual(['0:13', '5:20', '3 h 12 min', '11 days', '1,014 years', '10^13 years']);
  });
});
