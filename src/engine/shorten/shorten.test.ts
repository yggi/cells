import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { shorten, shortenAll } from '.';
import { SAMENESS_SECONDS, size } from './harness';
import { eventsBetween, plan } from '../realize';
import { codeShifts } from '../program';
import { PRESETS } from '../presets';

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

describe('a selector of mixes, written before decision 016: the one suggestion is its rewrite at the input', () => {
  const old = `&bar step=120bpm 0 0 0 0
&a step=&bar 0 2 4 5 7
&b step=&bar 12
&partA [&a * &v]
&partB [&b * &w]
&parts &partA &partB
&song over=&parts step=&bar/4 laps=1 0 [0,1] ~ 1
&v s=tri loop=C4
&w s=sine loop=C4
&out loop=SAMPLE_RATE map=sample &song`;
  it('an error that says so, and Shorten rewrites it to the same notes', () => {
    expect(compileSource(old).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/decision 016.*Shorten rewrites it/)]);
    const [s, ...more] = shorten(old);
    expect([s.kind, more]).toEqual(['arrange', []]);
    expect(s.before).toBe('&a step=&bar 0 2 4 5 7');
    const next = s.apply(old);
    expect(next).toMatch(/^&parts step=&bar &partABar &partBBar$/m);
    const r = compileSource(next);
    expect(r.diagnostics).toEqual([]);
    const notes = (x: typeof r) => eventsBetween(plan(x, codeShifts(x)), 0, 10).map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains}`);
    expect(notes(r)).toEqual(notes({ ...compileSource(old), ok: true }));
  });
});
