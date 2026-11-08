import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { shorten, shortenAll } from '.';
import { SAMENESS_SECONDS, size, structure } from './harness';
import { eventsBetween, plan } from '../realize';
import { codeShifts } from '../program';
import { EXAMPLES } from '../examples';
import { expand } from '../use';
import type { Resolve } from '../program';
import { resolveSeed } from '../../repository/library';
import { soundsIdentical } from '../sameness';

const tail = '\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
const sounds = (src: string, until = SAMENESS_SECONDS) => {
  const r = compileSource(src, undefined, { resolve: resolveSeed, old: true });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, until)
    .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(4)).join(',')}`)
    .sort();
};
const first = (src: string, kind: string) => shorten(src).find((s) => s.kind === kind)!;

describe('shorten', () => {
  it('runs: the same step again and again, counted', () => {
    const src = '&t step=4 0 0 0 0 4 7 7 7' + tail;
    const s = first(src, 'run');
    expect(s.apply(src)).toContain('&t step=4 0!4 4 7!3');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
    // (an elongation is the step before it held, no step of its own: `0 _ _` has no run, and `_!2` is no form)
    expect(shorten('&t step=4 0 _ _ 4' + tail).some((x) => x.kind === 'run')).toBe(false);
  });
  it('a phrase in two cells: one cell, used in both (when it pays: the new line costs too)', () => {
    const src = '&t step=4 0 4 7 11 14 11 7 4 2 5 9 1' + tail.replace('[&t * &v]', '[&t * &v, &u * &v]') + '\n&u step=4 3 0 4 7 11 14 11 7 4 2 5 9';
    const s = first(src, 'phrase');
    const next = s.apply(src);
    expect(next).toMatch(/&m1 0 4 7 11 14 11 7 4 2 5 9/);
    expect(sounds(next)).toEqual(sounds(src));
    // (the saving is the structure saved, decision 049's measure: 11 leaves twice, now once, a cell and two uses, #157)
    expect(s.saving).toBe(structure(src) - structure(next));
    expect(s.saving).toBe(11 * 2 - (11 + 1 + 2));
  });
  it('a phrase backwards: &m[::-1]', () => {
    const src = '&t step=4 0 4 7 11 14 17 21 24 28 31 35 38 1 38 35 31 28 24 21 17 14 11 7 4 0' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('backwards'))!;
    expect(s.apply(src)).toContain('[::-1]');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('transposed, where the numbers are steps of a grid: &m^$7', () => {
    const src = '&t step=4 0 4 7 11 14 17 21 17 14 11 7 4 7 11 14 18 21 24 28 24 21 18 14 11' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('transposed'))!;
    expect(s.apply(src)).toMatch(/\^\$-?7/); // (either one, transposed to the other)
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('… and through a scale, by degrees: &m^k, not ^$k (#10, #179)', () => {
    const src = '&major scan(2 2 1 2 2 2 1)\n&t over=&major step=4 0 2 4 5 7 9 7 5 4 2 0 -1 0 2 9 2 4 6 7 9 11 9 7 6 4 2 1 2 4 8 -1 1 3 4 6 8 6 4 3 1 -1 -2 -1 1' + tail;
    expect(shorten(src).some((x) => x.title.includes('transposed'))).toBe(false);
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('degrees'))!;
    expect(s.apply(src)).toMatch(/&m1?\^-?[123](?![0-9])/);
    expect(s.apply(src)).not.toMatch(/\^\$/);
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('a motif without over= read through its player’s scale is moved by degrees, not grid steps', () => {
    const src =
      '&major scan(2 2 1 2 2 2 1)\n&a 0 2 4 5 7 9 7 5 4 2 0 -1 0 2\n&b 1 3 5 6 8 10 8 6 5 3 1 0 1 3\n&c 3 5 7 8 10 12 10 8 7 5 3 2 3 5\n&t over=&major step=4 &a &b &c' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase')!;
    expect(s.apply(src)).not.toMatch(/\^\$/);
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('fractions: every step held twice — divide by 2, step twice as slow', () => {
    const src = '&bar step=120bpm 0 0 0 0\n&t step=&bar*2 4@2 2@2 0@4 ~@2' + tail;
    const s = first(src, 'fraction');
    const next = s.apply(src);
    expect(next).toContain('&t step=&bar 4 2 0@2 ~');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('fractions of a tap: step=8n held twice is step=4n (#92; the old spelling, step=&bar*2, is an error that Migrate rewrites, #15 rung 5)', () => {
    const bar = '&bar meter("4/4") step=120bpm\n';
    const held = '4@2 2@2 0@2 5@2';
    for (const [step, want] of [
      ['8n', '&t step=4n 4 2 0 5'],
      ['8t', '&t step=4t 4 2 0 5'],
      ['pulse*2', '&t step=pulse 4 2 0 5'],
      ['beat*4', '&t step=beat*2 4 2 0 5'],
      ['1m/2', '&t step=1m/4 4 2 0 5'],
    ] as const) {
      const src = `${bar}&t step=${step} ${held}${tail}`;
      const next = first(src, 'fraction').apply(src);
      expect(next, step).toContain(want);
      expect(sounds(next), step).toEqual(sounds(src));
    }
    // (a tap that can't be slowed whole offers nothing: 1m held twice is 1m/2, but pulse*3 held twice is not a whole tap)
    expect(shorten(`${bar}&t step=pulse*3 ${held}${tail}`).some((x) => x.kind === 'fraction')).toBe(false);
  });
  it('subsequences: a run of them counted, a fraction divided outside them only (decision 027)', () => {
    const run = '&t step=4 [0 2] [0 2] [0 2] 4' + tail;
    expect(first(run, 'run').apply(run)).toContain('&t step=4 [0 2]!3 4');
    expect(sounds(first(run, 'run').apply(run))).toEqual(sounds(run));
    const src = '&bar step=120bpm 0 0 0 0\n&t step=&bar*2 [4@2 2@2]@2 2@2 0@4' + tail;
    const next = first(src, 'fraction').apply(src);
    expect(next).toContain('&t step=&bar [4@2 2@2] 2 0@2');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('a phrase pays for its own cell by structure (#157): four steps written twice save one, three are too few to name', () => {
    const src = '&t step=4 0 4 7 2 1 0 4 7 2' + tail;
    expect(first(src, 'phrase').saving).toBe(1);
    expect(shorten('&t step=4 0 4 7 1 0 4 7' + tail).filter((x) => x.kind === 'phrase')).toEqual([]);
  });
  it('… and leaves alone what something else splices in (it would hear the lengths)', () => {
    const src = '&m 4@2 2@2\n&t step=4 &m 0' + tail;
    expect(shorten(src).some((x) => x.kind === 'fraction')).toBe(false);
  });
});

describe('shorten, on every example: every suggestion sounds the same, and saves structure (a respelling: characters)', () => {
  for (const [key, p] of Object.entries(EXAMPLES)) {
    it(
      key,
      () => {
        const suggestions = shorten(p.source, { resolve: resolveSeed, old: true });
        const before = sounds(p.source);
        for (const s of suggestions) {
          const next = s.apply(p.source);
          if (s.saving > 0) expect(structure(p.source) - structure(next), s.title).toBe(s.saving);
          else expect(size(next), s.title).toBeLessThan(size(p.source));
          expect(sounds(next), `${key}: ${s.title}`).toEqual(before);
        }
      },
      60_000,
    );
  }
});

describe('shorten: turns, alike cells, and all the way', () => {
  it('a phrase turned round its helix: &m[>>k] (the steps that wrap climb a lap)', () => {
    // a phrase, then the same begun two on: the 0 and the 4 come round an octave up
    const src = '&t step=4 0 4 7 9 11 14 16 19 2 7 9 11 14 16 19 12 16 5 0 4 7 9 11 14 16 19' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('turned'))!;
    expect(s).toBeTruthy();
    expect(s.apply(src)).toContain('[>>2]');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('a phrase written once and turned once: &m[>>2] (#375 review)', () => {
    const src = '&t step=4 0 2 4 5 7 9 11 14 16 17 19 21 3 4 5 7 9 11 14 16 17 19 21 12 14' + tail;
    const s = shorten(src).find((x) => x.kind === 'phrase' && x.title.includes('turned'))!;
    expect(s).toBeTruthy();
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('two cells written exactly alike: one, used by both', () => {
    const src = '&a 0 4 7 11 14 11 7 4\n&b 0 4 7 11 14 11 7 4\n&t step=4 &a 2 &b 5\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const s = shorten(src).find((x) => x.kind === 'same')!;
    const next = s.apply(src);
    expect(next).not.toMatch(/^&b /m);
    expect(next).toContain('&t step=4 &a 2 &a 5');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('two voices written alike: one where a MIDI export is the same too, as two FM operators; two parts stay apart (#192, decision 057)', () => {
    // (two operators alike, routed nowhere: merged, the piece sounds and exports as it did)
    const fm =
      '&bar step=2 0\n&t step=&bar 0 4 7\n&m1 s=sine ratio=1\n&m2 s=sine ratio=1\n&a s=sine loop=C3 fm=&m1 index=1\n&b s=sine loop=C4 fm=&m2 index=1\n&out map=sample [&t * &a * .2, &t * &b * .2]';
    const s = shorten(fm).find((x) => x.kind === 'same')!;
    expect(s.id).toBe('same:m1,m2');
    expect(s.apply(fm)).toContain('&b s=sine loop=C4 fm=&m1 index=1');
    expect(soundsIdentical(fm, s.apply(fm))).toBe(true);
    // (two parts on voices alike: one sound, S1, but a MIDI export has them on two channels, so they stay apart)
    const parts = '&bar step=2 0\n&t step=&bar 0 4 7\n&u step=&bar 2 5\n&a s=saw loop=C3 lpf=900\n&b s=saw loop=C3 lpf=900\n&out map=sample [&t * &a * .2, &u * &b * .2]';
    expect(soundsIdentical(parts, parts.replace('&u * &b', '&u * &a'))).toBe(true);
    expect(shorten(parts).filter((x) => x.kind === 'same')).toEqual([]);
    // (a kit's members on a MIDI card: two white noises alike, but &bd sends 36 and &hh 42)
    const kit = '&bar meter("4/4") step=120bpm\n&kit &bd &hh\n&t over=&kit step=8n 0 1 0 1\n&drums map=midi(10) [&t]\n&bd s=white\n&hh s=white';
    expect(shorten(kit).filter((x) => x.kind === 'same')).toEqual([]);
  });
  it('a piece with use: what the piece written out is offered, read through the resolver (#241)', () => {
    const src = 'use "gm_kit"\n&bar meter("4/4") step=100bpm\n&a &bd ~ &hh ~ &sd ~ &hh &hh\n&b &bd ~ &hh ~ &sd ~ &hh &hh\n&beat step=8n &a &b &a &b\n&out map=sample [&beat]\n';
    const seed = { resolve: resolveSeed, old: true };
    expect(shorten(src)).toEqual([]);
    const offered = shorten(src, seed);
    expect(offered.map((s) => [s.id, s.saving])).toEqual(shorten(expand(src, resolveSeed)).map((s) => [s.id, s.saving]));
    expect(offered.map((s) => s.id)).toEqual(['same:a,b']);
    const { source } = shortenAll(src, 60, seed);
    expect(source).toContain('use "gm_kit"');
    expect(source).toContain('&beat step=8n &a &a &a &a');
    expect(compileSource(source, undefined, seed).ok).toBe(true);
  });
  it('a piece with use: no rewrite of a used line, which written out would be offered (#241)', () => {
    const resolve: Resolve = (id) => (id === 'kit' ? '&bd s=sine loop=A1 pan=.5\n&hh s=white hpf=8000' : null);
    const src = 'use "kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &bd &bd &hh ~\n&out map=sample [&beat]\n';
    const out = expand(src, resolve);
    expect(shorten(out).map((s) => s.id)).toContain('default:bd:pan');
    expect(shorten(src, { resolve })).toEqual([]);
  });
  it('all the way: again and again until nothing more pays — and still the same sound', () => {
    const src = '&t step=4 0 0 0 0 4 7 11 14 11 7 4 1 4 7 11 14 11 7 4 2 4 7 11 14 11 7 4' + tail;
    const { source, steps } = shortenAll(src);
    expect(steps.length).toBeGreaterThan(1);
    expect(source.length).toBeLessThan(src.length);
    expect(sounds(source)).toEqual(sounds(src));
  });
});

describe('shorten all the way, on every example: it sounds the same, and is done (#10: idempotence)', () => {
  for (const [key, p] of Object.entries(EXAMPLES)) {
    it(
      key,
      () => {
        const { source } = shortenAll(p.source);
        expect(shorten(source).map((s) => s.title)).toEqual([]);
        expect(shortenAll(source).source).toBe(source);
        if (source !== p.source) expect(sounds(source)).toEqual(sounds(p.source));
      },
      60_000,
    );
  }
});

describe('shorten: a cell base= copies keeps its steps (#177)', () => {
  it("no phrase is cut out of a base or a copy: a copy counts its base's steps (=!n)", () => {
    const src = '&s 0 1 2 3 4 5 6 0 1 2 3 4 5 6 0 1 2 3 4 5 6 9\n&c base=&s^$5 =!4 4\n&t step=4 &s &c' + tail;
    expect(shorten(src).filter((s) => s.kind === 'phrase')).toEqual([]);
    // (the same braid with no copy: the phrase is found)
    expect(shorten('&s 0 1 2 3 4 5 6 0 1 2 3 4 5 6 0 1 2 3 4 5 6 9\n&t step=4 &s &s^$5' + tail).filter((s) => s.kind === 'phrase')).not.toEqual([]);
  });
});

describe('shorten: whole lines (#10)', () => {
  it('a cell that only reads a motif through a shifted table: &motif^k where it is used', () => {
    const src = '&scale over=scale(0,5)\n&down 3 3 2 2 1 1 0@2\n&mid over=&scale[>>] &down\n&t over=&scale step=4 &down &mid &mid' + tail;
    const s = shorten(src).find((x) => x.kind === 'degree')!;
    const next = s.apply(src);
    expect(next).not.toMatch(/^&mid/m);
    expect(next).toContain('&t over=&scale step=4 &down &down^1 &down^1');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('… written in place, &(over=&major[>>] &hook), too', () => {
    const src = '&major scan(2 2 1 2 2 2 1)\n&hook 4 4 5 4\n&t over=&major step=4 &hook 2 &(over=&major[>>] &hook) 0' + tail;
    const s = shorten(src).find((x) => x.kind === 'degree')!;
    expect(s.apply(src)).toContain('&hook 2 &hook^1 0');
    expect(sounds(s.apply(src))).toEqual(sounds(src));
  });
  it('… but not one with a label (it says something), nor one read by a cell on another table', () => {
    const labelled = '&scale over=scale(0,5)\n&down 3 2 1 0\n&mid label="up a step" over=&scale[>>] &down\n&t over=&scale step=4 &down &mid' + tail;
    expect(shorten(labelled).some((x) => x.kind === 'degree')).toBe(false);
    const elsewhere = '&scale over=scale(0,5)\n&down 3 2 1 0\n&mid over=&scale[>>] &down\n&t step=4 &down &mid' + tail;
    expect(shorten(elsewhere).some((x) => x.kind === 'degree')).toBe(false);
  });
  it('a transposing progression written loop=&bar/N is step=&bar/(N/k), then its runs count', () => {
    const src =
      '&bar step=120bpm 0 0 0 0\n&changes loop=&bar/32 0 0 0 0 5 5 0 0\n&walk step=&bar 0 4 7 10\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [(&walk + &changes) * &v]';
    const s = shorten(src).find((x) => x.kind === 'progression')!;
    expect(s.apply(src)).toContain('&changes step=&bar/4 0 0 0 0 5 5 0 0');
    expect(sounds(s.apply(src), 40)).toEqual(sounds(src, 40));
    expect(shortenAll(src).source).toContain('0!4 5!2 0!2');
  });
  it('defaults: loop=SAMPLE_RATE on the sound card, a turning table’s cycle=1 (one lap, #75), pan=.5', () => {
    const src = '&bar step=1 0\n&key step=&bar stride=7 cycle=1\n&t over=&key step=&bar 0 4 7\n&v s=sine loop=C4 pan=.5\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const kinds = shorten(src)
      .filter((x) => x.kind === 'default')
      .map((x) => x.before)
      .sort();
    expect(kinds).toEqual(['cycle=1', 'loop=SAMPLE_RATE', 'pan=.5']);
    expect(sounds(shortenAll(src).source)).toEqual(sounds(src));
    // (a grid's cycle= is its size: not a default to drop)
    expect(shorten('&edo cycle=19 map=edo\n&t over=&edo step=2 0 1' + tail).some((x) => x.before.startsWith('cycle='))).toBe(false);
  });
  it('the measure is the structure (#157): an attribute value dropped saves one, its comment and spacing free', () => {
    const src = '&bar step=1 0\n&key step=&bar stride=7 cycle=1          # one lap\n&t over=&key step=&bar 0 4 7' + tail;
    const s = shorten(src).find((x) => x.before === 'cycle=1')!;
    expect(s.saving).toBe(1);
    expect(s.apply(src)).toContain('stride=7');
    expect(s.apply(src)).toContain('# one lap');
  });
});

describe('shorten: stereo twins → one chord and pan= (#10, decision 007)', () => {
  const head = '&t step=2 0 4 7\n&a s=sine loop=C4\n&b s=tri loop=C3\n';
  it('two chords with the same sounds at different gains: one chord, each voice panned', () => {
    const src = head + '&out loop=SAMPLE_RATE map=sample [&t * &a * .2, &t * &b * .4] [\n  &t * &a * .1, &t * &b * .1]';
    const s = shorten(src).find((x) => x.kind === 'pan')!;
    const next = s.apply(src);
    expect(next).toContain('&out loop=SAMPLE_RATE map=sample [&t * &a * .2, &t * &b * .4]');
    expect(next).toMatch(/&a pan=\.25 /);
    expect(next).toMatch(/&b pan=\.125 /);
    expect(sounds(next.replace(/&t step=2 0 4 7/, '&t step=4 0 4 7'))).toEqual(sounds(src.replace(/&t step=2 0 4 7/, '&t step=4 0 4 7')));
  });
  it('not when a pan would be inexact, the sounds differ, or a voice plays in another mix too', () => {
    const none = (out: string) => expect(shorten(head + out).some((x) => x.kind === 'pan')).toBe(false);
    none('&out loop=SAMPLE_RATE map=sample [&t * &a * .22] [&t * &a * .16]');
    none('&out loop=SAMPLE_RATE map=sample [&t * &a * .2] [&t * &b * .1]');
    none('&m [&t * &a]\n&out loop=SAMPLE_RATE map=sample [&t * &a * .2, &m] [&t * &a * .1, &m]');
  });
});

// #477: a rewrite Shorten offered that didn't sound as the text did, found by #441's probe.
describe('Shorten offers only what sounds the same (#477)', () => {
  const sounds = (src: string) => {
    for (const s of shorten(src)) expect([s.title, soundsIdentical(src, s.apply(src))]).toEqual([s.title, true]);
  };
  it('no run or phrase in a cell a pick or a rotation reads by its units: x!n and a splice are one unit each', () => {
    const rotated = '&a 0@2 1@2\n&b 2@2 3@2\n&j step=8 &a &a &b &b\n&v s=sine loop=C4\n&out map=sample [&j * &v, &j[<<] * &v]';
    expect(shorten(rotated).filter((s) => s.kind === 'run')).toEqual([]);
    sounds(rotated);
    for (const read of ['&j[<<3]', '&j[2:5]']) {
      const src = `&j step=8 0 4 7 11 2 0 4 7 11 5 9\n&v s=sine loop=C4\n&out map=sample [${read} * &v]`;
      expect(shorten(src).filter((s) => s.kind === 'phrase')).toEqual([]);
    }
    // (the same line read whole is still offered its phrase)
    expect(shorten('&j step=8 0 4 7 11 2 0 4 7 11 5 9\n&v s=sine loop=C4\n&out map=sample [&j * &v]').some((s) => s.kind === 'phrase')).toBe(true);
  });
  it('two alike cells that are two channels’ entries merge: one note in both channels is that note in each (decision 070), and S1 checks it', () => {
    const src = '&t step=2 0 4\n&v s=sine loop=C4\n&a map=amp step=2 1 .5\n&b map=amp step=2 1 .5\n&out map=sample [&t * &a * &v * .25] [&t * &b * &v * .25]';
    expect(shorten(src).filter((s) => s.kind === 'same')).toHaveLength(1);
    sounds(src);
  });
  it('shortenAll takes only steps that sound as the text did', () => {
    const src = '&a 0@2 1@2\n&b 2@2 3@2\n&j step=8 &a &a &b &b 0 4 7 0 4 7\n&v s=sine loop=C4\n&out map=sample [&j * &v, &j[<<] * &v]';
    expect(soundsIdentical(src, shortenAll(src).source)).toBe(true);
  });
});
