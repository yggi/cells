import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { anchoredAt, durationText, pieceTime } from './duration';
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

describe('a piece anchored to the clock', () => {
  it('starts where the day stands: anchor=11.55 at 12:00:30 is 5½ minutes in', () => {
    const r = compileSource(PRESETS.fiveto12.source);
    expect(anchoredAt(r, new Date(2026, 0, 1, 12, 0, 30))).toBe(330);
    // (before the anchor: the day before's run, still going)
    expect(anchoredAt(r, new Date(2026, 0, 1, 11, 54, 0))).toBe(86400 - 60);
  });
  it("reads a clock's anchor, not one left on a law (#160)", () => {
    const law = (day: string) =>
      `&day scan(1!24) loop=1d ${day}\n&cycle law=fiveto12 over=&day step=84bpm anchor=13.55\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&cycle * &v]`;
    expect(anchoredAt(compileSource(law('anchor=11.55')), new Date(2026, 0, 1, 12, 0, 30))).toBe(330);
    expect(anchoredAt(compileSource(law('')), new Date(2026, 0, 1, 12, 0, 30))).toBeNull();
  });
  it('has no anchor otherwise', () => {
    expect(anchoredAt(compileSource(PRESETS.metronome.source), new Date())).toBeNull();
  });
});

describe('a turning table’s loop: where its turns wrap (its cycle=, else its own number of steps)', () => {
  const piece = (table: string) => `&bar step=1 0\n${table}\n&t over=&k step=&bar 0\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
  it('a braid of three chords, a step a second: home after three', () => {
    expect(pieceTime(compileSource(piece('&k step=&bar [0,4,7] [2,5,9] [4,7,11]'))).cycle).toBe(3);
  });
  it('cycle=2 on a scale of seven: home after two, not seven', () => {
    expect(pieceTime(compileSource(piece('&k scan(2 2 1 2 2 2 1) step=&bar stride=1 cycle=2'))).cycle).toBe(2);
  });
  it('a whole tone a turn with cycle=24: home after twelve (an octave after six is not home)', () => {
    expect(pieceTime(compileSource(piece('&k step=&bar stride=2 cycle=24'))).cycle).toBe(12);
  });
});
