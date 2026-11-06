import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { meterOfLevels, meterOfScan } from './meter';
import { meterLevels } from './parser';
import { PRESETS } from './presets';

const meterOf = (src: string) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.cells.get('m')!.meter!;
};

describe('Meter', () => {
  // (version 1's ten names, and some of those the rule adds: contracts/meter v2, decision 072)
  const sigs = ['2/4', '3/4', '4/4', '5/4', '5/8', '6/8', '7/8', '9/8', '10/8', '12/8', '2/2', '3/2', '6/4', '7/4', '3/8', '8/8', '11/8', '6/16'];
  // (a grade's number from the ends into five: the bar 0, a beat 1, any tier between 2, the eighth 3, finer 4)
  const number = (ch: string) => ({ '*': 0, '+': 1, '-': 2, ':': 2, ';': 2, '.': 3, ',': 4 })[ch];
  for (const sig of sigs) {
    it(`meter("${sig}") and scan(1!n) give equal positions`, () => {
      const a = meterOf(`&m meter("${sig}")`);
      const b = meterOf(`&m scan(${'1 '.repeat(a.levels.length).trim()})`);
      expect(a.positions).toEqual(b.positions);
      expect(a.lap).toBe(b.lap);
    });
    for (const sub of [1, 2, 3]) {
      it(`meter("${sig}", ${sub}) has meterLevels' levels`, () => {
        const m = meterOf(`&m meter("${sig}", ${sub})`);
        expect(m.levels).toEqual([...meterLevels(sig, sub)].map(number));
      });
    }
  }
  it('a scan is flat under the bar; a meter nests its levels', () => {
    expect(meterOfScan([1, 1, 1]).tree.groups.map((g) => g.level)).toEqual([1, 1, 1]);
    const t = meterOfLevels([0, 3, 1, 3]).tree;
    expect(t.groups.map((g) => [g.level, g.from, g.to])).toEqual([
      [3, 1, 2],
      [1, 2, 4],
    ]);
    expect(t.groups[1].groups.map((g) => g.from)).toEqual([3]);
  });
  it('says which form it was written as: meter(…), scan(…), and none for a plain list', () => {
    expect(meterOf('&m meter("4/4")').written).toBe('meter');
    expect(meterOf('&m scan(1 1 1 1)').written).toBe('scan');
    const r = compileSource('&m 0 1 2');
    expect(r.ok && r.cells.get('m')!.meter).toBe(null);
  });
  it('in every example, a meter written as meter(…) is a list and one written as scan(…) a scan', () => {
    const seen = { meter: 0, scan: 0 };
    for (const [name, { source: src }] of Object.entries(PRESETS)) {
      const r = compileSource(src);
      if (!r.ok) continue;
      for (const c of r.cells.values()) {
        if (!c.meter) continue;
        seen[c.meter.written]++;
        expect(c.braid, `${name} &${c.name}`).toBe(c.meter.written === 'meter' ? 'list' : 'scan');
      }
    }
    expect(seen.meter).toBeGreaterThan(0);
    expect(seen.scan).toBeGreaterThan(0);
  });
});

// #506: a meter is two applications of even (decision 072, yggi/music-commons contracts/meter v2): its grouping by
// rule, its tiers, and its numbers from the ends. Each line here is the measure the issue names.
describe('a meter is two applications of even (#506)', () => {
  const m = (text: string) => {
    const r = compileSource(`&bar meter(${text}) step=60bpm\n&v s=sine loop=C4\n&out map=sample [&bar * &v]`);
    expect(
      r.diagnostics.filter((d) => d.severity === 'error'),
      text,
    ).toEqual([]);
    const bar = r.cells.get('bar')!;
    return { ...bar.meter!, seconds: bar.steps / r.clocks.get('bar')!.perSecond };
  };
  const shape = (text: string) => {
    const { pulses, unit, beats, seconds } = m(text);
    return { pulses, unit, beats, seconds };
  };
  const error = (text: string) => compileSource(`&bar meter(${text}) step=60bpm`).diagnostics.find((d) => d.severity === 'error')?.message ?? '';

  it('x/8 is the canonical even set of ⌈x/3⌉ groups: 3/8 one beat, 8/8 3+3+2, 11/8 3+3+3+2, 13/8 3+3+2+3+2, 16/8 two tresillos', () => {
    expect(shape('"3/8"').beats).toEqual([3]);
    expect(shape('"8/8"').beats).toEqual([3, 3, 2]);
    expect(shape('"11/8"').beats).toEqual([3, 3, 3, 2]);
    expect(shape('"13/8"').beats).toEqual([3, 3, 2, 3, 2]);
    expect(shape('"16/8"').beats).toEqual([3, 3, 2, 3, 3, 2]);
    // (and x/16 the same in sixteenths)
    expect(shape('"7/16"')).toMatchObject({ pulses: 7, unit: 16, beats: [3, 2, 2] });
  });

  it('x/4 and x/2 count beats of the denominator, and threes where x is a multiple of 3 from 6: 2/2 two halves, 6/4 two dotted halves against 3/2’s three', () => {
    expect(shape('"2/2"')).toEqual({ pulses: 2, unit: 2, beats: [1, 1], seconds: 2 });
    expect(shape('"3/2"')).toEqual({ pulses: 3, unit: 2, beats: [1, 1, 1], seconds: 3 });
    expect(shape('"6/4"')).toEqual({ pulses: 6, unit: 4, beats: [3, 3], seconds: 2 });
    expect(shape('"7/4"').beats).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('sizes take a unit and groups of 4 and 6: 2+2+3/4 is 7/4 in quarters, 4+3 a seven of eighths as a band counts it', () => {
    expect(shape('"2+2+3/4"')).toEqual({ pulses: 7, unit: 4, beats: [2, 2, 3], seconds: 3 });
    expect(shape('"4+3"')).toEqual({ pulses: 7, unit: 8, beats: [4, 3], seconds: 2 });
    expect(shape('"3+3+2/16"')).toMatchObject({ pulses: 8, unit: 16, beats: [3, 3, 2] });
    expect(meterLevels('4+3', 1)).toBe('*.-.+..');
    expect(error('"5+2"')).toMatch(/each 2, 3, 4 or 6/);
  });

  it('a tier between the groups and the eighth has its own grade, and writes the number 2: 4/2’s quarters, 7/4’s second halving', () => {
    expect(meterLevels('4/2', 2)).toBe('*:-:+:-:');
    expect(meterLevels('7/4', 1)).toBe('*:-:+--');
    expect(m('"4/2", 2').levels).toEqual([0, 2, 2, 2, 1, 2, 2, 2]);
    // (2/2 grades as 4/4 does, its two beats the halves)
    expect(meterLevels('2/2', 4)).toBe(meterLevels('4/4', 2));
  });

  it('written levels: every mark but . and , starts a beat, so *.-.+.-. is 4/4 (it was two beats); their step’s note value is their pulse', () => {
    expect(shape('"*.-.+.-."')).toEqual({ pulses: 8, unit: 8, beats: [2, 2, 2, 2], seconds: 4 });
    expect(shape('"*.-.+.-."').seconds).toBe(shape('"4/4", 2').seconds);
    // (alla breve as levels, a half's quarters a tier below its beat, its step an eighth: two beats, a bar of 2 s at 60 bpm)
    expect(shape('"*,.,+,.,", 8n')).toEqual({ pulses: 8, unit: 8, beats: [4, 4], seconds: 2 });
    // (a waltz in one, its steps quarters)
    expect(shape('"*..", 4n')).toEqual({ pulses: 3, unit: 4, beats: [3], seconds: 1 });
  });

  it('the step as a note value is so many steps a pulse: meter("6/8", 16n) is meter("6/8", 2); one coarser than the pulse fails', () => {
    expect(m('"6/8", 16n')).toEqual(m('"6/8", 2'));
    expect(m('"4/4", 16n')).toEqual(m('"4/4", 4'));
    expect(error('"7/8", 4n')).toMatch(/the step divides the pulse, 8n, into 1 to 8 steps/);
  });
});

describe('a signature written out as levels, with its step, is the same meter (#506): where its beats are its marks', () => {
  const shape = (text: string) => {
    const r = compileSource(`&bar meter(${text}) step=60bpm`);
    const bar = r.cells.get('bar')!;
    return { beats: bar.meter!.beats.map((b) => b / bar.meter!.unit), seconds: bar.steps / r.clocks.get('bar')!.perSecond, levels: bar.meter!.levels };
  };
  const names = [...Array.from({ length: 15 }, (_, i) => `${i + 2}/8`), ...[2, 3, 4, 5, 7].map((x) => `${x}/4`), ...[2, 3, 4].map((x) => `${x}/2`)];
  it.each(names)('%s, a step a pulse', (sig) => {
    const unit = Number(sig.split('/')[1]);
    expect(shape(`"${meterLevels(sig, 1)}", ${unit}n`)).toEqual(shape(`"${sig}"`));
  });
  it('not where a mark inside a beat is a tier the levels count as a beat: 6/4’s quarters, 2/2 in quarters (written by their signature or sizes)', () => {
    expect(shape(`"${meterLevels('6/4', 1)}", 4n`).beats).toHaveLength(6);
    expect(shape(`"${meterLevels('2/2', 2)}", 4n`).beats).toHaveLength(4);
  });
});
