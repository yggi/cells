import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { eventsBetween, plan } from './realize';

const events = (src: string) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(
    plan(r, () => 0),
    0,
    8,
  )
    .map((e) => ({ at: +e.at.toFixed(6), voice: e.voice, freq: +e.freq.toFixed(3), gains: e.gains.map((g) => +g.toFixed(6)) }))
    .sort((a, b) => a.at - b.at || a.voice.localeCompare(b.voice));
};

const VOICES = `
&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&sd s=white env=&(map=adsr 0 .12 0 .05)
`;

describe("a voice's gain=", () => {
  it('is its own gain: a kit of balanced members plays what one product a drum plays', () => {
    const products = events(`${VOICES}
&kick map=amp step=&bar 1 ~ 1 ~
&snare map=amp step=&bar ~ 1 ~ 1
&out map=sample [&kick * &bd * .8, &snare * &sd * .4]`);
    const kit = events(`${VOICES.replace('&bd s=sine', '&bd gain=.8 s=sine').replace('&sd s=white', '&sd gain=.4 s=white')}
&beat step=&bar &bd &sd &bd &sd
&out map=sample [&beat]`);
    expect(kit).toEqual(products);
  });

  it('is 1 by default, and multiplies every gain a voice is played at', () => {
    const plain = events(`${VOICES}\n&beat step=&bar &bd ~ &bd ~\n&out map=sample [&beat * .5]`);
    const half = events(`${VOICES.replace('&bd s=sine', '&bd gain=.5 s=sine')}\n&beat step=&bar &bd ~ &bd ~\n&out map=sample [&beat * .5]`);
    expect(half.map((e) => e.gains)).toEqual(plain.map((e) => e.gains.map((g) => g * 0.5)));
  });

  it('is no warning on a voice', () => {
    const r = compileSource(`&lead gain=.5 s=saw loop=C4\n&tune 0 2 4 step=2\n&out map=sample [&tune * &lead]`);
    expect(r.diagnostics.filter((d) => /gain/.test(d.message))).toEqual([]);
  });
});

describe('oneshot', () => {
  const at = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return eventsBetween(
      plan(r, () => 0),
      0,
      4,
    ).map((e) => ({ voice: e.voice, at: +e.at.toFixed(3), dur: +e.dur.toFixed(3) }));
  };
  const SRC = (word: string) => `&bar scan(1 1 1 1) step=240bpm
&bd ${word} s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh s=white env=&(map=adsr 0 .04 0 .02)
&beat step=&bar*2 &bd &hh &bd &hh
&out map=sample [&beat]`;

  it('plays a voice its envelope through, whatever its step: a kick on eighths rings its decay', () => {
    const plain = at(SRC(''));
    const hit = at(SRC('oneshot'));
    // (eighths at 240 bpm: an eighth is 0.125 s, the kick's decay 0.3 s)
    expect(plain.find((e) => e.voice === 'bd')!.dur).toBeCloseTo(0.125, 3);
    expect(hit.find((e) => e.voice === 'bd')!.dur).toBeCloseTo(0.3, 3);
    // the same notes at the same times, and the hats as they were
    expect(hit.map((e) => [e.voice, e.at])).toEqual(plain.map((e) => [e.voice, e.at]));
    expect(hit.filter((e) => e.voice === 'hh')).toEqual(plain.filter((e) => e.voice === 'hh'));
  });

  it('is given once', () => {
    expect(compileSource(SRC('oneshot oneshot')).diagnostics.some((d) => /oneshot is given twice/.test(d.message))).toBe(true);
  });
});

describe("a hit's gain: &x:0:g", () => {
  const levels = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    return eventsBetween(
      plan(r, () => 0),
      0,
      2,
    ).map((e) => ({ voice: e.voice, at: +e.at.toFixed(3), level: +e.levels[0].level.toFixed(3) }));
  };
  const V = `&bar scan(1 1 1 1) step=120bpm
&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)
&hh s=white env=&(map=adsr 0 .04 0 .02)
`;

  it("is Strudel's sound fields: its number (0), then its gain", () => {
    const a = levels(`${V}&t step=&bar &bd &bd:0 &bd:0:.5 &bd:0:1.5\n&out map=sample [&t]`);
    expect(a.map((e) => e.level)).toEqual([1, 1, 0.5, 1.5]);
    // (a pitched hit is not yet; a melody's numbers have no fields)
    expect(compileSource(`${V}&t step=&bar &bd:2\n&out map=sample [&t]`).diagnostics.some((d) => /pitched hit/.test(d.message))).toBe(true);
    expect(compileSource(`${V}&t step=&bar 0%50\n&out map=sample [&t * &bd]`).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it("plays a map=amp pattern's levels on a groove's own hits, and a chord member's alone", () => {
    const amp = levels(`${V}&hats map=amp step=&bar .5 .25 .5 .25\n&out map=sample [&hats * &hh]`);
    const groove = levels(`${V}&hats step=&bar &hh:0:.5 &hh:0:.25 &hh:0:.5 &hh:0:.25\n&out map=sample [&hats]`);
    expect(groove).toEqual(amp);
    const chord = levels(`${V}&beat step=&bar [&bd,&hh:0:.4] &hh\n&out map=sample [&beat]`);
    expect(chord.filter((e) => e.at === 0).map((e) => [e.voice, e.level])).toEqual([
      ['bd', 1],
      ['hh', 0.4],
    ]);
  });

  it('is kept inside a subsequence', () => {
    const a = levels(`${V}&t step=&bar [&hh:0:.5 &hh] &bd\n&out map=sample [&t]`);
    expect(a.slice(0, 3).map((e) => [e.voice, e.at, e.level])).toEqual([
      ['hh', 0, 0.5],
      ['hh', 0.25, 1],
      ['bd', 0.5, 1],
    ]);
  });

  it('a splice at a gain plays every step of it at that gain', () => {
    const a = levels(`${V}&fill &bd &bd:0:.5\n&t step=&bar &fill:0:.5 &bd\n&out map=sample [&t]`);
    expect(a.slice(0, 3).map((e) => e.level)).toEqual([0.5, 0.25, 1]);
  });

  it('is no gain in a mix', () => {
    const r = compileSource(`${V}&t step=&bar 0\n&out map=sample [&t * &bd:0:.5]`);
    expect(r.diagnostics.some((d) => /a hit's gain/.test(d.message))).toBe(true);
  });
});

describe('glide=', () => {
  const notes = (src: string, from = 0, to = 4) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    return eventsBetween(
      plan(r, () => 0),
      from,
      to,
    ).map((e) => ({
      at: +e.at.toFixed(3),
      dur: +e.dur.toFixed(3),
      freq: +e.freq.toFixed(2),
      bends: e.bends.map((b) => [+b.at.toFixed(3), Math.round(b.cents)]),
    }));
  };
  const SRC = (word: string, braid: string) => `&lead ${word} s=saw loop=C4 env=&(map=adsr .01 .2 .6 .1)
&tune step=2 ${braid}
&out map=sample [&tune * &lead]`;

  it('plays a run of tied notes as one: its envelope once, each later note a slide there over the glide', () => {
    expect(notes(SRC('', '0 2 4 ~')).length).toBe(6); // (three notes a lap, two laps in 4 s)
    const run = notes(SRC('glide=.1', '0 2 4 ~'));
    // (held to the next note, then a ramp there in .1 s)
    const bends = (t: number) => [
      [t + 0.5, 0],
      [t + 0.6, 200],
      [t + 1, 200],
      [t + 1.1, 400],
    ];
    expect(run).toEqual([
      { at: 0, dur: 1.5, freq: 261.63, bends: bends(0) },
      { at: 2, dur: 1.5, freq: 261.63, bends: bends(2) },
    ]);
    // (glide=0: each note its own)
    expect(notes(SRC('glide=0', '0 2 4 ~'))).toEqual(notes(SRC('', '0 2 4 ~')));
  });

  it('a rest or a chord ends a run, a hold is part of it, and the run goes on across laps', () => {
    expect(notes(SRC('glide=.1', '0 [0,4] 7 ~')).map((n) => n.at)).toEqual([0, 0.5, 0.5, 1, 2, 2.5, 2.5, 3]);
    expect(notes(SRC('glide=.1', '0@2 5 ~')).map((n) => [n.at, n.dur])).toEqual([
      [0, 1.5],
      [2, 1.5],
    ]);
    // (no rest: the loop is one note, from the piece's start)
    expect(notes(SRC('glide=.1', '0 2'), 0, 2)).toEqual([{ at: 0, dur: 128, freq: 261.63, bends: expect.any(Array) }]);
    // (and starts again after 256 notes: 128 s)
    expect(notes(SRC('glide=.1', '0 2'), 127, 129).map((n) => [n.at, n.dur])).toEqual([[128, 128]]);
  });

  it('is the same played in windows as at once', () => {
    const src = SRC('glide=.1', '0 2 4 ~ 5 7 ~ ~');
    expect([...notes(src, 0, 1.7), ...notes(src, 1.7, 4)]).toEqual(notes(src, 0, 4));
  });

  it('is one way or the other: oneshot or glide=', () => {
    expect(compileSource(SRC('oneshot glide=.1', '0')).diagnostics.some((d) => /oneshot or glide=/.test(d.message))).toBe(true);
  });
});
