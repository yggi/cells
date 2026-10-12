// The silent and unhelpful cases of the diagnostics sweep (#195): each says what is wrong, where.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { freeList } from '../held';

const BASE = '&bar step=1\n&mel step=&bar 0 2\n&v s=sine\n';
const diags = (src: string) => compileSource(src).diagnostics.map((d) => ({ severity: d.severity, message: d.message, line: d.span.line, col: d.span.col }));
const messages = (src: string) => diags(src).map((d) => d.message);

describe('pan=', () => {
  it('on a mix or the sound card does nothing, and says so', () => {
    expect(messages(BASE + '&m pan=.2 [&mel * &v]\n&out map=sample &m')).toEqual([expect.stringMatching(/pan= places a voice: on the mix &m it does nothing/)]);
    expect(messages(BASE + '&out pan=.9 map=sample [&mel * &v]')).toEqual([expect.stringMatching(/pan= places a voice: on the sound card it does nothing/)]);
  });
  it('out of range is clamped, and says which side it plays', () => {
    expect(messages('&bar step=1\n&mel step=&bar 0 2\n&v s=sine pan=3\n&out map=sample [&mel * &v]')).toEqual([expect.stringMatching(/pan=3: .*hard right/)]);
    expect(messages('&bar step=1\n&mel step=&bar 0 2\n&v s=sine pan=-1\n&out map=sample [&mel * &v]')).toEqual([expect.stringMatching(/pan=-1: .*hard left/)]);
  });
  it('on a voice, in range, is quiet', () => {
    expect(messages('&bar step=1\n&mel step=&bar 0 2\n&v s=sine pan=.2\n&out map=sample [&mel * &v]')).toEqual([]);
  });
});

describe('show=mix:&grid', () => {
  it('on a cell that is no mix is a warning on the attribute', () => {
    const d = diags('&e cycle=19 map=edo\n' + BASE + '&w s=sine show=mix:&e\n&out map=sample [&mel * &v, &mel * &w]');
    expect(d).toEqual([expect.objectContaining({ severity: 'warning', line: 5, col: 16, message: expect.stringMatching(/does nothing on &w: .*isn't a mix/) })]);
  });
  it('names a missing cell at the attribute, not the whole line', () => {
    const d = diags(BASE + '&m show=mix:&nope map=sample [&mel * &v]');
    expect(d).toEqual([expect.objectContaining({ message: 'Unknown cell &nope', line: 4, col: 9 })]);
  });
  it('an empty one, or one with a space, says what it takes', () => {
    for (const bad of ['show=mix:', 'show=mix: &e'])
      expect(messages(BASE + `&e cycle=19 map=edo\n&m ${bad} map=sample [&mel * &v]`)).toEqual([expect.stringMatching(/show=mix:&grid: the grid .*no space after the colon/)]);
  });
});

describe('plugins', () => {
  const block = '=== plugin ring ===\n{ "fits": ["meter"] }\nfunction draw() { return []; }\n=== end ===';
  it('a plugin the piece carries but no cell shows is a warning on its block', () => {
    expect(diags(BASE + '&out map=sample [&mel * &v]\n' + block)).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/carries the plugin "ring", but no cell says show=ring/), line: 5 }),
    ]);
  });
  it('one a cell shows is quiet', () => {
    expect(messages('&bar scan(1 1) step=1 show=ring\n&mel step=&bar 0 2\n&v s=sine\n&out map=sample [&mel * &v]\n' + block)).toEqual([]);
  });
});

describe('a degree or a shift that leaves hearing', () => {
  it('degree(&m, 1000000000) says its notes are dropped', () => {
    const d = diags('&bar step=1\n&m step=&bar 0 2\n&t step=&bar degree(&m, 1000000000)\n&v s=sine\n&out map=sample [&t * &v]');
    expect(d).toEqual([
      expect.objectContaining({
        severity: 'warning',
        line: 3,
        message: expect.stringMatching(/degree\(&m, 1000000000\) moves it 1,000,000,000 steps, over a hundred octaves: .*above 20 kHz/),
      }),
    ]);
  });
  it('a large grid has more steps to an octave: 1500 steps of a 1200 step grid is quiet', () => {
    expect(messages('&e cycle=1200 map=edo\n&bar step=1\n&m step=&bar 0 2\n&t over=&e step=&bar degree(&m, 1500)\n&v s=sine\n&out map=sample [&t * &v]')).toEqual([]);
  });
  it('an ordinary degree is quiet', () => {
    expect(messages('&bar step=1\n&m step=&bar 0 2\n&t step=&bar degree(&m, -7)\n&v s=sine\n&out map=sample [&t * &v]')).toEqual([]);
  });
  it('a huge shift= warns, at the attribute; a small one is quiet', () => {
    expect(diags('&mel step=1 shift=100000000 0 2\n&v s=sine\n&out map=sample [&mel * &v]')).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/shift=100000000 turns &mel about 50,000,000 laps/) }),
    ]);
    expect(messages('&mel step=1 shift=5 0 2 4\n&v s=sine\n&out map=sample [&mel * &v]')).toEqual([]);
  });
});

describe('degree( n )', () => {
  it('takes a sign and spaces, as the spaces round the whole are free', () => {
    for (const n of ['+1', '- 1', ' -1 ', '1'])
      expect(messages(`&bar step=1\n&m step=&bar 0 2\n&t step=&bar degree( &m , ${n} )\n&v s=sine\n&out map=sample [&t * &v]`), n).toEqual([]);
  });
  it('wants a whole number, and says so', () => {
    expect(messages('&bar step=1\n&m step=&bar 0 2\n&t step=&bar degree(&m, 1.5)\n&v s=sine\n&out map=sample [&t * &v]')).toEqual([expect.stringMatching(/a whole number/)]);
  });
});

describe('a mix with something else between its terms', () => {
  it('a choice of cells says a choice is for numbers', () => {
    expect(messages('&a s=sine\n&b s=sine\n&g [&a|&b]')[0]).toMatch(/a choice \[a\|b\] picks between numbers in a braid/);
  });
  it('cells side by side in a term say a mix lists its terms with commas', () => {
    expect(messages('&a s=sine\n&b s=sine\n&c s=sine\n&g [&a * &b &c]')[0]).toMatch(/a mix lists its terms with commas/);
  });
});

describe('a groove with a number or a pick of a voice', () => {
  it('says a groove holds voices only', () => {
    for (const g of ['&bd 0 &hh', '&bd[0] &hh', '&bd^2 &hh'])
      expect(messages(`&bar step=1\n&mel step=&bar 0 2\n&bd s=sine\n&hh s=sine\n&g step=&bar ${g}\n&out map=sample [&mel * &g]`).join(' '), g).toMatch(
        /&g mixes voices with numbers or picks: a groove holds only voices/,
      );
  });
});

describe('a pick that takes nothing', () => {
  it('says why', () => {
    const says = (pick: string) => messages(`&bar 0 1 2\n&foo &bar${pick}`).filter((m) => m.includes('picks nothing'));
    expect(says('[5]')).toEqual(['&bar[5] picks nothing: past the end, &bar has 3 steps']);
    expect(says('[3:]')[0]).toMatch(/picks nothing: it starts past the end/);
    expect(says('[2:1]')[0]).toMatch(/picks nothing: it ends before it starts/);
  });
});

describe('a rate left free(…)', () => {
  const src = (hi: number) => `&bar scan(1 1 1 1) step=free(100bpm, 60..${hi})\n&mel step=&bar 0 2 4 7\n&v s=sine\n&out map=sample [&mel * &v]`;
  it('has a slider that stops where the cap does, with a warning', () => {
    const r = compileSource(src(9_999_999));
    expect(r.diagnostics.map((d) => d.message)).toEqual([
      expect.stringMatching(/moved up to 9,999,999, a cell &bar clocks would start more than 2,000 notes a second.*the slider stops at/),
    ]);
    const hi = freeList(r)[0].hi;
    expect(hi).toBeLessThan(9_999_999);
    expect(hi).toBeGreaterThan(100);
  });
  it('is quiet where the slider is within it', () => {
    const r = compileSource(src(240));
    expect(r.diagnostics).toEqual([]);
    expect(freeList(r)[0].hi).toBe(240);
  });
});

describe('a gate given a number', () => {
  it('says what trigger=, velocity= and gate= want', () => {
    expect(messages('&g trigger=3 &v')[0]).toMatch(/Expected the melody .* trigger=&tune/);
    expect(messages('&g velocity=.5 &v')[0]).toMatch(/Expected a level cell, like velocity=&accent/);
    expect(messages('&g gate=3 &v')[0]).toMatch(/Expected a level cell, like gate=&duck/);
  });
});
