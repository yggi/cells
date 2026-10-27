import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { liveAt } from './live';
import { routing } from './routing';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';

const OUT = '&out loop=SAMPLE_RATE map=sample';
const src = (...lines: string[]) => compileSource(lines.join('\n'));
const on = (r: CompileResult, muted: ReadonlySet<string> = r.off) => routing(r, muted);

describe('routing: one model for what the graph draws as part of the sound (#11)', () => {
  it('a groove: a chord of voices lights each of them while it sounds', () => {
    const r = src('&g step=2 [&bd, &hh] ~', '&bd s=sine loop=A1', '&hh s=white', `${OUT} [&g]`);
    const live = liveAt(r, codeShifts(r), r.off, 0.1);
    expect(['bd', 'hh'].map((n) => live.nodes.has(`cell:${n}`))).toEqual([true, true]);
  });
  it('a sound tape nothing hears is not part of the sound (nor what it records)', () => {
    const r = src(
      '&bar step=1',
      '&mel step=&bar 0',
      '&v s=sine loop=C4',
      '&send [&mel * &v]',
      '&tape step=&bar write=&send length=2',
      '&head play=&tape at=.5',
      `${OUT} [&mel * &v]`,
    );
    const n = on(r).nodes;
    expect([n.has('cell:tape'), n.has('cell:head'), n.has('cell:send')]).toEqual([false, false, false]);
    expect(n.has('cell:v')).toBe(true);
  });
  it('a table lent by a cell that splices one with its own: only the table its notes read', () => {
    const r = compileSource(PRESETS.cellscape.source);
    expect(on(r).edges.has('cell:canon->cell:lydian')).toBe(false);
    expect(on(r).edges.has('cell:melody->cell:lydian')).toBe(true);
  });
  it('an oscilloscope is on while what it watches is', () => {
    const r = compileSource(PRESETS.harmonograph.source);
    expect(on(r).nodes.has('cell:screen')).toBe(true);
    expect(on(r, new Set(['cell:tonic', 'cell:fifth'])).nodes.has('cell:screen')).toBe(false);
  });
});

describe('at rest, nothing is dimmed (#201)', () => {
  // (how fast: `timing.slow.test.ts`, #237)
  it('the heads at rest (the live state at time 0) are worked out for every example', () => {
    for (const p of Object.values(PRESETS)) {
      const r = compileSource(p.source, undefined, { resolve: resolveSeed });
      expect(liveAt(r, codeShifts(r), r.off, 0).seconds).toBe(0);
    }
  });
});
