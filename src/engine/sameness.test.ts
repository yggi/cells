import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { PRESETS } from './presets';
import { playsSameNotes, samePiece, SAMENESS_SECONDS, soundsIdentical, wholeWindow, WHOLE_PIECE_LIMIT } from './sameness';

// A line that ends (laps=1) 80 s in, at 60 bpm: one note a second, the last after the first minute.
const ENDS = (last: string, gain = '.5') => `&bar meter("4/4") step=60bpm
&tune over=scale(major) step=4n laps=1 0!79 ${last}
&lead s=sine loop=C4
&out map=sample [&tune * &lead * ${gain}]`;
const window = (a: string, b: string) => wholeWindow(compileSource(a), compileSource(b));

describe('the equalities a tool promises, over their window (#180)', () => {
  it('S1, sounds identical, sees the whole piece where it ends: a note after the first minute counts', () => {
    expect(window(ENDS('4'), ENDS('4'))).toBeCloseTo(80, 6);
    expect(samePiece(ENDS('4'), ENDS('5'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('5'))).toBe(false);
    expect(soundsIdentical(ENDS('4'), ENDS('4'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('5'), SAMENESS_SECONDS)).toBe(true);
  });

  it('S2, plays the same notes, leaves gains free; S1 does not', () => {
    expect(playsSameNotes(ENDS('4'), ENDS('4', '.25'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('4', '.25'))).toBe(false);
    expect(playsSameNotes(ENDS('4'), ENDS('5', '.25'))).toBe(false);
  });

  it('a piece that goes on is compared over its first minute, a day-long one over twenty minutes', () => {
    const loops = ENDS('4').replace(' laps=1', '');
    expect(window(loops, loops)).toBe(SAMENESS_SECONDS);
    expect(window(ENDS('4'), loops)).toBeCloseTo(80, 6);
    expect(window(PRESETS.fiveto12!.source, PRESETS.fiveto12!.source)).toBe(WHOLE_PIECE_LIMIT);
  });

  it('BWV 847 by hand sounds identical to the text the generator wrote, all 189 s of it (#181)', () => {
    const generated = readFileSync('fixtures/bwv847-generated.cells', 'utf8');
    expect(window(PRESETS.bwv847!.source, generated)).toBeGreaterThan(180);
    expect(soundsIdentical(PRESETS.bwv847!.source, generated)).toBe(true);
  });

  it('a text that does not compile is the same as nothing', () => {
    expect(soundsIdentical('&a over=&nowhere 0', '&a over=&nowhere 0')).toBe(false);
  });
});
