import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { plan, type Plan } from './realize';
import { clocking } from './clocking';
import { windowAt } from './schedule';
import { mainMeter, PPQN, ticksBetween } from './midiclock';

const VOICE = '&v s=sine loop=C4 env=&(map=adsr 0 .1 0 .1)\n&out map=sample [&tune * &v]';
const piece = (meter: string, tune = '&tune step=&bar 0 2 4 5'): Plan => {
  const r = compileSource(`${meter}\n${tune}\n${VOICE}`);
  if (!r.ok) throw new Error('does not compile');
  return plan(r, codeShifts(r));
};
/** Every tick in [from, to), window by window as the player asks for them (0.25 s), with its index. */
const windowed = (p: Plan, from: number, to: number, length = 0.25) => {
  const out: { k: number; at: number }[] = [];
  for (let x = from; x < to - 1e-9; x += length) {
    const c = windowAt(p, x, length).clock;
    c?.at.forEach((at, i) => out.push({ k: c.first + i, at }));
  }
  return out;
};

describe('the main meter', () => {
  it("is the first played cell's clock, followed up its step= chain; its beat as beat= or meter(…) says", () => {
    expect(mainMeter(piece('&bar scan(1 1 1 1) step=120bpm').result)).toEqual({ cell: 'bar', beat: 1 });
    expect(mainMeter(piece('&bar scan(1 1 1 1) step=120bpm\n&sw scan(2 1) step=&bar', '&tune step=&sw 0 2').result)).toEqual({ cell: 'bar', beat: 1 });
    expect(mainMeter(piece('&bar meter("4/4", 2) step=100bpm').result)).toEqual({ cell: 'bar', beat: 2 });
    expect(mainMeter(piece('&bar 1!8 step=100bpm beat=2 swing=.67').result)).toEqual({ cell: 'bar', beat: 2 });
  });

  it('is none for a piece with no meter: a lone cell stepping at a rate', () => {
    expect(mainMeter(piece('', '&tune step=4 0 2 4').result)).toBeNull();
    expect(ticksBetween(piece('', '&tune step=4 0 2 4'), 0, 10)).toBeNull();
  });

  it('is found for the examples that have one, and none for those stepping at a bare rate', () => {
    const none: string[] = [];
    for (const f of readdirSync('examples').filter((x) => x.endsWith('.cells'))) {
      const r = compileSource(readFileSync(`examples/${f}`, 'utf8'));
      if (r.ok && !mainMeter(r)) none.push(f);
    }
    expect(none).toEqual([
      'cellscape2.cells',
      'daytime.cells',
      'dtmf.cells',
      'fiveto12.cells',
      'oscillator.cells',
      'rests.cells',
      'semitones.cells',
      'steps.cells',
      'tone.cells',
      'twovoices.cells',
    ]);
  });
});

describe('the ticks', () => {
  it('are 96 to a 4/4 bar at a steady tempo, 24 a beat, each where its index puts it', () => {
    const p = piece('&bar scan(1 1 1 1) step=120bpm');
    const one = ticksBetween(p, 0, 2)!;
    expect(one.first).toBe(0);
    expect(one.at).toHaveLength(96);
    one.at.forEach((t, k) => expect(t).toBeCloseTo((k * 0.5) / PPQN, 12));
    expect(ticksBetween(p, 2, 4)!.first).toBe(96);
  });

  it('meet exactly from window to window: none lost, none doubled, the same times as in one piece, over a long run', () => {
    const p = piece('&bar scan(1 1 1 1) step=97bpm');
    const w = windowed(p, 0, 120);
    const one = ticksBetween(p, 0, 120)!;
    expect(w.map((x) => x.k)).toEqual(one.at.map((_, i) => i));
    expect(w.map((x) => x.at)).toEqual(one.at);
    // (from the index, not added up: the last of some 4,600 ticks is where its index puts it, to a picosecond)
    expect(Math.abs(w.at(-1)!.at - ((w.length - 1) * 60) / 97 / PPQN)).toBeLessThan(1e-12);
  });

  it('count steps a beat: meter("4/4", 2) has 12 ticks a step, 96 to its bar', () => {
    const p = piece('&bar meter("4/4", 2) step=120bpm');
    expect(ticksBetween(p, 0, 2)!.at).toHaveLength(96);
  });

  it('swing: the ticks inside a pair move, every beat stays where it was, and a bar still has 96', () => {
    const straight = ticksBetween(piece('&bar 1!8 step=120bpm beat=2'), 0, 2)!.at;
    const swung = ticksBetween(piece('&bar 1!8 step=120bpm beat=2 swing=.67'), 0, 2)!.at;
    expect(swung).toHaveLength(96);
    for (let k = 0; k < 96; k += PPQN) expect(swung[k]).toBeCloseTo(straight[k], 12);
    // (the second step of a beat, tick 12, comes two thirds of the way through it)
    expect(swung[12]).toBeCloseTo(0.67 * 0.5, 12);
    expect(straight[12]).toBeCloseTo(0.5 * 0.5, 12);
    expect(swung.some((t, k) => Math.abs(t - straight[k]) > 0.01)).toBe(true);
  });

  it('a bent scan: each beat where the scan places it, the ticks between spread evenly', () => {
    const at = ticksBetween(piece('&bar scan(27 23 26 24) step=60bpm'), 0, 4)!.at;
    expect(at).toHaveLength(96);
    // (a bar of 4 s: beats at 0, 27, 50 and 76 hundredths of it)
    expect([at[0], at[24], at[48], at[72]].map((t) => +t.toFixed(9))).toEqual([0, 1.08, 2, 3.04]);
    expect(at[12]).toBeCloseTo(0.54, 9);
  });

  it('a motor: they spread out while it spins up and close in as it reaches the tempo, as fast as it turns', () => {
    const p = piece('&bar scan(1 1 1 1) step=120bpm motor=1.4 mass=1 friction=.3');
    const at = ticksBetween(p, 0, 12)!.at;
    const map = clocking(p.result, p.statics).map('bar');
    const gaps = at.slice(1).map((t, i) => t - at[i]);
    expect(gaps[0]).toBeGreaterThan(gaps.at(-1)! * 3);
    // (each gap is a 24th of a beat at the speed the motor turns there: a beat is 0.5 s on tempo)
    for (let i = 10; i < gaps.length; i += 37) expect(gaps[i] * map.speed!(at[i] + gaps[i] / 2)).toBeCloseTo(0.5 / PPQN, 3);
  });

  it('a motor that runs down: none after it comes to rest', () => {
    const p = piece('&bar scan(1 1 1) step=96bpm motor=6 mass=1.2 friction=.4 wind=8');
    expect(Number.isFinite(p.end)).toBe(true);
    const w = windowed(p, 0, p.end + 5);
    expect(w.length).toBeGreaterThan(100);
    expect(w.every((x) => x.at < p.end)).toBe(true);
    expect(ticksBetween(p, p.end, p.end + 5)).toBeNull();
  });

  it('a tempo moved (a held free()): each window on its own grid, its times from its index', () => {
    const slow = piece('&bar scan(1 1 1 1) step=free(112bpm, 90..140)');
    const fast = piece('&bar scan(1 1 1 1) step=free(120bpm, 90..140)');
    const before = ticksBetween(slow, 9.75, 10)!;
    const after = ticksBetween(fast, 10, 10.25)!;
    expect(before.at.every((t, i) => Math.abs(t - (60 / 112 / PPQN) * (before.first + i)) < 1e-9)).toBe(true);
    expect(after.at.every((t, i) => Math.abs(t - (60 / 120 / PPQN) * (after.first + i)) < 1e-9)).toBe(true);
    // (the tick before the window, on the same grid: how far apart they are where it starts)
    expect(after.at[0] - after.before).toBeCloseTo(60 / 120 / PPQN, 12);
  });

  it('every example: window by window as one piece, eight seconds, none lost or doubled', () => {
    for (const f of readdirSync('examples').filter((x) => x.endsWith('.cells'))) {
      const r = compileSource(readFileSync(`examples/${f}`, 'utf8'));
      if (!r.ok || !mainMeter(r)) continue;
      const p = plan(r, codeShifts(r));
      const w = windowed(p, 0, 8);
      const one = ticksBetween(p, 0, 8);
      expect(
        w.map((x) => x.at),
        f,
      ).toEqual(one?.at ?? []);
      expect(
        w.every((x, i) => x.k === i),
        f,
      ).toBe(true);
    }
  });
});
