// The renderer (decision 062): a note's level and pitch, a render in chunks the render whole, a stream of windows the
// render whole, the stems summing to the mix, the same sound every time, a later stage's parameter said and rendered dry,
// and every example of stage R1 rendered with no diagnostic.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { eventsBetween, plan } from './realize';
import { createRenderer, loudness } from './render';
import { pieceAudio } from './audioexport';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';

const compiled = (text: string) => compileSource(text, undefined, { resolve: resolveSeed });
/** A text, rendered. */
const audio = (text: string, options: Parameters<typeof pieceAudio>[2]) => {
  const r = compiled(text);
  return pieceAudio(r, codeShifts(r), options);
};
const example = (key: string) => compiled((PRESETS as Record<string, { source: string }>)[key]!.source);
/** A render's bits, to compare two renders exactly. */
const bits = (channels: readonly Float32Array[]) => channels.map((c) => [...new Uint32Array(c.buffer, c.byteOffset, c.length)].join(','));

/** A piece rendered in chunks of the given sizes (cycling), all its events added first. */
function inChunks(r: CompileResult, seconds: number, sizes: readonly number[]) {
  const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
  rr.add(eventsBetween(plan(r, codeShifts(r)), 0, seconds, true, { until: seconds }));
  const total = Math.round(seconds * rr.sampleRate);
  const mix = [new Float32Array(total), new Float32Array(total)];
  for (let at = 0, i = 0; at < total; i++) {
    const n = Math.min(total - at, sizes[i % sizes.length]!);
    const out = rr.render(n);
    mix[0]!.set(out.mix[0], at);
    mix[1]!.set(out.mix[1], at);
    at += n;
  }
  return mix;
}

describe('the renderer', () => {
  it('a note sounds at its pitch, at the level the examples’ postgain= assume: .35 × .4 a unit, panned to the middle', () => {
    const a = audio('&v s=sine loop=440hz\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]', { seconds: 1, tail: 0 });
    const left = a.mix[0];
    let peak = 0;
    for (const v of left) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeCloseTo(0.35 * 0.4 * Math.SQRT1_2, 4);
    // its pitch: 440 crossings upward in a second, give or take the first
    let up = 0;
    for (let i = 1; i < left.length; i++) if (left[i - 1]! < 0 && left[i]! >= 0) up++;
    expect(Math.abs(up - 440)).toBeLessThanOrEqual(1);
  });

  it('a render in chunks of any size is the render whole, sample for sample', () => {
    const r = example('electroswing');
    const whole = inChunks(r, 8, [8 * 48000]);
    expect(bits(inChunks(r, 8, [1, 31, 128, 777, 5000]))).toEqual(bits(whole));
    expect(bits(inChunks(r, 8, [128]))).toEqual(bits(whole));
  });

  it('a stream, each window’s events added as it comes, is the render whole', () => {
    const r = example('bossa');
    const p = plan(r, codeShifts(r));
    const whole = inChunks(r, 6, [6 * 48000]);
    const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
    const parts: Float32Array[][] = [];
    // (each window's notes added before the frames that reach them, as a player lays them ahead)
    for (let w = 0; w < 6; w += 0.5) {
      rr.add(eventsBetween(p, w, w + 0.5, true, { until: 6 }));
      const out = rr.render(Math.round((w + 0.5) * 48000) - rr.position);
      parts.push([...out.mix]);
    }
    const join = (ch: 0 | 1) => Float32Array.from(parts.flatMap((x) => [...x[ch]!]));
    expect(bits([join(0), join(1)])).toEqual(bits(whole));
  });

  it('the stems, a voice each, sum to the mix exactly', () => {
    const a = pieceAudio(example('electroswing'), codeShifts(example('electroswing')), { seconds: 6, tracks: 'voices' });
    expect(a.stems.map((s) => s.voice)).toEqual(expect.arrayContaining(['bd', 'hh', 'bassV', 'leadV']));
    for (const ch of [0, 1] as const) {
      const sum = new Float32Array(a.mix[ch].length);
      for (const s of a.stems) for (let i = 0; i < sum.length; i++) sum[i]! += s.channels[ch][i]!;
      expect(bits([sum])).toEqual(bits([a.mix[ch]]));
    }
    // and asking for stems moves no sample of the mix
    expect(bits(pieceAudio(example('electroswing'), codeShifts(example('electroswing')), { seconds: 6 }).mix)).toEqual(bits(a.mix));
  });

  it('a piece sounds the same every time, noise and all', () => {
    const r = example('drums');
    const once = pieceAudio(r, codeShifts(r), { seconds: 4 });
    expect(bits(pieceAudio(r, codeShifts(r), { seconds: 4 }).mix)).toEqual(bits(once.mix));
  });

  it('a parameter of a later stage is said, once a voice, and the voice rendered without it', () => {
    const wet = audio('&v s=saw loop=A3 room=.4 delay=.3\n&n step=4 0 2 4 5\n&out map=sample [&n * &v]', { seconds: 1 });
    expect(wet.diagnostics.map((d) => `${d.voice} ${d.param}`)).toEqual(['v room', 'v delay']);
    const dry = audio('&v s=saw loop=A3\n&n step=4 0 2 4 5\n&out map=sample [&n * &v]', { seconds: 1 });
    expect(bits(wet.mix)).toEqual(bits(dry.mix));
  });

  it('a voice heard only on a MIDI card is sent, not heard (decision 019): it renders silent', () => {
    const a = audio('&v s=saw loop=A3\n&n step=4 0 2 4 5\n&out map=midi [&n * &v]', { seconds: 1 });
    expect(a.loudness.rms).toBe(-Infinity);
  });

  it('a sample rate out of its range is refused', () => {
    const r = compiled('&v s=sine loop=A3\n&n step=1 0\n&out map=sample [&n * &v]');
    expect(() => createRenderer(r, codeShifts(r), { sampleRate: 1000 })).toThrow(/8000 to 192000/);
    expect(pieceAudio(r, codeShifts(r), { seconds: 1, tail: 0, sampleRate: 44100 }).mix[0].length).toBe(44100);
  });

  it('every example whose voices stage R1 sounds renders with no diagnostic and no sample that isn’t a number (47 of 81)', () => {
    let clean = 0;
    for (const key of Object.keys(PRESETS)) {
      const r = example(key);
      const a = pieceAudio(r, codeShifts(r), { seconds: 1, tail: 0 });
      for (const c of a.mix) expect(c.every(Number.isFinite), key).toBe(true);
      if (!a.diagnostics.length) clean++;
    }
    expect(clean).toBeGreaterThanOrEqual(47);
  });

  it('loudness is the RMS of both channels and the peak, in dB below full scale', () => {
    const half = Float32Array.from({ length: 1000 }, (_, i) => (i % 2 ? 0.5 : -0.5));
    expect(loudness([half, half])).toEqual({ rms: 20 * Math.log10(0.5), peak: 20 * Math.log10(0.5), clipped: 0 });
    expect(loudness([new Float32Array(4)]).rms).toBe(-Infinity);
  });
});
