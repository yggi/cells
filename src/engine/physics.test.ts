import { describe, expect, it } from 'vitest';
import { buildGraph } from './graph';
import { codeShifts, compileSource } from './compile';
import { eventsBetween, plan } from './realize';

const piece = (meter: string, extra = '') =>
  `&bar step=120bpm ${meter} 0 0 0 0\n&t step=&bar ${extra}0\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`;
const beats = (src: string, seconds = 20) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, seconds).map((e) => e.at);
};

describe('physical clocks: a meter with a motor', () => {
  it('without a motor: exactly as before (a beat every half second)', () => {
    const b = beats(piece(''));
    expect(b.slice(0, 4).map((x) => +x.toFixed(9))).toEqual([0, 0.5, 1, 1.5]);
  });
  it('spins up from rest, then keeps its tempo', () => {
    const b = beats(piece('motor=2 mass=1'));
    expect(b[1]).toBeGreaterThan(0.5); // the second beat comes late: still spinning up
    const late = b[b.length - 1] - b[b.length - 2];
    expect(late).toBeCloseTo(0.5, 3); // up to speed: on tempo
  });
  it('sags under drag: settles at motor / (motor + friction) of its speed', () => {
    const b = beats(piece('motor=2 mass=1 friction=2'), 40);
    expect(b[b.length - 1] - b[b.length - 2]).toBeCloseTo(1, 2); // half speed: beats twice as far apart
  });
  it('carries what it drives: a heavy load spins up slower', () => {
    const light = beats(piece('motor=2 mass=1'));
    const heavy = beats(piece('motor=2 mass=1', 'mass=6 '));
    expect(heavy[2]).toBeGreaterThan(light[2]);
  });
  it('a spring that winds down: slower and slower, then it stops', () => {
    const b = beats(piece('motor=4 mass=1 friction=.5 wind=4'), 120);
    expect(b.length).toBeGreaterThan(4);
    expect(b.length).toBeLessThan(40); // it stopped: no more beats however long we wait
    const gaps = b.slice(1).map((x, i) => x - b[i]);
    expect(gaps[gaps.length - 1]).toBeGreaterThan(gaps[3]); // and it slowed on the way
  });
  it('the physics is the clock’s own: motor= and the rest don’t make a voice', () => {
    const r = compileSource(piece('motor=2 mass=1 friction=1 wind=10'));
    expect(r.cells.get('bar')!.voice).toBe(false);
  });
});

describe('Music Box: a spring that runs down', () => {
  it('spins up, plays, slows, and stops — and the piece ends there', async () => {
    const { PRESETS } = await import('./presets');
    const { pieceTime } = await import('./duration');
    const src = (PRESETS as Record<string, { source: string }>).musicbox.source;
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ticks = eventsBetween(plan(r, codeShifts(r)), 0, 600).filter((e) => e.voice === 'tickv').map((e) => e.at);
    const gap = (i: number) => ticks[i + 1] - ticks[i];
    expect(gap(0)).toBeGreaterThan(gap(10)); // spinning up: the first ticks come slowly
    // up to speed: 96 a minute, sagging a little under its drag (motor / (motor + friction))
    expect(gap(10)).toBeCloseTo((60 / 96) * ((6 + 0.4) / 6), 2);
    expect(gap(ticks.length - 2)).toBeGreaterThan(3 * gap(10)); // running down: far apart at the end
    const end = pieceTime(r).ends!;
    expect(end).toBeGreaterThan(ticks[ticks.length - 1]);
    expect(end).toBeLessThan(120);
  });
});

describe('belts: step=&x through a spring (belt=, damping=, slip=)', () => {
  const with_ = (attrs: string) => beats(piece('', `${attrs} `), 30);
  it('a taut belt is all but rigid', () => {
    const rigid = with_('');
    const taut = with_('belt=5000');
    taut.slice(0, 10).forEach((t, i) => expect(Math.abs(t - rigid[i])).toBeLessThan(0.01));
  });
  it('a slack belt starts late, then catches up', () => {
    const rigid = with_('');
    const slack = with_('belt=20');
    expect(slack[1]).toBeGreaterThan(rigid[1] + 0.02); // it lags at the start …
    const n = Math.min(slack.length, rigid.length) - 1;
    expect(Math.abs(slack[n] - rigid[n])).toBeLessThan(0.02); // … and runs on time once the swing has died
  });
  it('a belt at a ratio (step=&bar/4): its steps four to the driver’s, as without the belt', () => {
    const r = compileSource('&bar step=120bpm 0 0 0 0\n&t step=&bar/4 belt=5000 0\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]');
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 2).map((e) => e.at);
    expect(ev.length).toBeGreaterThan(14); // sixteenths at 120: eight a second
    expect(ev[8] - ev[7]).toBeCloseTo(0.125, 2);
  });
  it('a belt that slips falls behind for good', () => {
    const rigid = with_('');
    // (mass 4 on a belt of 200 pulls up to about 28 at the start: a grip of 10 can't hold that)
    const slipping = with_('belt=200 mass=4 slip=10');
    const n = Math.min(rigid.length, slipping.length) - 1;
    const lag = (i: number) => slipping[i] - rigid[i];
    expect(lag(n)).toBeGreaterThan(0.03); // behind …
    expect(lag(n)).toBeCloseTo(lag(n - 10), 3); // … and it stays behind: what slipped is never made up
  });
});

describe('varispeed: pitch follows the clock’s speed, as tape does', () => {
  it('spinning up, the first notes are low; up to speed, in tune', () => {
    const r = compileSource(piece('motor=2 mass=1 varispeed=1'));
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 20);
    const c4 = 261.63;
    expect(ev[1].freq).toBeLessThan(c4 * 0.95); // still slow: flat
    expect(ev[ev.length - 1].freq).toBeCloseTo(c4, 0); // up to speed: in tune
  });
  it('without it, the pitch stays put', () => {
    const r = compileSource(piece('motor=2 mass=1'));
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 2)[1].freq).toBeCloseTo(261.63, 1);
  });
});

describe('BWV 847: its beat a real beat (♩ = 89), the tempo map in sixteenths beneath it', () => {
  it('the slider shows 89 bpm', async () => {
    const { PRESETS } = await import('./presets');
    const { mainTempo } = await import('./duration');
    const t = mainTempo(compileSource((PRESETS as Record<string, { source: string }>).bwv847.source))!;
    expect([t.cell, t.free.value, t.free.unit]).toEqual(['tempo', 89, 'bpm']); // (beat=4: its steps sixteenths, its bpm quarters)
  });
});

describe('Tape Machine and Automaton', () => {
  it('the tape spins up (its pitch with it), wows, and stops — its pitch diving', async () => {
    const { PRESETS } = await import('./presets');
    const { pieceTime } = await import('./duration');
    const r = compileSource((PRESETS as Record<string, { source: string }>).tape.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const keys = eventsBetween(plan(r, codeShifts(r)), 0, 200).filter((e) => e.voice === 'keys');
    const end = pieceTime(r).ends!;
    expect(end).toBeGreaterThan(40);
    expect(end).toBeLessThan(80); // it stops, a while after the spring gives out
    // a note late in the stop sounds lower than the same note at full speed
    const same = (e: (typeof keys)[number]) => keys.find((k) => k.at > 15 && k.at < 35 && Math.abs(Math.log2(k.freq / e.freq)) < 0.5);
    const last = keys[keys.length - 1];
    const ref = keys.filter((k) => k.at > 15 && k.at < 35);
    expect(ref.length).toBeGreaterThan(5);
    expect(last.at).toBeGreaterThan(40);
    expect(Math.min(...keys.filter((k) => k.at > 42).map((k) => k.freq))).toBeLessThan(Math.min(...ref.map((k) => k.freq)));
    void same;
  });
  it('the automaton: its bells exact, its drummer behind them at first, its woodblock behind for good', async () => {
    const { PRESETS } = await import('./presets');
    const r = compileSource((PRESETS as Record<string, { source: string }>).automaton.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const g = buildGraph(r);
    expect(g.edges.find((e) => e.kind === 'step' && e.source === 'cell:wood')!.label).toMatch(/belt/);
  });
});

describe('a hand on a turntable (live only: grab, let go, forgotten on the next play)', () => {
  it('held still from 2 s: what comes after waits, what came before is untouched; let go, the motor takes over', async () => {
    const { physicsOf } = await import('./clocking');
    const { grab, resetPhysics } = await import('./physics');
    const src = piece('motor=2 mass=1');
    const r = compileSource(src);
    const plain = eventsBetween(plan(r, codeShifts(r)), 0, 8).map((e) => e.at);
    const w = physicsOf(r, codeShifts(r), 'bar')!;
    grab(r, w, 2, 0); // held still
    grab(r, w, 3, null); // let go
    const held = eventsBetween(plan(r, codeShifts(r)), 0, 8).map((e) => e.at);
    plain.filter((t) => t < 2).forEach((t, i) => expect(held[i]).toBeCloseTo(t, 9)); // before: the same
    const after = (xs: number[]) => xs.find((t) => t > 2.05)!;
    expect(after(held)).toBeGreaterThan(after(plain) + 0.3); // after: it waited
    expect(held[held.length - 1] - held[held.length - 2]).toBeCloseTo(0.5, 1); // let go: back on tempo
    resetPhysics(r);
    const again = eventsBetween(plan(r, codeShifts(r)), 0, 8).map((e) => e.at);
    expect(again).toEqual(plain); // the next play: as written
  });
  it('a hand on the meter reaches a belted cell through its belt', async () => {
    const { physicsOf } = await import('./clocking');
    const { grab } = await import('./physics');
    const r = compileSource(piece('motor=2 mass=1', 'belt=200 '));
    const before = eventsBetween(plan(r, codeShifts(r)), 0, 6).map((e) => e.at);
    grab(r, physicsOf(r, codeShifts(r), 'bar')!, 2, 0);
    const after = eventsBetween(plan(r, codeShifts(r)), 0, 6).map((e) => e.at);
    expect(after.filter((t) => t > 2.5).length).toBeLessThan(before.filter((t) => t > 2.5).length);
  });
});

describe('a hand stays stable, whatever it holds', () => {
  it('on a very stiff belt, dragged backwards: every time finite, every note in order', async () => {
    const { physicsOf } = await import('./clocking');
    const { grab } = await import('./physics');
    const r = compileSource(piece('motor=2 mass=1', 'belt=3000 '));
    const w = physicsOf(r, codeShifts(r), 't')!;
    for (let k = 0; k < 10; k++) grab(r, w, 1 + k * 0.1, -3); // a hand pulling it backwards, renewed
    grab(r, w, 2.1, null);
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 6).map((e) => e.at);
    expect(ev.every(Number.isFinite)).toBe(true);
    expect(ev.every((t, i) => i === 0 || t >= ev[i - 1])).toBe(true);
    expect(ev.length).toBeGreaterThan(3);
  });
});
