import { describe, expect, it } from 'vitest';
import { BUILT_IN, filledAt, lawOf, marksOf, unitOf } from './fills';
import { BAR, BLOCK_NAMES, DAY_MODES, KEY, MODE_NAMES, notesBetween, SECONDS_PER_STEP, START } from './fiveto12';
import { compileSource } from './compile';
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';
import { pieceTime, sections } from './duration';

const law = BUILT_IN.get('fiveto12')!;
/** Laps across the day: every block, keys and bars spread through it. */
const LAPS = Array.from({ length: 24 }, (_, k) => k * 503 + (k % 7));

describe('a built-in plugin-fragment answers the contract (decision 085 §3, #693)', () => {
  it('the same fill, lap and arguments answer the same text', () => {
    for (const name of Object.keys(law.fills)) for (const lap of LAPS) expect(law.fill(name, lap, {})).toBe(law.fill(name, lap, {}));
  });
  it('every lap it fills is cells that compile with no diagnostics', () => {
    for (const lap of LAPS) {
      const r = compileSource(`${filledAt(law, lap)}\n&v s=sine loop=C4 ${law.voice ?? ''}\n&out map=sample [${law.plays} * &v]`);
      expect(r.diagnostics, `lap ${lap}`).toEqual([]);
    }
  });
  it('fiveto12, bar 0 (11:55): C Ionian, its first bar as the decision shows it', () => {
    expect(filledAt(law, 0)).toBe(
      [
        '&notes over=&key step=1 [1, 3]@2 [5, 7, 9, 11, 13, 15]@2 [2, 4, 6] [6, 8, 10, 12, 14, 16, 18]@2 [3, 5, 7, 9]@2 0@2 [4, 6, 8, 10, 12]',
        '&level map=amp step=1 0.4@2 0.84@2 0.51 0.18@2 0.62@2 0.29@2 0.73',
        '&space map=lin step=1 1/2@2 0@2 2/3 1/6@2 5/6@2 1/3@2 1',
        '&key scale(&mode, &tonic)',
        '&mode ionian',
        '&tonic C',
      ].join('\n'),
    );
    expect(unitOf(law)).toBe(BAR);
    expect(lawOf({ law: 'fiveto12' })).toBe(law);
    expect(lawOf({ law: 'elsewhere' })).toBeNull();
  });
});

describe('law=fiveto12 read through the language plays what it played (#693)', () => {
  const piece = (anchor: string) =>
    compileSource(`&day scan(1!24) loop=1d anchor=${anchor}\n&cycle law=fiveto12 over=&day step=84bpm\n&glass s=tri loop=C4\n&out map=sample [&cycle * &glass * .3]`);
  /** What the law played before it was a plugin-fragment: its notes as semitones, placed by its own space. */
  const before = (r: ReturnType<typeof piece>, anchor: number, from: number, to: number) => {
    const sec = (h: number) => Math.floor(h) * 3600 + Math.round((h % 1) * 100) * 60;
    const off = Math.round(((((sec(anchor) - START) % 86400) + 86400) % 86400) / SECONDS_PER_STEP);
    const base = r.cells.get('glass')!.freq;
    return notesBetween(Math.ceil(from / SECONDS_PER_STEP - 1e-9) + off, Math.ceil(to / SECONDS_PER_STEP - 1e-9) + off).map((n) => [
      +((n.step - off) * SECONDS_PER_STEP).toPrecision(9),
      +(n.dur * SECONDS_PER_STEP).toPrecision(9),
      +(base * Math.pow(2, n.semis / 12)).toPrecision(9),
      +n.level.toPrecision(9),
      +(0.3 * Math.min(1, 1 - n.pan)).toPrecision(9),
      +(0.3 * Math.min(1, 1 + n.pan)).toPrecision(9),
    ]);
  };
  // the first 20 minutes from three moments of the day: 6:00, the law's own 11:55, and 23:50
  for (const anchor of ['6.00', '11.55', '23.50'])
    it(`from ${anchor}: the same notes, lengths, pitches, levels and places over 20 minutes`, () => {
      const r = piece(anchor);
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const now = eventsBetween(plan(r, codeShifts(r)), 0, 1200).map((e) => [e.at, e.dur, e.freq, e.levels[0]!.level, e.gains[0], e.gains[1]].map((x) => +x.toPrecision(9)));
      expect(now.length).toBeGreaterThan(1000);
      expect(now).toEqual(before(r, Number(anchor), 0, 1200));
    });
  it('its length is its cycle, a day, and its sections are its mark: twelve blocks, each a mode', () => {
    const r = piece('11.55');
    expect(pieceTime(r).ends).toBe(86400);
    expect(sections(r)).toEqual(DAY_MODES.map((m, b) => ({ at: b * 7200, label: `${MODE_NAMES[m]} · ${BLOCK_NAMES[b]}` })));
    expect(marksOf(law)).toHaveLength(12);
    expect(law.cycle / KEY).toBe(144);
  });
});
