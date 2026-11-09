// The meter finder (#648) over its four benches: what it finds may grow, never shrink (tools/cycles.ratchet.json; a
// change that trades one for another records it, UPDATE_RATCHET=1, and says why in its pull request). And what it writes
// is a meter cells reads back as what it found.
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { BENCHES, run, summary, syntheticCases, grooveCases } from './cycles';
import { findMeter, meterText } from '../src/engine/time/cycles';
import { compileSource } from '../src/engine/compile';
import { resolveSeed } from '../src/repository/library';

const RATCHET = 'tools/cycles.ratchet.json';

describe('the meter finder over its benches (tools/cycles.ratchet.json)', () => {
  const recorded = JSON.parse(readFileSync(RATCHET, 'utf8')) as Record<string, Record<string, number>>;
  const now: Record<string, Record<string, number>> = {};
  it.each(Object.keys(BENCHES))('%s: no measure finds fewer than it did', (bench) => {
    const rows = run(BENCHES[bench]!());
    now[bench] = { cases: rows.length, ...summary(rows) };
    if (process.env.UPDATE_RATCHET) {
      writeFileSync(RATCHET, `${JSON.stringify({ ...recorded, ...now }, null, 2)}\n`);
      return;
    }
    const was = recorded[bench]!;
    expect(now[bench]!.cases, 'the bench has the cases it had').toBe(was.cases);
    for (const [k, v] of Object.entries(was)) expect(now[bench]![k], `${bench}: ${k}`).toBeGreaterThanOrEqual(v);
  });
});

describe('what it writes', () => {
  const read = (text: string) => {
    const r = compileSource(`${text}\n&t step=8n 0\n&v s=sine\n&o [&t * &v]`, undefined, { resolve: resolveSeed });
    expect(
      r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message),
      text,
    ).toEqual([]);
    return r.cells.get('bar')!.meter!;
  };

  it.each([
    ['2+2+3 110bpm sw0.60', [2, 2, 3], 0.6],
    ['3+2+2 110bpm sw0.60', [3, 2, 2], 0.6],
    ['2+3+2 80bpm sw0.67', [2, 3, 2], 2 / 3],
    ['2+2+2+2 110bpm sw0.67', [2, 2, 2, 2], 2 / 3],
    ['3+3+3+3 110bpm sw0.50', [3, 3, 3, 3], 0.5],
  ] as const)('%s: found, written, and read back as its groups and its swing', (name, groups, swing) => {
    const c = syntheticCases().find((x) => x.name === name)!;
    const f = findMeter(c.onsets)!;
    expect(f.groups).toEqual(groups);
    expect(f.swing.find((s) => s.level === '8n')?.share ?? 0.5).toBeCloseTo(swing, 2);
    const m = read(meterText(f));
    // (its beats in eighths: a 4/4's are quarters, unit 4)
    expect(m.beats.map((b) => (b * 8) / m.unit)).toEqual(groups);
    expect(m.swing?.find((s) => s.level === '8n')?.share ?? 0.5).toBeCloseTo(swing, 2);
  });

  it('a drummer’s 4/4, played (the Groove fixtures): its tempo within 1 %, four beats, straight', () => {
    for (const c of grooveCases()) {
      const f = findMeter(c.onsets)!;
      expect(f.signature, c.name).toBe('4/4');
      expect(Math.abs(60 / f.bpm - c.truth.beat) / c.truth.beat, c.name).toBeLessThan(0.01);
      expect(f.swing, c.name).toEqual([]);
    }
  });
});
