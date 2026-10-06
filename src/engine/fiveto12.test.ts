import { describe, expect, it } from 'vitest';
import { BAR, BLOCK, DAY, DAY_MODES, KEY, MODE_NAMES, SECONDS_PER_STEP, barOf, modeSemis, notesBetween, place, rowOf, tonicOf } from './fiveto12';

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const stepAt = (secondsAfter1155: number) => Math.round(secondsAfter1155 / SECONDS_PER_STEP);

describe('the 5 to 12 cycle: the arithmetic', () => {
  it('a day is 24 hours: 12 blocks × 12 keys × 840 steps at 84 a minute', () => {
    expect(DAY * SECONDS_PER_STEP).toBeCloseTo(86400, 6);
    expect(KEY).toBe(840);
    expect(KEY).toBe(12 * 70);
  });
  it('noon falls at the exact middle of the first key; midnight at the middle of block 7’s first', () => {
    const noon = place(stepAt(5 * 60));
    expect([noon.block, noon.key, stepAt(5 * 60) % KEY]).toEqual([0, 0, KEY / 2]);
    const midnight = stepAt(12 * 3600 + 5 * 60);
    expect([place(midnight).block, place(midnight).key, midnight % KEY]).toEqual([6, 0, KEY / 2]);
  });
  it('the modes of the day: down from Ionian to Locrian, up from Phrygian to Lydian', () => {
    expect(DAY_MODES.map((m) => MODE_NAMES[m])).toEqual([
      'Ionian',
      'Mixolydian',
      'Dorian',
      'Aeolian',
      'Phrygian',
      'Locrian',
      'Phrygian',
      'Aeolian',
      'Dorian',
      'Mixolydian',
      'Ionian',
      'Lydian',
    ]);
  });
  it('the keys: by fifths going down, by fourths coming up — all twelve each block, every block from C', () => {
    expect(Array.from({ length: 12 }, (_, k) => NAMES[tonicOf(0, k)]).join(' ')).toBe('C G D A E B F♯ C♯ A♭ E♭ B♭ F');
    expect(Array.from({ length: 12 }, (_, k) => NAMES[tonicOf(6, k)]).join(' ')).toBe('C F B♭ E♭ A♭ C♯ F♯ B E A D G');
    for (let b = 0; b < 12; b++) expect(new Set(Array.from({ length: 12 }, (_, k) => tonicOf(b, k))).size).toBe(12);
  });
});

describe('the law of a key: use all 7, 2 times, full circle, in 5 different ways', () => {
  it('every bar of the day: 7 onsets in its 12 steps, all 7 degrees once, nothing outside the mode', () => {
    for (let block = 0; block < 12; block++)
      for (let key = 0; key < 12; key++) {
        const mode = DAY_MODES[block];
        const inMode = new Set(modeSemis(mode).map((s) => (s + tonicOf(block, key)) % 12));
        for (let bar = 0; bar < 70; bar++) {
          const os = barOf(block, key, bar);
          expect(os).toHaveLength(7);
          expect(new Set(os.map((o) => o.at)).size).toBe(7);
          expect(os.reduce((a, o) => a + o.dur, 0)).toBe(BAR);
          expect([...os.map((o) => o.degree)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
          const s0 = block * BLOCK + key * KEY + bar * BAR;
          for (const n of notesBetween(s0, s0 + BAR)) expect(inMode.has(((n.semis % 12) + 12) % 12)).toBe(true);
        }
      }
  });
  it('2 times: bars 36 … 70 mirror bars 35 … 1 — retrograde in time, inverted in degree', () => {
    for (let bar = 0; bar < 35; bar++) {
      const a = barOf(3, 5, bar);
      const m = barOf(3, 5, 69 - bar);
      expect(m.map((o) => o.at).sort((x, y) => x - y)).toEqual(a.map((o) => BAR - o.at - o.dur).sort((x, y) => x - y));
      expect(m.map((o) => o.degree).sort()).toEqual(a.map((o) => (7 - o.degree) % 7).sort());
    }
  });
  it('full circle: in a phrase, each bar starts the row on the next degree', () => {
    const row = rowOf(2, 4);
    const firsts = Array.from({ length: 7 }, (_, b) => barOf(2, 4, 7 + b)[0]);
    expect(firsts.map((o) => o.at)).toEqual(new Array(7).fill(0));
    expect(
      new Set(
        Array.from({ length: 7 }, (_, b) =>
          barOf(2, 4, 14 + b)
            .map((o) => o.degree)
            .join(''),
        ),
      ).size,
    ).toBe(7);
    expect(row).toHaveLength(7);
  });
  it('5 ways: each phrase moves its own dimension (harmony inverted in phrase 3)', () => {
    const plain = barOf(0, 0, 21).map((o) => o.density);
    const harm = barOf(0, 0, 14).map((o) => o.density);
    expect(harm.every((d) => d >= 1 && d <= 7)).toBe(true);
    expect(plain.every((d) => d >= 1 && d <= 7)).toBe(true);
    // the row's densities 1 … 7 in phrase 3 are 8 − what phrase 4 would give in the same rotation
    const p3 = barOf(0, 0, 14 + 3).map((o) => o.density);
    const p4 = barOf(0, 0, 21 + 3).map((o) => o.density);
    expect(p3.map((d) => 8 - d)).toEqual(p4);
  });
});

describe('5 to 12 in the studio: law=fiveto12 plays the day', () => {
  it('the first bar (11:55): C Ionian, 7 onsets; a day long, in twelve blocks', async () => {
    const { compileSource } = await import('./compile');
    const { codeShifts } = await import('./program');
    const { eventsBetween, plan } = await import('./realize');
    const { pieceTime, sections } = await import('./duration');
    const { PRESETS } = await import('./presets');
    const r = compileSource((PRESETS as Record<string, { source: string }>).fiveto12.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 12 * SECONDS_PER_STEP - 1e-6);
    expect(new Set(ev.map((e) => e.at.toFixed(3))).size).toBe(7);
    expect([...new Set(ev.map((e) => ((Math.round(12 * Math.log2(e.freq / 261.63)) % 12) + 12) % 12))].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(pieceTime(r).ends).toBe(86400);
    expect(sections(r)!.map((s) => s.label.split(' · ')[0])).toEqual(DAY_MODES.map((m) => MODE_NAMES[m]));
  });
});
