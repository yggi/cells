import { describe, expect, it } from 'vitest';
import { BUILT_IN, lawAt, lawIn, lawOf, marksOf, unitOf } from './fills';
import * as deprecated from './holes';
import { BAR, BLOCK_NAMES, DAY_MODES, KEY, MODE_NAMES, notesBetween, SECONDS_PER_STEP, START } from './fiveto12';
import { compileSource } from './compile';
import { expand } from './use';
import { resolveSeed } from '../repository/library';
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
  // (a piece's copy of the fragment file, #792: its fills each carrying its first lap, `fill(five_to_twelve, notes, &day) …`)
  const copy = expand('&day scan(1!24) loop=1d\n&cycle from five_to_twelve &day\n&glass s=tri loop=C4\n&out map=sample [&cycle * &glass * .3]', resolveSeed)
    .split('\n')
    .filter((l) => l.startsWith('&cycle'));
  it("every lap it fills, written in place of the copy's first, is cells that compile with no diagnostics", () => {
    for (const lap of LAPS) {
      const lines = copy.map((l) => {
        const m = /fill\(five_to_twelve, (\w+), &day\).*$/.exec(l);
        const x = m ? law.fills[m[1]!] : undefined;
        return m && x?.lap ? l.replace(m[0], law.fill(m[1]!, Math.floor((lap * BAR) / x.lap), {})) : l;
      });
      const r = compileSource(`${lines.join('\n')}\n&v s=sine loop=C4\n&out map=sample [&cycle * &v]`);
      expect(r.diagnostics, `lap ${lap}`).toEqual([]);
    }
  });
  it('five_to_twelve, bar 0 (11:55): C Ionian, its copy’s first lap as the decision shows it', () => {
    expect(copy).toEqual([
      '&cycle [&cycle_notes * &cycle_level]',
      '&cycle_notes over=&cycle_key pan=&cycle_space step=1 fill(five_to_twelve, notes, &day) [1, 3]@2 [5, 7, 9, 11, 13, 15]@2 [2, 4, 6] [6, 8, 10, 12, 14, 16, 18]@2 [3, 5, 7, 9]@2 0@2 [4, 6, 8, 10, 12]',
      '&cycle_level map=amp step=1 fill(five_to_twelve, level, &day) 0.4@2 0.84@2 0.51 0.18@2 0.62@2 0.29@2 0.73',
      '&cycle_space map=lin step=1 fill(five_to_twelve, space, &day) 1/2@2 0@2 2/3 1/6@2 5/6@2 1/3@2 1',
      '&cycle_mode fill(five_to_twelve, mode, &day) ionian',
      '&cycle_tonic fill(five_to_twelve, tonic, &day) C',
      // (its key the diatonic fragment's, `&key from diatonic(mode=&mode) &tonic`, expanded after the copy's own lines)
      '&cycle_key scale(even(7, 12, &cycle_mode), &cycle_tonic)',
    ]);
    expect(unitOf(law)).toBe(BAR);
    expect(lawOf({ law: 'fiveto12' })).toBe(law);
    expect(lawOf({ law: 'elsewhere' })).toBeNull();
  });
});

describe("five_to_twelve played from a piece's copy, lap by lap, plays what the law played (#693, #792)", () => {
  const piece = (anchor: string) =>
    compileSource(`&day scan(1!24) loop=1d anchor=${anchor}\n&cycle from five_to_twelve &day\n&glass s=tri loop=C4\n&out map=sample [&cycle * &glass * .3]`, undefined, {
      resolve: resolveSeed,
    });
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
    // (what a frontend reads: the law a program plays, and the one on a clock, the sun's day)
    expect(lawIn(r)).toBe(law);
    expect([lawAt(r, 'day'), lawAt(r, 'glass')]).toEqual([law, null]);
  });
});

describe('engine/holes.ts, deprecated for one minor (#727): the same functions under the old path', () => {
  it('re-exports what a frontend pinned at v0.25.0 imports from it', () => {
    expect(deprecated.lawOf).toBe(lawOf);
    expect(deprecated.BUILT_IN).toBe(BUILT_IN);
    expect([deprecated.marksOf, deprecated.unitOf]).toEqual([marksOf, unitOf]);
  });
});

describe('a law taken with from (decision 085 §2, rung 5 of #691)', () => {
  const day = '&day scan(1!24) loop=1d anchor=6.30\n';
  const tail = '\n&glass s=tri loop=C4\n&out map=sample [&cycle * &glass * .3]';
  const run = (line: string) => {
    const r = compileSource(day + line + tail, undefined, { resolve: resolveSeed });
    return { messages: r.diagnostics.map((d) => d.message), events: JSON.stringify(eventsBetween(plan(r, codeShifts(r)), 0, 60)) };
  };
  it('from five_to_twelve, its fragment file resolved by the library (decision 090), plays what law= played', () => {
    const now = run('&cycle from five_to_twelve &day');
    expect(now.messages).toEqual([]);
    expect(now.events).toBe(run('&cycle law=fiveto12 over=&day step=84bpm').events);
    expect(now.events.length).toBeGreaterThan(1000);
    // (no built-in is resolved behind the host's back: with no library, it says so)
    expect(compileSource(day + '&cycle from five_to_twelve &day' + tail).diagnostics[0]?.message).toMatch(/No library to use "?five_to_twelve"? from/);
  });
  it('law= warns where the piece writes it, not where the fragment does', () => {
    expect(run('&cycle law=fiveto12 over=&day step=84bpm').messages).toEqual([
      'law=fiveto12 is the old way: write &cycle from five_to_twelve &day, the law taken from its clock (decision 085; Migrate rewrites it)',
    ]);
    expect(run('&cycle label="the law" from five_to_twelve &day').messages).toEqual([]);
  });
});
