import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets';
import { createHost, planOf } from './host';
import { eventsBetween } from './realize';
import { retime, tapeSpeeds, windowAt, type Window } from './schedule';

describe('schedule: what to play next, as plain data', () => {
  it('a window holds the notes eventsBetween gives for it', () => {
    for (const key of ['bwv847', 'echotape', 'soundtape', 'hypercell'] as const) {
      const p = planOf(PRESETS[key].source);
      const w = windowAt(p, 2, 0.25);
      expect(w.events).toEqual(eventsBetween(p, 2, 2.25));
      expect([w.from, w.to]).toEqual([2, 2.25]);
    }
  });

  it('every window of every example survives a structured clone unchanged (it can cross to and from a worker)', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      const p = planOf(preset.source);
      for (let from = 0; from < 4; from += 0.25) {
        const w = windowAt(p, from, 0.25);
        expect(structuredClone(w), `${key} at ${from}`).toEqual(w);
      }
    }
  });

  it('moving tapes get their speed every 0.05 s through the window, its end included; steady ones none', () => {
    const p = planOf(PRESETS.soundtape.source);
    const [t] = tapeSpeeds(p, 1, 1.25 + 1e-9);
    expect(t.tape).toBe('tape');
    expect(t.points.map((x) => +x.at.toFixed(6))).toEqual([1, 1.05, 1.1, 1.15, 1.2, 1.25]);
    expect(t.points.every((x) => x.speed > 0)).toBe(true);
    // (no tapes at all: nothing to say)
    expect(tapeSpeeds(planOf(PRESETS.twinkle.source), 0, 1)).toEqual([]);
  });

  it('retime puts a window onto the audio clock: starts, bends, levels, parameters and tape points moved, lengths scaled', () => {
    const w: Window = {
      from: 4,
      to: 4.25,
      events: [
        {
          at: 4.1,
          dur: 0.2,
          voice: 'v',
          freq: 440,
          bends: [{ at: 4.15, cents: 100, ramp: true }],
          gains: [1, 1],
          levels: [{ at: 4.1, level: 0.5 }],
          params: { lpf: { kind: 'points', points: [{ at: 4.2, value: 300 }] } },
        },
      ],
      tapes: [{ tape: 't', points: [{ at: 4, speed: 1 }] }],
    };
    const r = retime(w, 10, 0.5);
    const e = r.events[0];
    expect(e.at).toBeCloseTo(10.05, 12);
    expect(e.dur).toBeCloseTo(0.1, 12);
    expect(e.bends[0].at).toBeCloseTo(10.075, 12);
    expect(e.levels[0].at).toBeCloseTo(10.05, 12);
    expect(e.params!.lpf).toEqual({ kind: 'points', points: [{ at: expect.closeTo(10.1, 12), value: 300 }] });
    expect(r.tapes).toEqual([{ tape: 't', points: [{ at: 10, speed: 1 }] }]);
  });
});

describe('host: the engine behind messages (what runs in the worker)', () => {
  it('answers a window exactly as the plan here would, in the order asked', () => {
    const host = createHost();
    const src = PRESETS.prelude.source;
    expect(host({ type: 'load', code: src })).toMatchObject({ type: 'loaded', ok: true });
    const here = planOf(src);
    for (let i = 0; i < 8; i++) {
      const reply = host({ type: 'window', id: i, from: i * 0.25, length: 0.25 });
      expect(reply).toMatchObject({ type: 'window', id: i });
      expect(reply!.type === 'window' && reply!.window).toEqual(windowAt(here, i * 0.25, 0.25));
    }
  });

  it('mirrors hands: a grab sent to it changes its windows as the same grab changes them here', async () => {
    const { grabIn } = await import('./host');
    const src = PRESETS.musicbox.source;
    const host = createHost();
    host({ type: 'load', code: src });
    const here = planOf(src);
    // a hand holds the music box's barrel still from second 2, lets go at 3
    for (const [t, speed] of [[2, 0], [2.3, 0], [2.6, 0], [3, null]] as const) {
      host({ type: 'grab', cell: 'bar', t, speed });
      grabIn(here, 'bar', t, speed);
    }
    const there = (from: number) => {
      const r = host({ type: 'window', id: 0, from, length: 1 });
      return r && r.type === 'window' ? r.window : null;
    };
    for (const from of [1, 2, 3, 4, 6]) expect(there(from)).toEqual(windowAt(here, from, 1));
    // … and the hand made a difference (else this test proves nothing)
    expect(windowAt(planOf(src), 2, 4)).not.toEqual(windowAt(here, 2, 4));
    // Reset: the hand forgotten on both sides
    host({ type: 'reset' });
    expect(there(2)).toEqual(windowAt(planOf(src), 2, 1));
  });

  it('before any piece is loaded, a window is empty (not an error)', () => {
    const r = createHost()({ type: 'window', id: 7, from: 1, length: 0.25 });
    expect(r).toMatchObject({ type: 'window', id: 7, window: { from: 1, to: 1.25, events: [], tapes: [] } });
  });
});
