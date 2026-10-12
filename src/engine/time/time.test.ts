import { describe, expect, it } from 'vitest';
import { fft } from './fft';
import { grid, ridges } from './wavelet';
import { sampled, scalograms, type Onset } from './signals';
import { cones, score, sectionsOver, swells } from './boundaries';
import { alike, canonical, foldings, maximallyEven, pitchClasses, pulseOf, rhythm, steps } from './necklace';
import { owners, peaks, waterfall } from './spectrogram';

const note = (at: number, voice = 'v', freq = 440, dur = 0.1): Onset => ({ at, dur, voice, freq, gains: [1, 1] });
/** The period whose row is loudest on average, away from the window's edges. */
const loudest = (rows: readonly Float32Array[], periods: readonly number[]) => {
  const mean = rows.map((r) => r.slice(r.length / 4, (3 * r.length) / 4).reduce((a, v) => a + v, 0));
  return periods[mean.indexOf(Math.max(...mean))];
};

describe('fft', () => {
  it('finds a sine in its bin', () => {
    const n = 64;
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / n));
    const im = new Float64Array(n);
    fft(re, im);
    const mag = Array.from(re, (r, k) => Math.hypot(r, im[k]));
    expect(mag.indexOf(Math.max(...mag.slice(0, n / 2)))).toBe(5);
  });
});

describe('the scalogram', () => {
  it('hears a pulse at its period', () => {
    const g = grid(40);
    const s = scalograms(
      Array.from({ length: 80 }, (_, i) => note(i * 0.5)),
      g,
      ['impulses'],
    ).impulses!;
    expect(Math.abs(Math.log2(loudest(s.rows, s.periods) / 0.5))).toBeLessThan(1 / 12);
  });
  it('hears 3 against 2 as two levels, in two voices', () => {
    const g = grid(48);
    const notes = [...Array.from({ length: 96 }, (_, i) => note(i * 0.5, 'two')), ...Array.from({ length: 64 }, (_, i) => note(i * 0.75, 'three'))];
    const s = scalograms(notes, g, ['voices']).voices!;
    const mean = s.rows.map((r) => r.reduce((a, v) => a + v, 0));
    const at = (p: number) => mean[s.periods.findIndex((q) => q >= p)];
    expect(at(0.5)).toBeGreaterThan(at(0.6));
    expect(at(0.75)).toBeGreaterThan(at(0.62));
  });
  it('samples a long window sparsely, and starts its periods at 8 samples', () => {
    const g = grid(86400);
    expect(g.rate).toBeCloseTo(2 ** 18 / 86400);
    expect(g.periods[0]).toBeCloseTo(8 / g.rate);
    expect(g.periods[g.periods.length - 1]).toBeLessThanOrEqual(86400 / 3);
  });
});

describe('the signals', () => {
  it('hold a legato line level (envelope) and mark a key change (harmony)', () => {
    const g = grid(40);
    const c = [261.63, 293.66, 329.63, 349.23];
    const fs = [261.63 * Math.pow(2, 1 / 12), 293.66 * Math.pow(2, 3 / 12), 329.63 * Math.pow(2, 1 / 12), 349.23 * Math.pow(2, 1 / 12)];
    const notes = Array.from({ length: 80 }, (_, i) => note(i * 0.5, 'v', (i < 40 ? c : fs)[i % 4], 0.5));
    const x = sampled(notes, g, ['envelope', 'harmony']);
    const mid = x.envelope!.slice(200, 1800);
    expect(Math.max(...mid) - Math.min(...mid)).toBeLessThan(0.05);
    // (the four new pitch classes at 20 s, the first four at the start, nothing else)
    const h = x.harmony!;
    const loud = [...h.keys()].filter((i) => h[i] > 0.1).map((i) => i / g.rate);
    expect(loud.every((t) => t < 2 || (t > 19.5 && t < 22))).toBe(true);
  });
});

describe('the boundaries', () => {
  // (a piece of sections 16 s long, busy and sparse in turn, in two voices)
  const sectionsAt = [16, 32, 48, 64, 80];
  const piece = () => {
    const notes: Onset[] = [];
    for (let s = 0; s < 6; s++) for (let t = 0; t < 16; t += s % 2 ? 1 : 0.25) notes.push(note(s * 16 + t, s % 2 ? 'low' : 'high', s % 2 ? 110 : 880));
    return notes;
  };
  it('finds the sections as swells, beyond chance', () => {
    const g = grid(96);
    const ss = Object.values(scalograms(piece(), g, ['envelope', 'change', 'voices']));
    const r = score(swells(ss, 16), sectionsAt, 96, 1.6);
    expect(r.recall).toBeGreaterThan(0.6);
    expect(r.precision).toBeGreaterThan(r.chance);
  });
  it('finds cones on the sections', () => {
    const g = grid(96);
    const s = scalograms(piece(), g, ['change']).change!;
    const r = score(cones(s), sectionsAt, 96, 1.6);
    expect(r.precision).toBeGreaterThan(0.5);
  });
  it('repeats a round of sections over a cycle', () => {
    const one = [
      { at: 0, label: 'A' },
      { at: 10, label: 'B' },
    ];
    expect(sectionsOver(one, 45).map((x) => x.at)).toEqual([0, 10, 20, 30, 40]);
  });
});

describe('the foldings', () => {
  const major = pitchClasses([261.63, 293.66, 329.63, 349.23, 392, 440, 493.88])!;
  it('name the bell and the major scale alike', () => {
    expect(steps(major)).toEqual([2, 2, 1, 2, 2, 2, 1]);
    const bell = rhythm([0, 0.4, 0.8, 1.0, 1.4, 1.8, 2.2], 2.4, 0.2)!;
    expect(bell.n).toBe(12);
    expect(canonical(bell)).toBe(canonical(major));
    expect(canonical(major)).toBe('2 2 2 1 2 2 1');
  });
  it('know the maximally even', () => {
    expect(maximallyEven(major)).toBe(true);
    expect(maximallyEven({ n: 8, marks: [0, 3, 6] })).toBe(true); // the tresillo
    expect(maximallyEven({ n: 16, marks: [0, 3, 6, 10, 12] })).toBe(false); // the son clave
  });
  it('hear the pulse, and leave a pattern off the pulse alone', () => {
    expect(pulseOf([0, 0.2, 0.4, 0.6, 1.0])).toBeCloseTo(0.2);
    expect(rhythm([0, 0.13], 2.4, 0.2)).toBeNull();
  });
  it('find the bell piece folded alike in time and in pitch', () => {
    const times = [0, 0.4, 0.8, 1.0, 1.4, 1.8, 2.2];
    const notes = [0, 1, 2].flatMap((k) => [
      ...times.map((t) => ({ at: k * 2.4 + t, voice: 'bell', freq: 1046.5 })),
      ...times.map((t, i) => ({ at: k * 2.4 + t, voice: 'song', freq: [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88][i] })),
    ]);
    const groups = alike(foldings(notes, [{ name: 'bar', cycle: 2.4, pulse: 0.2 }]));
    const g = groups.find((x) => x.name === '2 2 2 1 2 2 1')!;
    expect(g.even).toBe(true);
    expect(g.where.map((f) => `${f.voice}:${f.kind}`).sort()).toEqual(['bell:rhythm', 'song:pitch', 'song:rhythm']);
  });
});

describe('the levels heard', () => {
  it('a beat and its bar stand out as ridges', () => {
    const g = grid(32, 50);
    const notes = Array.from({ length: 64 }, (_, i) => note(i * 0.5, 'v', 440, i % 4 ? 0.1 : 0.4));
    const s = scalograms(notes, g, ['envelope']).envelope!;
    const found = ridges(s).map((r) => r.period);
    expect(found.some((p) => Math.abs(Math.log2(p / 0.5)) < 0.1)).toBe(true);
    expect(Math.abs(Math.log2(found[0] / 2))).toBeLessThan(0.1);
  });
});

describe('the sound', () => {
  it('has a sine in its band, and its peaks', () => {
    const rate = 8000;
    const x = Float32Array.from({ length: rate }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / rate));
    const w = waterfall(x, rate, { frames: 4, size: 1024 });
    const mid = w.rows.map((r) => r[2]);
    expect(Math.abs(Math.log2(w.freqs[mid.indexOf(Math.max(...mid))] / 440))).toBeLessThan(1 / 12);
    const p = peaks(x, 4);
    expect(p[0]).toBeCloseTo(-0.5, 2);
    expect(p[1]).toBeCloseTo(0.5, 2);
  });
  it('tells whose each band is: a note’s harmonics its voice’s, the rest no one’s', () => {
    // (bands a semitone apart from 110 Hz, three frames a second apart: only the harmonics' own bands are claimed)
    const freqs = Array.from({ length: 48 }, (_, b) => 110 * Math.pow(2, b / 12));
    const o = owners(
      { freqs, times: [0.5, 1.5, 2.5], rows: [] },
      [
        { at: 0, dur: 1, freq: 110, voice: 'bass' },
        { at: 1, dur: 1, freq: 440, voice: 'lead' },
      ],
      ['bass', 'lead'],
      { tail: 0 },
    );
    const at = (hz: number, frame: number) => o[Math.round(12 * Math.log2(hz / 110)) * 3 + frame];
    expect([at(110, 0), at(220, 0), at(330, 0), at(440, 0)]).toEqual([1, 1, 1, 1]);
    expect(at(440, 1)).toBe(2);
    expect(at(110, 1)).toBe(0);
    expect(at(116.5, 0)).toBe(0);
    expect(at(110, 2)).toBe(0);
  });
});

describe('the motifs', () => {
  it('find a figure, and the same figure twice as slow', async () => {
    const { motifs, multiscale } = await import('./motifs');
    const tune = [0, 2, 4, 5, 7].map((s) => 440 * Math.pow(2, s / 12));
    const notes = [
      ...[0, 4].flatMap((start) => tune.map((freq, i) => ({ at: start + i * 0.25, voice: 'high', freq }))),
      ...tune.map((freq, i) => ({ at: 8 + i * 0.5, voice: 'low', freq: freq / 2 })),
    ];
    const ms = motifs(notes);
    const m = ms.find((x) => x.shape === '2 2 1 2 | 1 1 1 1')!;
    expect(m.heard).toHaveLength(3);
    expect(m.scales).toEqual([0.25, 0.5]);
    expect(multiscale(ms)[0].shape).toBe(m.shape);
  });
});

describe('how long to listen', () => {
  it('to the whole of a piece that ends, to three rounds of a loop', async () => {
    const { listening } = await import('./span');
    expect(listening({ ends: 96, cycle: null, chance: false, longest: 96 })).toEqual({ seconds: 96, cycle: null, rounds: 1 });
    expect(listening({ ends: null, cycle: 100, chance: false, longest: 100 })).toEqual({ seconds: 300, cycle: 100, rounds: 3 });
    expect(listening({ ends: null, cycle: 50000, chance: false, longest: 50000 })!.rounds).toBe(1);
    expect(listening({ ends: null, cycle: null, chance: false, longest: null })).toBeNull();
  });
});

describe('the splices', () => {
  it("find Korobeiniki's tune turning to its second half, where the A sections play it", async () => {
    const { splices } = await import('./splices');
    const { compileSource } = await import('../compile');
    const { codeShifts } = await import('../program');
    const { plan } = await import('../realize');
    const { PRESETS } = await import('../presets');
    const r = compileSource(PRESETS.korobeiniki.source);
    const s = splices(plan(r, codeShifts(r)), 90);
    // (the second half begins: &end then &c, as at the unwritten swells heard at 19.7, 60.3, 86.5 s)
    const halves = s.filter((x) => x.after === 'end' && x.cell === 'c').map((x) => x.at);
    for (const t of [20.21, 60.21, 86.88]) expect(halves.some((h) => Math.abs(h - t) < 0.01)).toBe(true);
    // (the B sections, 26.7 to 53.3 s, play another part: no splice of the tune heard there)
    expect(s.some((x) => x.at > 27 && x.at < 53)).toBe(false);
  });
});

describe('folding three rounds into one', () => {
  it('averages the rounds where the window leaves them clear, and leaves the rest unheard', async () => {
    const { fold } = await import('./wavelet');
    // (a fast period: clear everywhere but the first and last columns; a slow one: covered nearly everywhere)
    const fast = Float32Array.from({ length: 300 }, (_, c) => (c < 100 ? 1 : c < 200 ? 2 : 3));
    const slow = Float32Array.from({ length: 300 }, (_, c) => (c < 100 ? 10 : c < 200 ? 20 : 30));
    const f = fold({ window: 30, periods: [0.01, 40], rows: [fast, slow] }, 10, 3);
    expect(f.window).toBe(10);
    expect(f.rows[0]).toHaveLength(100);
    expect(f.rows[0][50]).toBeCloseTo(2);
    expect(f.rows[1][50]).toBeNaN();
  });
});

describe('a loop, transformed circularly', () => {
  it('has no edges: a pulse is as loud at the start as in the middle', async () => {
    const { grid, transform } = await import('./wavelet');
    const { sampled } = await import('./signals');
    const g = grid(30, 50, true);
    const n = Math.round(g.window * g.rate);
    expect(n & (n - 1)).toBe(0);
    const x = sampled(
      Array.from({ length: 60 }, (_, i) => note(i * 0.5)),
      g,
      ['impulses'],
    ).impulses!;
    const s = transform(x, g);
    const row = s.rows[s.periods.findIndex((p) => p >= 0.5)];
    const mid = row[Math.floor(row.length / 2)];
    expect(row[2] / mid).toBeGreaterThan(0.8);
    expect(row[row.length - 3] / mid).toBeGreaterThan(0.8);
  });
});

describe('the structure', () => {
  it('is every cell where it plays, nested, lap after lap', async () => {
    const { structure } = await import('./structure');
    const { compileSource } = await import('../compile');
    const { codeShifts } = await import('../program');
    const { plan } = await import('../realize');
    const src = '&bar scan(1 1 1 1) step=60bpm\n&a 0 2\n&b &a 4 4\n&c base=&b _ _ 7\n&tune step=&bar &b &c\n&v s=tri\n&out map=sample [&tune * &v]';
    const r = compileSource(src);
    const nodes = structure(plan(r, codeShifts(r), r.off), 8);
    const at = (cell: string) => nodes.filter((n) => n.cell === cell).map((n) => `${n.at}-${n.to}/${n.depth}`);
    // (a step a second: &b and &c four steps each, &a two inside each; the line round again at 8 s)
    expect(at('tune')).toEqual(['0-8/0']);
    expect(at('b')).toEqual(['0-4/1']);
    expect(at('c')).toEqual(['4-8/1']);
    expect(at('a')).toEqual(['0-2/2', '4-6/2']);
    expect(nodes.find((n) => n.cell === 'c')?.base).toBe('b');
  });
});
