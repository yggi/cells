import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples';
import { createHost, planOf } from './host';
import { keepBar, keepBeat } from './keepbeat';
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

// #701: a swing's share or a bend's depth moved, anchored, waits for the bar line (decision 081 §3): the old plan answers up
// to the next bar line of its main meter, the new one from there, anchored at it. Each moved at three seconds mid-bar.
const WARPS = [
  // (swing: 160 bpm in 4/4, a bar 1.5 s; its share moved from .5 to 2/3)
  { key: 'swing', was: 'free(1/2, 1/2..3/4)', now: 'free(2/3, 1/2..3/4)', bar: 1.5, at: [10.1, 23.45, 41.7] },
  // (twelve: 60 bpm in 12/8, a bar 4 s whatever the depth; its depth moved from .5 to 1)
  { key: 'twelve', was: 'free(.5, 0..2)', now: 'free(1, 0..2)', bar: 4, at: [5.05, 17.3, 33.33] },
] as const;

/** A piece with its warp's amount moved back: the `now` its text holds rewritten to `was`. */
const warped = (code: string, now: string, was: string) => {
  expect(code).toContain(now);
  return code.replace(now, was);
};

/** The onsets of a window `host` answers. */
const onsets = (host: ReturnType<typeof createHost>, from: number, length: number) => {
  const r = host({ type: 'window', id: 0, from, length });
  return r?.type === 'window' ? r.window.events.map((e) => e.at) : [];
};

const near = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]!) < 1e-9);

describe('a swing or a bend moved keeps the bar it is in (#701)', () => {
  for (const { key, was, now, bar, at } of WARPS) {
    const after = EXAMPLES[key].source;
    const before = warped(after, now, was);
    for (const t of at) {
      it(`${key}: ${was} → ${now} at ${t} s, the old plan up to the bar line, the new one from there`, () => {
        const old = planOf(before, undefined, options);
        const next = planOf(after, undefined, options);
        const line = Math.ceil(t / bar) * bar;
        expect(Math.abs(keepBar(old, next, t)!.line - line)).toBeLessThan(1e-9);
        const host = createHost(undefined, options);
        host({ type: 'load', code: before });
        host({ type: 'load', code: after, anchor: t });
        const heard = onsets(host, t, 4);
        // (up to the line: the old plan's own onsets; from it: the new plan's, anchored at the line)
        const upTo = windowAt(old, t, line - t).events.map((e) => e.at);
        const from = keepBeat(old, next, line);
        const onwards = windowAt(next, from, t + 4 - line).events.map((e) => e.at + line - from);
        expect(upTo.length).toBeGreaterThan(0);
        expect(onwards.length).toBeGreaterThan(0);
        expect(near(heard, [...upTo, ...onwards])).toBe(true);
        // (the new plan anchored at once, #56 alone, moves an onset before the line: the wait is heard)
        const shift = keepBeat(old, next, t) - t;
        expect(
          near(
            windowAt(next, t + shift, line - t).events.map((e) => e.at - shift),
            upTo,
          ),
        ).toBe(false);
      });
    }
  }

  it('a tempo moved alone waits for nothing: no bar is kept', () => {
    for (const { key, from, to, at } of CASES) {
      const code = EXAMPLES[key].source;
      const old = planOf(code, undefined, options);
      const next = planOf(moved(code, from, to), undefined, options);
      for (const t of at) expect(keepBar(old, next, t)).toBeNull();
    }
  });

  it('a load before the bar line goes on from the bar kept; one without an anchor drops it', () => {
    const { was, now } = WARPS[0];
    const after = EXAMPLES.swing.source;
    const before = warped(after, now, was);
    const old = planOf(before, undefined, options);
    const host = createHost(undefined, options);
    host({ type: 'load', code: before });
    host({ type: 'load', code: after, anchor: 10.1 });
    // (moved back before the line: the old share all along)
    host({ type: 'load', code: before, anchor: 10.2 });
    expect(
      near(
        onsets(host, 10.1, 4),
        windowAt(old, 10.1, 4).events.map((e) => e.at),
      ),
    ).toBe(true);
    host({ type: 'load', code: after, anchor: 10.2 });
    host({ type: 'load', code: after });
    const r = host({ type: 'window', id: 0, from: 10.1, length: 1 });
    expect(r?.type === 'window' && r.window).toEqual(windowAt(planOf(after, undefined, options), 10.1, 1));
  });
});
