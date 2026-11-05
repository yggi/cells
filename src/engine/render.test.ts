// The renderer (decision 062): a note's level and pitch, a render in chunks the render whole, a stream of windows the
// render whole, the stems summing to the mix, the same sound every time, a later stage's parameter said and rendered dry,
// and every example of stage R1 rendered with no diagnostic.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, DEFAULT_ENV, type CompileResult } from './program';
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

  it("a parameter of a later stage is said, once a cell, and the sound rendered without it: a resonator's board (R3)", () => {
    const wet = audio('&v s=saw loop=A3 board=fork\n&n step=4 0 2 4 5\n&out map=sample [&n * &v]', { seconds: 1 });
    expect(wet.diagnostics.map((d) => `${d.voice} ${d.param}`)).toEqual(['v board']);
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

/** A short click on a voice, the echo's parameters `echo` on it, as the mix and its stems by voice. */
function click(echo: string, seconds = 2) {
  const r = compiled(`&v s=sine loop=440hz ${echo} env=&(map=adsr 0 .01 0 .005)\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]`);
  expect(r.ok, r.diagnostics.map((d) => d.message).join('; ')).toBe(true);
  const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
  rr.add(eventsBetween(plan(r, codeShifts(r)), 0, seconds, true, { until: 0.5 }));
  const out = rr.render(Math.round(seconds * rr.sampleRate));
  return { ...out, stems: rr.stems, diagnostics: rr.diagnostics };
}

describe('the echo (decision 062 R2, #452)', () => {
  const RATE = 48000;
  it("a voice's own echo is its sound again delaytime= later, times delayfeedback= each time round, heard wet only", () => {
    const { mix, stems, diagnostics } = click('delay=.5 delaytime=.25 delayfeedback=.5');
    expect(diagnostics).toEqual([]);
    expect(stems).toEqual(['v', 'echo:v']);
    const dry = click('').mix[0];
    const D = 0.25 * RATE;
    // (the voice's sound, then the echo's: .5 of it a quarter second later, .25 of it half a second later, …)
    for (const [k, gain] of [
      [1, 0.5],
      [2, 0.25],
      [3, 0.125],
    ] as const)
      for (let i = 0; i < 0.02 * RATE; i++) expect(mix[0][k * D + i]).toBeCloseTo(dry[i]! * gain, 6);
  });

  it('a voice with delay= and no delaytime= sends to the shared echo: 0.375 s, its feedback .35, whatever its own delayfeedback=', () => {
    const { mix, stems } = click('delay=.4 delayfeedback=.9');
    expect(stems).toEqual(['v', 'echo']);
    const dry = click('').mix[0];
    const D = 0.375 * RATE;
    for (let i = 0; i < 0.02 * RATE; i++) {
      expect(mix[0][D + i]).toBeCloseTo(dry[i]! * 0.4, 6);
      expect(mix[0][2 * D + i]).toBeCloseTo(dry[i]! * 0.4 * 0.35, 6);
    }
  });

  it('delaytime= alone sends .3 to its own echo; delayfeedback= alone makes none', () => {
    const own = click('delaytime=.25');
    const dry = click('').mix[0];
    for (let i = 0; i < 0.02 * RATE; i++) expect(own.mix[0][0.25 * RATE + i]).toBeCloseTo(dry[i]! * 0.3, 6);
    expect(click('delayfeedback=.5').stems).toEqual(['v']);
    expect(bits(click('delayfeedback=.5').mix)).toEqual(bits(click('').mix));
  });

  it('its return is a stem of its own: the stems sum to the mix, to the bit, and a render in chunks is the render whole', () => {
    const r = example('effects');
    const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 6, true, { until: 6 }));
    const out = rr.render(6 * RATE);
    expect(rr.stems).toEqual(['warm', 'thin', 'glass', 'grit', 'echo:glass', 'reverb']);
    // (added in the stems' order, as the mix adds them)
    for (const ch of [0, 1] as const)
      for (let i = 0; i < out.mix[ch].length; i++) {
        let sum = 0;
        for (const s of rr.stems) sum = Math.fround(sum + out.stems.get(s)![ch][i]!);
        if (sum !== out.mix[ch][i]) expect([ch, i, out.mix[ch][i]]).toEqual([ch, i, sum]);
      }
    expect(out.stems.get('echo:glass')![0].reduce((m, x) => Math.max(m, Math.abs(x)), 0)).toBeGreaterThan(0.01);
    expect(bits(inChunks(r, 6, [1, 31, 128, 777, 5000]))).toEqual(bits(inChunks(r, 6, [6 * RATE])));
    expect(rr.diagnostics.filter((d) => d.param.startsWith('delay'))).toEqual([]);
  });

  it('a moving delay= moves the send, note by note', () => {
    const r = compiled(
      '&v s=sine loop=440hz delay=0..1 * &d delaytime=.25 env=&(map=adsr 0 .01 0 .005)\n&d map=lin step=1 0 1\n&n step=1 0 0\n&out map=sample postgain=1 [&n * &v]',
    );
    const rr = createRenderer(r, codeShifts(r));
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 3, true, { until: 2 }));
    const m = rr.render(3 * RATE).mix[0];
    const peak = (from: number) => Math.max(...[...m.subarray(from * RATE, (from + 0.02) * RATE)].map(Math.abs));
    // (the first note sent at 0, the second at 1: its echo a quarter second after it, as loud as itself)
    expect(peak(0.25)).toBeLessThan(1e-6);
    expect(peak(1.25)).toBeCloseTo(peak(1), 4);
  });

  it("an instrument's echo is one echo of its voices' sum, a return of its own (decision 067)", () => {
    const r = compiled('&a s=saw loop=A3\n&b s=square loop=A2\n&box delay=.3 delaytime=.2 [&a, &b]\n&n step=4 0 2\n&out map=sample [&n * &box]');
    const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 1, true, { until: 1 }));
    rr.render(RATE);
    expect([rr.stems, rr.diagnostics]).toEqual([['a', 'b', 'echo:box'], []]);
  });
});

describe('the reverb (decision 062 R2, #452)', () => {
  const RATE = 48000;
  /** A click through the reverb: the mix and its return, at a rate. */
  const room = (rate: number, params = 'room=1') => {
    const r = compileSource(
      `&v s=white ${params} env=&(map=adsr 0 .002 0 .001)\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]`,
      { ...DEFAULT_ENV, SAMPLE_RATE: rate },
      { resolve: resolveSeed },
    );
    const rr = createRenderer(r, codeShifts(r), { tracks: 'voices', sampleRate: rate });
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 4, true, { until: 0.5 }));
    const out = rr.render(4 * rate);
    return { stems: rr.stems, dry: out.stems.get('v')!, wet: out.stems.get('reverb'), diagnostics: rr.diagnostics };
  };
  const energy = (x: Float32Array, from = 0, to = x.length) => {
    let e = 0;
    for (let i = from; i < to; i++) e += x[i]! * x[i]!;
    return e;
  };

  it("is Cell studio's convolver's wet energy, a channel: 2.81 s · 44100² · 10^(−5.8) over the rate, whatever its noise", () => {
    for (const rate of [44100, RATE]) {
      const { stems, dry, wet, diagnostics } = room(rate);
      expect([stems, diagnostics]).toEqual([['v', 'reverb'], []]);
      const want = (2.81 * 44100 * 44100 * Math.pow(10, -5.8)) / rate;
      // (a click's energy times the impulse's: within 0.5 dB, a click not being white)
      for (const ch of [0, 1] as const) expect(Math.abs(10 * Math.log10(energy(wet![ch]) / energy(dry[ch]) / want))).toBeLessThan(0.5);
    }
  });

  it('starts 10 ms on, and falls as the noise burst does: its energy by e^(−2t/τ), τ = ln 3.8 / ln 200', () => {
    const { wet } = room(RATE);
    expect(energy(wet![0], 0, 0.009 * RATE)).toBe(0);
    const tau = Math.log(3.8) / Math.log(200);
    // (over 0.3 s, before the next click a second on: 2 · 0.3 / τ nepers of energy, within 1 dB)
    const fall = 10 * Math.log10(energy(wet![0], 0.1 * RATE, 0.4 * RATE) / energy(wet![0], 0.4 * RATE, 0.7 * RATE));
    expect(Math.abs(fall - (10 * (2 * 0.3)) / tau / Math.LN10)).toBeLessThan(1);
  });

  it("keeps a channel's sound on its channel, and its two sides don't correlate", () => {
    const { wet } = room(RATE);
    let lr = 0;
    for (let i = 0; i < wet![0].length; i++) lr += wet![0][i]! * wet![1][i]!;
    expect(Math.abs(lr) / Math.sqrt(energy(wet![0]) * energy(wet![1]))).toBeLessThan(0.1);
  });

  it('a send is room=, fixed or moving; none, no reverb', () => {
    expect(room(RATE, '').stems).toEqual(['v']);
    const half = room(RATE, 'room=.5').wet!;
    const full = room(RATE).wet!;
    expect(10 * Math.log10(energy(full[0]) / energy(half[0]))).toBeCloseTo(20 * Math.log10(2), 3);
  });
});

describe('grit (decision 062 R2, #452)', () => {
  const RATE = 48000;
  /** A sine's peak and its first samples, through the grit `params`. */
  const sine = (params: string) => {
    const r = compiled(`&v s=sine loop=110hz ${params}\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]`);
    const a = pieceAudio(r, codeShifts(r), { seconds: 0.5, tail: 0 });
    return { left: a.mix[0], diagnostics: a.diagnostics };
  };
  const unique = (x: Float32Array) => new Set([...x.subarray(RATE * 0.1, RATE * 0.2)].map((v) => v.toFixed(6))).size;

  it("distort= is Tone's curve, (3 + k) · x · 20° / (π + k · |x|): a quiet sine grows by its slope at silence", () => {
    const { left, diagnostics } = sine('distort=.3');
    expect(diagnostics).toEqual([]);
    const clean = sine('').left;
    const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    // (a note's peak .35, panned to the middle: x = .35 · √½ before the voice's .4; through the curve, and then the .4)
    const k = 30;
    const x = 0.35 * Math.SQRT1_2;
    const curve = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * x);
    expect(peak(left)).toBeCloseTo(curve * 0.4, 2);
    expect(peak(left)).toBeGreaterThan(peak(clean));
  });

  it('crush= rounds each sample to 2^(bits − 1) levels a side: a sine at 3 bits takes a few values, at 16 none is taken away', () => {
    expect(unique(sine('crush=3').left)).toBeLessThan(20);
    expect(unique(sine('crush=16').left)).toBe(unique(sine('').left));
    expect(sine('crush=3').diagnostics).toEqual([]);
  });

  it("crushes first, then distorts, then filters, as Cell studio's chain has them", () => {
    // (3 bits: levels at quarters; each one then distorted, so every sample, over the voice's .4, is the curve at a quarter,
    // within the curves' interpolation, .03: distorted first, it would sit on the quarters, .046 and more from these)
    const k = 50;
    const curve = (x: number) => (Math.abs(x) < 0.001 ? 0 : ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)));
    const allowed = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map(curve);
    // (all but the few on the crusher's curve between two levels, where it is read between them: 99 %)
    const samples = [...sine('crush=3 distort=.5').left.subarray(RATE * 0.1, RATE * 0.2)];
    const on = samples.filter((v) => Math.min(...allowed.map((a) => Math.abs(v / 0.4 - a))) < 0.03).length;
    expect(on / samples.length).toBeGreaterThan(0.99);
    // (written the other way round, the chain is the same: crush=, then distort=)
    expect(bits([sine('distort=.5 crush=3').left])).toEqual(bits([sine('crush=3 distort=.5').left]));
  });
});

describe('FM (decision 062 R2, #452)', () => {
  const RATE = 48000;
  /** A held carrier at 440 Hz under the modulator `op`, its own `carrier` parameters: the left channel. */
  const fm = (carrier: string, op = '&op s=sine ratio=1') => {
    const r = compiled(`&v s=sine loop=440hz ${carrier} env=&(map=adsr .001 .01 1 .01)\n${op}\n&n step=1 0\n&out map=sample postgain=1 [&n * &v]`);
    expect(r.ok, r.diagnostics.map((d) => d.message).join('; ')).toBe(true);
    const a = pieceAudio(r, codeShifts(r), { seconds: 0.5, tail: 0 });
    return { left: a.mix[0], diagnostics: a.diagnostics };
  };

  it('a sine modulated by a sine at its frequency is sin(2πft − I·cos 2πft + I): its phase swung by the index', () => {
    const { left, diagnostics } = fm('fm=&op index=2');
    expect(diagnostics).toEqual([]);
    // (against the formula over 20 ms of its sustain, scaled by its level there: correlated to .998, the phase stepped a
    // frame at a time, as an oscillator steps it, against the formula's continuous one)
    const from = 0.1 * RATE;
    const n = 0.02 * RATE;
    let xy = 0;
    let xx = 0;
    let yy = 0;
    for (let i = 0; i < n; i++) {
      const t = (from + i) / RATE;
      const want = Math.sin(2 * Math.PI * 440 * t - 2 * Math.cos(2 * Math.PI * 440 * t) + 2);
      const got = left[from + i]!;
      xy += want * got;
      xx += want * want;
      yy += got * got;
    }
    expect(xy / Math.sqrt(xx * yy)).toBeGreaterThan(0.998);
  });

  it('index=0 is the carrier alone, bit for bit; without index=, an index of 1', () => {
    expect(bits([fm('fm=&op index=0').left])).toEqual(bits([fm('').left]));
    expect(bits([fm('fm=&op').left])).toEqual(bits([fm('fm=&op index=1').left]));
    expect(bits([fm('fm=&op').left])).not.toEqual(bits([fm('').left]));
  });

  it("a modulator's own modulator swings it in turn, and its ratio= sets its frequency", () => {
    const one = fm('fm=&op index=2', '&op s=sine ratio=2');
    const two = fm('fm=&op index=2', '&op s=sine ratio=2 fm=&op2 index=3\n&op2 s=sine ratio=.5');
    expect(bits([two.left])).not.toEqual(bits([one.left]));
    expect(two.diagnostics).toEqual([]);
  });
});

describe("an instrument's grit, on its voices' sum (decision 067, #452)", () => {
  const RATE = 48000;
  const stems = (text: string) => {
    const r = compiled(text);
    expect(r.ok, r.diagnostics.map((d) => d.message).join('; ')).toBe(true);
    const rr = createRenderer(r, codeShifts(r), { tracks: 'voices' });
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 1, true, { until: 1 }));
    const out = rr.render(RATE);
    return { names: rr.stems, of: (n: string) => out.stems.get(n)!, mix: out.mix, diagnostics: rr.diagnostics };
  };
  const VOICES = '&a s=saw loop=A2\n&b s=square loop=E3\n&n step=4 0 2\n';
  const k = 60;
  const curve = (x: number) => (Math.abs(x) < 0.001 ? 0 : ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)));

  it("is its curve on what its voices play into it, summed: not each voice's alone", () => {
    const dry = stems(`${VOICES}&out map=sample postgain=1 [&n * &a, &n * &b]`);
    const box = stems(`${VOICES}&box distort=.6 [&a, &b]\n&out map=sample postgain=1 [&n * &box]`);
    expect([box.names, box.diagnostics]).toEqual([['a', 'b', 'box'], []]);
    let far = 0;
    let apart = 0;
    for (let i = 0; i < RATE; i += 7) {
      const sum = dry.of('a')[0][i]! + dry.of('b')[0][i]!;
      // (Tone's curve, read between its 1024 points, steep at silence: within .01)
      far = Math.max(far, Math.abs(box.of('box')[0][i]! - curve(sum)));
      apart = Math.max(apart, Math.abs(curve(dry.of('a')[0][i]!) + curve(dry.of('b')[0][i]!) - curve(sum)));
    }
    expect(far).toBeLessThan(0.01);
    expect(apart).toBeGreaterThan(0.05);
    // (its voices play nothing of their own: their sound is the instrument's stem)
    expect(box.of('a')[0].every((x) => x === 0)).toBe(true);
  });

  it('its stems sum to the mix, its filters and sends after its grit', () => {
    const box = stems(`${VOICES}&box crush=6 distort=.3 lpf=900 delay=.3 room=.2 [&a, &b]\n&out map=sample postgain=1 [&n * &box]`);
    expect([box.names, box.diagnostics]).toEqual([['a', 'b', 'echo', 'reverb', 'box'], []]);
    for (const ch of [0, 1] as const)
      for (let i = 0; i < RATE; i++) {
        let sum = 0;
        for (const n of box.names) sum = Math.fround(sum + box.of(n)[ch][i]!);
        if (Math.abs(sum - box.mix[ch][i]!) > 1e-6) expect([ch, i, box.mix[ch][i]]).toEqual([ch, i, sum]);
      }
  });
});
