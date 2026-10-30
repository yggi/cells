// The renderer (decision 062): a note's level and pitch, a render in chunks the render whole, a stream of windows the
// render whole, the stems summing to the mix, the same sound every time, a later stage's parameter said and rendered dry,
// and every example of stage R1 rendered with no diagnostic.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { cellId } from './ids';
import { eventsBetween, plan } from './realize';
import { createRenderer, loudness } from './render';
import { pieceAudio } from './audioexport';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';

const compiled = (text: string) => compileSource(text, undefined, { resolve: resolveSeed });
/** A text, rendered. */
const audio = (text: string, options: Parameters<typeof pieceAudio>[2]) => {
  const r = compiled(text);
  // (a text that doesn't compile renders silence, which proves nothing)
  expect(r.ok, r.diagnostics.map((d) => d.message).join('; ')).toBe(true);
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

  it('a moving filter in chunks is the moving filter whole: its coefficients are taken every 32 frames from the render’s start, not a chunk’s', () => {
    // (a chunk's start isn't a block's: counted from each chunk, this differs from the whole by 5.6e-3)
    const r = compiled('&sw map=adsr .3 .2 .2 .1\n&v s=sawtooth loop=A2 lpf=200..4000 * &sw lpq=6\n&n step=2 0 3 5 7\n&out map=sample [&n * &v]');
    expect(bits(inChunks(r, 2, [1, 31, 100, 777]))).toEqual(bits(inChunks(r, 2, [2 * 48000])));
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
    expect(a.stems.map((s) => s.name)).toEqual(expect.arrayContaining(['bd', 'hh', 'bassV', 'leadV']));
    for (const ch of [0, 1] as const) {
      const sum = new Float32Array(a.mix[ch].length);
      for (const s of a.stems) for (let i = 0; i < sum.length; i++) sum[i]! += s.channels[ch][i]!;
      expect(bits([sum])).toEqual(bits([a.mix[ch]]));
    }
    // and asking for stems moves no sample of the mix
    expect(bits(pieceAudio(example('electroswing'), codeShifts(example('electroswing')), { seconds: 6 }).mix)).toEqual(bits(a.mix));
  });

  it('the stems, an entry of the card each, sum to the mix exactly, and the mix is the mix to float rounding', () => {
    const r = example('electroswing');
    const a = pieceAudio(r, codeShifts(r), { seconds: 6, tracks: 'entries' });
    expect(a.stems.map((s) => s.name)).toEqual(['drumsOut', 'crackle*vinyl', 'bassOut', 'stabOut', 'leadOut', 'lead2']);
    const plain = pieceAudio(r, codeShifts(r), { seconds: 6 });
    for (const ch of [0, 1] as const) {
      const sum = new Float32Array(a.mix[ch].length);
      for (const s of a.stems) for (let i = 0; i < sum.length; i++) sum[i]! += s.channels[ch][i]!;
      expect(bits([sum])).toEqual(bits([a.mix[ch]]));
      // (the same notes, summed by entry rather than by voice: the order of the additions, no more)
      for (let i = 0; i < sum.length; i++) expect(Math.abs(a.mix[ch][i]! - plain.mix[ch][i]!)).toBeLessThan(1e-6);
    }
  });

  it('a voice in two entries is split between their stems at the levels the card gives it, each filtered as the mix is', () => {
    const text = '&v s=saw loop=A3 lpf=800\n&a step=4 0 2 4 5\n&b step=4 7 ~ 9 ~\n&out map=sample postgain=1 [&a * &v, &b * &v * .5, &a * &v * .25]';
    const a = audio(text, { seconds: 1, tracks: 'entries' });
    expect(a.stems.map((s) => s.name)).toEqual(['a*v', 'b*v', 'a*v#2']);
    const one = audio('&v s=saw loop=A3 lpf=800\n&a step=4 0 2 4 5\n&out map=sample postgain=1 [&a * &v]', { seconds: 1 });
    // the first entry's stem is &a on &v at 1, as that piece alone; the third its quarter
    for (let i = 0; i < one.mix[0].length; i++) {
      expect(a.stems[0]!.channels[0][i]).toBeCloseTo(one.mix[0][i]!, 6);
      expect(a.stems[2]!.channels[0][i]).toBeCloseTo(one.mix[0][i]! * 0.25, 6);
    }
  });

  it('a voice in two entries with a moving level is split without drift: each share reads its level, bends and shape on its own', () => {
    const lv =
      '&bar meter("4/4") step=120bpm\n&lv map=amp step=16n 1 .2 1 .2\n&v s=saw loop=A3 lpf=900 pitch=0..2 * &(map=lin loop=3 0 1 0)\n&n step=4 0 2 4 5\n&a [&n * &v * &lv]\n';
    for (const card of ['&out map=sample [&a, &a * .5]', '&out map=sample [&a, &a * .5] [&a * .3]']) {
      const entries = audio(lv + card, { seconds: 2, tracks: 'entries' });
      const plain = audio(lv + card, { seconds: 2 });
      expect(plain.loudness.rms, card).toBeGreaterThan(-60);
      let most = 0;
      for (const ch of [0, 1] as const) for (let i = 0; i < plain.mix[ch].length; i++) most = Math.max(most, Math.abs(entries.mix[ch][i]! - plain.mix[ch][i]!));
      expect(most, card).toBeLessThan(1e-6);
    }
  });

  it('a card of two channels names an entry by its side, and an entry on the left is heard on the left alone', () => {
    const a = pieceAudio(example('just'), codeShifts(example('just')), { seconds: 2, tracks: 'entries' });
    expect(a.stems.map((s) => s.name)).toEqual(['pure*organ:left', 'tempered*organ:right']);
    expect(loudness([a.stems[0]!.channels[1]]).rms).toBe(-Infinity);
    expect(loudness([a.stems[1]!.channels[0]]).rms).toBe(-Infinity);
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

  it("a voice on a MIDI card alone is heard as well as sent (decision 064): it renders as it would on a sound card at its entry's gain", () => {
    const midi = audio('&v s=saw loop=A3\n&n step=4 0 2 4 5\n&out map=midi [&n * &v * .5]', { seconds: 1 });
    const sound = audio('&v s=saw loop=A3\n&n step=4 0 2 4 5\n&out map=sample postgain=1 [&n * &v * .5]', { seconds: 1 });
    expect(midi.loudness.rms).toBeGreaterThan(-Infinity);
    expect(Math.abs(midi.loudness.rms - sound.loudness.rms)).toBeLessThan(0.01);
    // (switched off, the card takes it away)
    const r = compiled('&v s=saw loop=A3\n&n step=4 0 2 4 5\n&out map=midi [&n * &v * .5]');
    expect(pieceAudio(r, codeShifts(r), { seconds: 1, muted: new Set([cellId('out')]) }).loudness.rms).toBe(-Infinity);
  });

  it('a note is articulated: its gate open for 90 % of its length, then it falls away over its release', () => {
    const a = audio('&v s=sine loop=A3\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]', { seconds: 1, tail: 0 });
    const level = (from: number, to: number) => loudness([a.mix[0].subarray(Math.round(from * 48000), Math.round(to * 48000))]).rms;
    // open at .85 s; .05 s after its gate shuts at .9 s, three of its release's time constants down (about -26 dB)
    expect(Math.abs(level(0.84, 0.86) - level(0.4, 0.6))).toBeLessThan(0.2);
    expect(level(0.94, 0.96) - level(0.4, 0.6)).toBeLessThan(-20);
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
