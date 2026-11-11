import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples';
import { createHost, planOf } from './host';
import { keepBeat } from './keepbeat';
import { windowAt } from './schedule';
import { resolveSeed } from '../repository/library';

// #56: a tempo moved on its slider recompiles the piece; anchored where it is heard, the beat in progress keeps its place
// and only what follows runs at the new rate. Three pieces with a `free()` tempo, each moved at three seconds that fall
// between onsets: the next onset after the move lands where the old one was due, the time to it scaled by old / new.

/** A piece with its tempo slider moved: the `free(<old>bpm` its text holds rewritten, as the slider rewrites it. */
const moved = (code: string, from: number, to: number) => {
  const was = `free(${from}bpm`;
  expect(code).toContain(was);
  return code.replace(was, `free(${to}bpm`);
};

const CASES = [
  { key: 'sailor', from: 112, to: 140, at: [10.1, 23.45, 41.7] },
  { key: 'acid', from: 126, to: 100, at: [5.05, 17.3, 33.33] },
  { key: 'jazz', from: 132, to: 180, at: [7.4, 19.9, 50.05] },
] as const;

const options = { resolve: resolveSeed };

/** The first onset at or after `t` in what `host` answers for a window from there. */
const nextOnset = (host: ReturnType<typeof createHost>, t: number) => {
  const r = host({ type: 'window', id: 0, from: t, length: 4 });
  const events = r?.type === 'window' ? r.window.events : [];
  return Math.min(...events.map((e) => e.at));
};

describe('a tempo moved keeps the beat (#56)', () => {
  for (const { key, from, to, at } of CASES) {
    const code = EXAMPLES[key].source;
    for (const t of at) {
      it(`${key}: ${from} → ${to} bpm at ${t} s, the next onset where the old beat goes on at the new rate`, () => {
        const before = planOf(code, undefined, options);
        // (the old plan's next onset, strictly after the move: the move falls between onsets)
        const due = Math.min(...windowAt(before, t, 4).events.map((e) => e.at));
        expect(due).toBeGreaterThan(t + 1e-6);
        const expected = t + ((due - t) * from) / to;
        const host = createHost(undefined, options);
        host({ type: 'load', code });
        expect(nextOnset(host, t)).toBe(due);
        host({ type: 'load', code: moved(code, from, to), anchor: t });
        expect(Math.abs(nextOnset(host, t) - expected)).toBeLessThan(1e-9);
      });
    }
  }

  it('without an anchor a load is asked from its own start, as before (the beat jumps)', () => {
    const code = EXAMPLES.sailor.source;
    const host = createHost(undefined, options);
    host({ type: 'load', code });
    host({ type: 'load', code: moved(code, 112, 140) });
    const after = planOf(moved(code, 112, 140), undefined, options);
    const r = host({ type: 'window', id: 0, from: 10.1, length: 1 });
    expect(r?.type === 'window' && r.window).toEqual(windowAt(after, 10.1, 1));
  });

  it('anchors chain: a second move goes on from where the first put the piece', () => {
    const code = EXAMPLES.sailor.source;
    const host = createHost(undefined, options);
    host({ type: 'load', code });
    host({ type: 'load', code: moved(code, 112, 140), anchor: 10.1 });
    const mid = planOf(moved(code, 112, 140), undefined, options);
    const shift = keepBeat(planOf(code, undefined, options), mid, 10.1) - 10.1;
    const due = Math.min(...windowAt(mid, 20 + shift, 4).events.map((e) => e.at)) - shift;
    host({ type: 'load', code: moved(code, 112, 90), anchor: 20 });
    expect(Math.abs(nextOnset(host, 20) - (20 + ((due - 20) * 140) / 90))).toBeLessThan(1e-9);
  });

  it('the same tempo anchored anywhere is the same piece, and a piece at its start stays there', () => {
    const p = planOf(EXAMPLES.sailor.source, undefined, options);
    for (const t of [0, 3.3, 10.1]) expect(keepBeat(p, p, t)).toBeCloseTo(t, 9);
  });
});
