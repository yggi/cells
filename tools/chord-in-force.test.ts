import { describe, expect, it } from 'vitest';
import {
  BARS,
  READINGS,
  anchorVoicings,
  barCharacters,
  barUnder,
  chordTonesComposed,
  distinctBars,
  harmonyCharacters,
  indexOf,
  keyOf,
  kinds,
  linesOverChord,
  nextChordTones,
  sectionUnder,
  sections,
  wordsOf,
} from './chord-in-force.ts';

// The numbers docs/notes/95-chord-in-force.md quotes, over E33's 384 bars (fixtures/jambot-chord-in-force.json).
const SECTIONS = sections();
const BY_READING = Object.fromEntries(
  READINGS.map((r) => {
    const bars = BARS.map((b) => barUnder(b, r));
    const secs = SECTIONS.map((s) => sectionUnder(s, r));
    const sum = (xs: readonly { matched: number }[]) => xs.reduce((n, x) => n + x.matched, 0);
    return [
      r,
      {
        bars: sum(bars),
        barsEqual: bars.filter((b) => b.matched === b.want).length,
        sections: sum(secs),
        sectionsEqual: secs.filter((s) => s.matched === s.want).length,
        overChord: secs.reduce((n, s) => n + s.overChord.length, 0),
        characters: secs.reduce((n, s) => n + Object.values(s.chars).reduce((a, b) => a + b, 0), 0),
        diagnostics: [...bars, ...secs].flatMap((x) => x.diagnostics),
      },
    ];
  }),
);

describe('the chord in force, over E33’s 384 bars (#95)', () => {
  it('the fixture is E33’s: 384 bars, 2,979 bass, pad and stab notes, 23 sections of one key', () => {
    expect(BARS.length).toBe(384);
    expect(BARS.reduce((n, b) => n + b.notes.length, 0)).toBe(2979);
    expect(SECTIONS.length).toBe(23);
    expect(BARS.filter((b) => b.chords.length > 1).length).toBe(6);
  });

  it('2,862 notes are tones of the chord sounding, and each is an index into it with no accidental', () => {
    expect(chordTonesComposed()).toEqual({ bass: [868, 927], pad: [678, 678], stab: [1316, 1374] });
    expect(kinds()).toEqual({
      bass: { tone: 868, beside: 34, off: 25 },
      pad: { tone: 678, beside: 0, off: 0 },
      stab: { tone: 1316, beside: 58, off: 0 },
    });
    // of the notes off the chord, the next bar's chord holds 52 of the stab's 58 and 31 of the bass's 59
    expect(nextChordTones()).toEqual({ bass: 31, pad: 0, stab: 52 });
  });

  it('an index past the chord’s last tone is the chord a lap up; an accidental, a degree of the key', () => {
    const key = keyOf('&key scale(aeolian, A)');
    const am7 = wordsOf('[0,2,4,6]')[0]!.tones;
    // from C1: A1 C2 E2 G2, then A2 (45) at index 4; B1 (35) is 0# (#95's witness)
    expect([33, 36, 40, 43, 45, 31].map((m) => indexOf(key, 24, am7, m))).toEqual([0, 1, 2, 3, 4, -1].map((n) => ({ n, alter: 0 })));
    expect(indexOf(key, 24, am7, 35)).toEqual({ n: 0, alter: 1 });
  });

  it('lines: 781 of 802 can read the chord in force, 720 with whole indices alone (Strudel’s n)', () => {
    expect(linesOverChord()).toEqual({ lines: 802, any: 781, integers: 720 });
  });

  it('cells plays E33’s text, and the lowering of the chord in force, as the band in every bar and section', () => {
    for (const r of ['e33', 'inForce', 'integers']) {
      expect(BY_READING[r]!.bars).toBe(2979);
      expect(BY_READING[r]!.barsEqual).toBe(384);
      expect(BY_READING[r]!.sections).toBe(2979);
      expect(BY_READING[r]!.sectionsEqual).toBe(23);
      expect(BY_READING[r]!.diagnostics).toEqual([]);
    }
  });

  it('over=&harm as cells reads it today: 380 of 384 bars, and no section, play the band’s notes', () => {
    expect(BY_READING.today).toMatchObject({ bars: 2969, barsEqual: 380, sections: 1688, sectionsEqual: 0, diagnostics: [] });
  });

  it('characters: an index is no shorter than a degree; a section text states the harmony once', () => {
    expect(barCharacters()).toEqual({ e33: 32694, chord: 33410, pick: 35753, integers: 33261 });
    expect(Object.fromEntries(READINGS.map((r) => [r, [BY_READING[r]!.overChord, BY_READING[r]!.characters]]))).toEqual({
      e33: [0, 13070],
      today: [53, 12888],
      inForce: [53, 12888],
      integers: [35, 12910],
    });
    expect(distinctBars()).toEqual({ key: 488, chord: 448 });
    expect(harmonyCharacters()).toEqual({ bar: 12921, barCells: 19941, section: 4293, sectionCells: 5161 });
  });

  it('the comp’s stacks over the chord in force: 543 of 599 close, 411 the stack one anchor (F♯4) chooses', () => {
    expect(anchorVoicings()).toEqual({ stacks: 599, close: 543, anchor: 66, count: 411 });
  });
});
