// Vary's harmony operators (decision 052, point 8, rung 3; #208, yggi/jambot#425): on the 17 seed progressions
// (`fragments/harmony/`), each on a workbench of 4/4 and a key in C, major and minor, every variation compiles, plays
// other chords than its source and than the others, keeps every cadence step's chords (the last bar of each four-bar
// phrase) and does what its operator says: rotate and reverse each phrase between its cadences, a third moves one
// chord's every tone 2 degrees, a dominant is a major triad (a dominant seventh over a chord of four tones) a fifth above
// the next chord's root, on a step's second half. `variationBy` gives back each one from its `by:` alone; the line
// operators asked alone leave a progression be.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileSource } from '../compile';
import { flatten } from '../flatten';
import { resolveIn } from '../helix';
import { codeShifts, type CompileResult } from '../program';
import { seedFragments } from '../../repository/seed';
import { tapWhole } from './lines';
import { anchorsOf, HARMONY_OPERATORS, PITCHED_OPERATORS, readVariations, RHYTHM_OPERATORS, variationBy, variations, type Variation } from '.';

const HARMONIES = seedFragments('harmony');
const BENCH = (mode: string) => `&bar meter("4/4") step=120bpm\n&key scale(${mode}, C)`;
const MODES = ['major', 'minor'] as const;
const OPTIONS = (mode: string) => ({ workbench: BENCH(mode), operators: HARMONY_OPERATORS });

const compiled = (text: string, mode: string): CompileResult => {
  const result = compileSource(`${BENCH(mode)}\n${text}`);
  if (!result.ok) throw new Error(`does not compile:\n${text}`);
  return result;
};

/** A harmony's chords as they sound: each event's onset, length and pitch in semitones over the root grid. */
const chordsOf = (text: string, mode: string) => {
  const result = compiled(text, mode);
  const shifts = codeShifts(result);
  return flatten(result, 'harm', shifts).map((e) => ({
    step: e.step,
    duration: e.duration,
    pitch: Math.round(resolveIn(result, e.table, e.tableShift, e.value, e.alter, shifts).position * 1000) / 1000,
  }));
};
const sounding = (text: string, mode: string) =>
  chordsOf(text, mode)
    .map((e) => `${e.step}:${e.duration}:${e.pitch}`)
    .sort()
    .join(' ');

// Each seed's variations, in major and minor: 789 in all (394 and 395): 332 thirds, 316 substitutions, 54 swaps, 24
// rotations, 18 retrogrades and 45 dominants. A vamp of one or two chords varies by its thirds and its substitutions
// alone: no rotation, retrograde or swap of a run of one chord changes it, and no dominant leads into a chord the same as
// the one before it. The minor key gives one dominant more, the axis progression's into its VII (B♭), which in major is
// a diminished triad (B D F). A move that plays what one before it played is left out (I vi IV V's `substitute &harm 1 2`
// is its `third &harm 1 -2`).
const COUNTS: Record<string, Record<(typeof MODES)[number], number>> = {};

describe('Vary on a progression (decision 052, point 8)', () => {
  for (const mode of MODES)
    describe(`in C ${mode}`, () => {
      for (const { id, text } of HARMONIES) {
        const all = variations(text, OPTIONS(mode));
        (COUNTS[id] ??= { major: 0, minor: 0 })[mode] = all.length;

        it(`${id}: varies, and every variation compiles, plays other chords than its source and the others`, () => {
          expect(all.length).toBeGreaterThan(0);
          const heard = new Set([sounding(text, mode)]);
          for (const v of all) {
            const s = sounding(v.apply(text), mode);
            expect(heard.has(s), v.by).toBe(false);
            heard.add(s);
          }
        });

        it(`${id}: keeps its cadence, the last bar of each four-bar phrase`, () => {
          const cadence = anchorsOf(text, BENCH(mode)).filter((a) => a.reason === 'cadence');
          expect(cadence.length).toBeGreaterThan(0);
          const at = (t: string) => chordsOf(t, mode).filter((e) => cadence.some((a) => Math.floor(e.step) === a.step));
          for (const v of all) expect(at(v.apply(text)), v.by).toEqual(at(text));
        });

        it(`${id}: each variation is the one its by: names, and does what it says`, () => {
          for (const v of all) {
            expect(variationBy(text, v.by, OPTIONS(mode))?.after, v.by).toBe(v.after);
            check(v, text, mode);
          }
        });
      }
    });

  it('gives 789 variations of the 17 seeds, 394 in C major and 395 in C minor', () => {
    const total = (mode: (typeof MODES)[number]) => Object.values(COUNTS).reduce((sum, c) => sum + c[mode], 0);
    expect([total('major'), total('minor')]).toEqual([394, 395]);
  });

  it('varies every seed in under 10 ms, its compile included: the median of 7 runs, as a collection or a busy runner stalls one', () => {
    for (const { id, text } of HARMONIES) {
      variations(text, OPTIONS('major'));
      expect(
        medianMs(() => variations(text, OPTIONS('major'))),
        id,
      ).toBeLessThan(10);
    }
  });

  it('leaves a progression be where only the line operators are asked', () => {
    for (const { text } of HARMONIES) {
      expect(variations(text, { workbench: BENCH('major'), operators: RHYTHM_OPERATORS })).toEqual([]);
      expect(variations(text, { workbench: BENCH('major'), operators: PITCHED_OPERATORS })).toEqual([]);
    }
  });

  it("keys a progression's chords for recognition as its events: the same notes as before rung 3", () => {
    // (each chord's tone as harmoniesOf keyed an event before: onset, length, table, degree, accidental)
    for (const { id, text } of HARMONIES) {
      const result = compiled(text, 'major');
      const whole = tapWhole(result.cells.get('harm')!.step!.tap, result.cells.get('bar')!.meter)!;
      const fromEvents = flatten(result, 'harm', codeShifts(result))
        .map((e) => `${e.step * whole} ${whole * e.duration} chords#0 ${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}`)
        .sort();
      const read = readVariations(text, OPTIONS('major'));
      expect(read.notes!.map((n) => `${n.at} ${n.key}`).sort(), id).toEqual(fromEvents);
    }
  });
});

describe("a progression's variation by reference (point 7)", () => {
  /** A cell's chords as they sound, on the workbench with the source beside it. */
  const cellChords = (text: string, mode: string, cell: string) => {
    const result = compiled(text, mode);
    const shifts = codeShifts(result);
    return flatten(result, cell, shifts)
      .map((e) => `${e.step}:${e.duration}:${Math.round(resolveIn(result, e.table, e.tableShift, e.value, e.alter, shifts).position * 1000) / 1000}`)
      .sort()
      .join(' ');
  };

  it('plays what its variation plays, read beside its source: each of the 789', () => {
    let n = 0;
    let referred = 0;
    for (const mode of MODES)
      for (const { id, text } of HARMONIES)
        for (const v of variations(text, OPTIONS(mode))) {
          n++;
          if (!v.reference) continue;
          referred++;
          expect(v.reference.form, `${id} ${v.by}`).toMatch(/^base=&harm /);
          expect(cellChords(`${text}\n${v.reference.line('varied')}`, mode, 'varied'), `${id} ${v.by}`).toBe(cellChords(v.apply(text), mode, 'harm'));
        }
    expect([n, referred]).toEqual([789, 789]);
  });

  it('writes only the steps it changes', () => {
    const text = '&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]';
    const ref = (by: string) => variationBy(text, by, OPTIONS('major'))!.reference?.form;
    expect(ref('third &harm 2 -2')).toBe('base=&harm =!2 [1,3,5]');
    expect(ref('dominant &harm 0')).toBe('base=&harm [[0,2,4] [2,4#,6]]');
    expect(ref('rotate &harm')).toBe('base=&harm [3,5,7] [0,2,4] [5,7,9]');
  });
});

describe('a progression varied, by example', () => {
  const text = '&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]';
  const bys = (mode: string) => variations(text, OPTIONS(mode)).map((v) => v.by);

  it('I–vi–IV–V in C major: a rotation, a retrograde, six thirds, three dominants, two swaps and seven substitutions, the V kept', () => {
    expect(bys('major')).toEqual([
      'rotate &harm',
      'reverse &harm',
      'third &harm 0 -2',
      'third &harm 0 2',
      'third &harm 1 -2',
      'third &harm 1 2',
      'third &harm 2 -2',
      'third &harm 2 2',
      'dominant &harm 0',
      'dominant &harm 1',
      'dominant &harm 2',
      'swap &harm 0',
      'swap &harm 1',
      'substitute &harm 0 1',
      'substitute &harm 0 2',
      'substitute &harm 0 3',
      'substitute &harm 1 0',
      'substitute &harm 1 3',
      'substitute &harm 2 0',
      'substitute &harm 2 3',
    ]);
  });

  it('writes each as the seeds write a progression', () => {
    const after = (by: string) => variationBy(text, by, OPTIONS('major'))!.after;
    expect(after('rotate &harm')).toBe('&harm over=&key step=1m cycle=4 [3,5,7] [0,2,4] [5,7,9] [4,6,8]');
    expect(after('reverse &harm')).toBe('&harm over=&key step=1m cycle=4 [3,5,7] [5,7,9] [0,2,4] [4,6,8]');
    expect(after('third &harm 2 -2')).toBe('&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [1,3,5] [4,6,8]');
    // (V/vi, E major, after I; V/IV, C major, after vi; V/V, D major, after IV; each in the octave nearest its chord)
    expect(after('dominant &harm 0')).toBe('&harm over=&key step=1m cycle=4 [[0,2,4] [2,4#,6]] [5,7,9] [3,5,7] [4,6,8]');
    expect(after('dominant &harm 1')).toBe('&harm over=&key step=1m cycle=4 [0,2,4] [[5,7,9] [7,9,11]] [3,5,7] [4,6,8]');
    expect(after('dominant &harm 2')).toBe('&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [[3,5,7] [1,3#,5]] [4,6,8]');
  });

  it("spells a dominant by the key: V/VI in C minor is E♭ major, the key's own III", () => {
    expect(variationBy(text, 'dominant &harm 0', OPTIONS('minor'))!.after).toBe('&harm over=&key step=1m cycle=4 [[0,2,4] [2,4,6]] [5,7,9] [3,5,7] [4,6,8]');
  });

  it('gives no dominant into a chord already led to by its own (ii–V–I)', () => {
    expect(variations('&harm over=&key step=1m cycle=4 [1,3,5,7] [4,6,8,10] [0,2,4,6]!2', OPTIONS('major')).filter((v) => v.rule === 'dominant')).toEqual([]);
  });

  it('gives null for a by: its text has none of: an unknown operator, a line it lacks, a cadence step', () => {
    expect(variationBy(text, 'shuffle &harm', OPTIONS('major'))).toBeNull();
    expect(variationBy(text, 'third &bass 0 2', OPTIONS('major'))).toBeNull();
    expect(variationBy(text, 'third &harm 3 2', OPTIONS('major'))).toBeNull();
  });
});

describe("decision 052's point 8, its examples", () => {
  const DECISION = resolve(import.meta.dirname, '../../../docs/decisions/052-variations-as-operators.md');
  const point = readFileSync(DECISION, 'utf8').split('\n### 8.')[1]!.split('\n### 9.')[0]!;
  const blocks = [...point.matchAll(/^```cells\n([\s\S]*?)^```/gm)].map((m) => m[1]!.trimEnd().split('\n'));
  const fragment = (lines: readonly string[]) => lines.filter((l) => l.startsWith('&harm')).join('\n');
  const workbench = (lines: readonly string[]) => lines.filter((l) => l.startsWith('&bar') || l.startsWith('&key')).join('\n');

  it('are a source and three variations, each what variationBy writes for its by:', () => {
    const [source, ...rest] = blocks;
    expect(source![0]).toMatch(/^# source:/);
    expect(rest.map((b) => b[0])).toEqual(['# by: rotate &harm', '# by: third &harm 2 -2', '# by: dominant &harm 0']);
    for (const b of rest) {
      const by = b[0]!.slice('# by: '.length);
      const v = variationBy(fragment(source!), by, { workbench: workbench(source!), operators: HARMONY_OPERATORS });
      expect(v?.apply(fragment(source!)), by).toBe(fragment(b));
      expect(compileSource(b.slice(1).join('\n')).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    }
  });
});

describe('variationBy on the lines (rungs 1 and 2)', () => {
  const groove = [
    '&bar meter("4/4") step=120bpm',
    '&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~',
    '&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~',
    '&drums map=midi(10) [&kick, &hat]',
    '&bd note=36 s=white',
    '&hh note=42 s=white',
  ].join('\n');

  it('gives back every variation of a groove from its by:, the kick anchored', () => {
    const all = variations(groove);
    expect(all.length).toBeGreaterThan(10);
    for (const v of all) expect(variationBy(groove, v.by)?.after, v.by).toBe(v.after);
    expect(variationBy(groove, 'rotate &kick')).toBeNull();
  });
});

/** What a variation's operator says it does, checked on the chords it plays. */
function check(v: Variation, text: string, mode: string) {
  const [operator, , ...amounts] = v.by.split(' ');
  const before = chordsOf(text, mode);
  const after = chordsOf(v.apply(text), mode);
  const at = (es: typeof before, step: number) =>
    es
      .filter((e) => e.step >= step && e.step < step + 1)
      .map((e) => e.pitch)
      .sort((a, b) => a - b);
  if (operator === 'third') {
    const [step, n] = amounts.map(Number) as [number, number];
    const result = compiled(text, mode);
    const shifts = codeShifts(result);
    const moved = flatten(result, 'harm', shifts)
      .filter((e) => Math.floor(e.step) === step)
      .map((e) => Math.round(resolveIn(result, e.table, e.tableShift, e.value + n, e.alter, shifts).position * 1000) / 1000)
      .sort((a, b) => a - b);
    expect(at(after, step), v.by).toEqual(moved);
  } else if (operator === 'dominant') {
    const step = Number(amounts[0]);
    const half = after.filter((e) => e.step === step + 0.5).map((e) => e.pitch);
    const lap = Math.max(...before.map((e) => Math.floor(e.step))) + 1;
    const next = before
      .filter((e) => e.step === (step + 1) % lap)
      .map((e) => e.pitch)
      .sort((a, b) => a - b);
    const root = next[0]!;
    const fifth = half[0]! - root;
    expect(((fifth % 12) + 12) % 12, v.by).toBeCloseTo(7);
    const shape = half.map((p) => p - half[0]!);
    expect(shape, v.by).toEqual(next.length >= 4 ? [0, 4, 7, 10] : [0, 4, 7]);
    expect(
      after.filter((e) => e.step === step).map((e) => e.pitch),
      v.by,
    ).toEqual(before.filter((e) => e.step === step).map((e) => e.pitch));
  } else if (operator === 'swap') {
    const step = Number(amounts[0]);
    expect([at(after, step), at(after, step + 1)], v.by).toEqual([at(before, step + 1), at(before, step)]);
  } else if (operator === 'substitute') {
    const [step, from] = amounts.map(Number) as [number, number];
    expect(at(after, step), v.by).toEqual(at(before, from));
  } else expect(['rotate', 'reverse']).toContain(operator);
}

/** The median of 7 runs of `run`, in milliseconds: a garbage collection or a loaded machine stalls one run, not the median. */
function medianMs(run: () => unknown): number {
  const times = Array.from({ length: 7 }, () => {
    const t0 = performance.now();
    run();
    return performance.now() - t0;
  }).sort((a, b) => a - b);
  return times[3]!;
}
