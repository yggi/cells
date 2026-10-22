import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { shorten, shortenAll } from '.';
import { SAMENESS_SECONDS, size } from './harness';
import { eventsBetween, plan } from '../realize';
import { codeShifts } from '../program';
import { PRESETS } from '../presets';
import { expand } from '../use';
import type { Resolve } from '../program';
import { resolveSeed } from '../../repository/library';

const tail = '\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
const sounds = (src: string, until = SAMENESS_SECONDS) => {
  const r = compileSource(src);
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
  });
  it('a phrase in two cells: one cell, used in both (when it pays: the new line costs too)', () => {
    const src = '&t step=4 0 4 7 11 14 11 7 4 2 5 9 1' + tail.replace('[&t * &v]', '[&t * &v, &u * &v]') + '\n&u step=4 3 0 4 7 11 14 11 7 4 2 5 9';
    const s = first(src, 'phrase');
    const next = s.apply(src);
    expect(next).toMatch(/&m1 0 4 7 11 14 11 7 4 2 5 9/);
    expect(sounds(next)).toEqual(sounds(src));
    expect(s.saving).toBe(src.length - next.length);
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
  it('fractions of a tap: step=8n held twice is step=4n, and the old spelling is offered as a tap too (#92)', () => {
    const bar = '&bar meter("4/4") step=120bpm\n';
    const held = '4@2 2@2 0@2 5@2';
    for (const [step, want] of [
      ['8n', '&t step=4n 4 2 0 5'],
      ['8t', '&t step=4t 4 2 0 5'],
      ['pulse*2', '&t step=pulse 4 2 0 5'],
      ['beat*4', '&t step=beat*2 4 2 0 5'],
      ['1m/2', '&t step=1m/4 4 2 0 5'],
      ['&bar*2', '&t step=4n 4 2 0 5'],
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
  it('a phrase too short to pay for its own line is left as it is', () => {
    const src = '&t step=4 0 4 7 2 5 9 1 0 4 7 2 5 9' + tail;
    expect(shorten(src).filter((x) => x.kind === 'phrase')).toEqual([]);
  });
  it('… and leaves alone what something else splices in (it would hear the lengths)', () => {
    const src = '&m 4@2 2@2\n&t step=4 &m 0' + tail;
    expect(shorten(src).some((x) => x.kind === 'fraction')).toBe(false);
  });
});

describe('shorten, on every example: every suggestion sounds the same, and is shorter', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    it(
      key,
      () => {
        const suggestions = shorten(p.source);
        const before = sounds(p.source);
        for (const s of suggestions) {
          const next = s.apply(p.source);
          expect(size(next), s.title).toBeLessThan(size(p.source));
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
  it('two cells written exactly alike: one, used by both', () => {
    const src = '&a 0 4 7 11 14 11 7 4\n&b 0 4 7 11 14 11 7 4\n&t step=4 &a 2 &b 5\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const s = shorten(src).find((x) => x.kind === 'same')!;
    const next = s.apply(src);
    expect(next).not.toMatch(/^&b /m);
    expect(next).toContain('&t step=4 &a 2 &a 5');
    expect(sounds(next)).toEqual(sounds(src));
  });
  it('a piece with use: what the piece written out is offered, read through the resolver (#241)', () => {
    const src = 'use "core kit"\n&bar meter("4/4") step=100bpm\n&a &bd ~ &hh ~ &sd ~ &hh &hh\n&b &bd ~ &hh ~ &sd ~ &hh &hh\n&beat step=8n &a &b &a &b\n&out map=sample [&beat]\n';
    const seed = { resolve: resolveSeed };
    expect(shorten(src)).toEqual([]);
    const offered = shorten(src, seed);
    expect(offered.map((s) => [s.id, s.saving])).toEqual(shorten(expand(src, resolveSeed)).map((s) => [s.id, s.saving]));
    expect(offered.map((s) => s.id)).toEqual(['same:a,b']);
    const { source } = shortenAll(src, 60, seed);
    expect(source).toContain('use "core kit"');
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
  for (const [key, p] of Object.entries(PRESETS)) {
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
  it('defaults: loop=SAMPLE_RATE on the sound card, a cycle= that is the table’s own length, pan=.5', () => {
    const src = '&bar step=1 0\n&key step=&bar stride=7 cycle=12\n&t over=&key step=&bar 0 4 7\n&v s=sine loop=C4 pan=.5\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const kinds = shorten(src)
      .filter((x) => x.kind === 'default')
      .map((x) => x.before)
      .sort();
    expect(kinds).toEqual(['cycle=12', 'loop=SAMPLE_RATE', 'pan=.5']);
    expect(sounds(shortenAll(src).source)).toEqual(sounds(src));
    // (a grid's cycle= is its size: not a default to drop)
    expect(shorten('&edo cycle=19 map=edo\n&t over=&edo step=2 0 1' + tail).some((x) => x.before.startsWith('cycle='))).toBe(false);
  });
  it('the measure is the code: the spaces that keep a comment aligned aren’t counted', () => {
    const src = '&bar step=1 0\n&key step=&bar stride=7 cycle=12          # the 12\n&t over=&key step=&bar 0 4 7' + tail;
    const s = shorten(src).find((x) => x.before === 'cycle=12')!;
    expect(s.saving).toBe(9);
    expect(s.apply(src)).toContain('stride=7');
    expect(s.apply(src)).toContain('# the 12');
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
