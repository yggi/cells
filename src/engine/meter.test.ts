import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { meterOfLevels, meterOfScan } from './meter';
import { meterLevels, SIGNATURES } from './parser';

const meterOf = (src: string) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.cells.get('m')!.meter!;
};

describe('Meter', () => {
  const sigs = Object.keys(SIGNATURES);
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
        expect(m.levels).toEqual([...meterLevels(sig, sub)].map((ch) => '*+-.,'.indexOf(ch)));
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
});
