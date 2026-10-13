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
  it('on a clock nothing plays, what it moves caps it too (a parameter takes a value each of its steps)', () => {
    const r = compileSource('&w loop=free(1, 1..9999999) map=lin 0 1\n&bar step=1\n&mel step=&bar 0 2\n&v s=sine lpf=200..3000 * &w\n&out map=sample [&mel * &v]');
    expect(r.diagnostics.map((d) => ({ severity: d.severity, message: d.message, ...d.span }))).toEqual([
      {
        severity: 'warning',
        message: 'loop=free(…): moved up to 9,999,999, &w would move what it moves more than 2,000 times a second, the most a cell can play: the slider stops at 1,000',
        line: 1,
        col: 9,
        len: 19,
      },
    ]);
    expect(freeList(r)[0].hi).toBe(1000);
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

// ---- the rest of #195 and the language nits of #250: each the diagnostic, its severity and its span
const spans = (src: string) => compileSource(src).diagnostics.map((d) => ({ severity: d.severity, message: d.message, ...d.span }));
const PLAY = '&v s=sine\n&out map=sample [&mel * &v]';

describe('^ and ^$ outside a braid', () => {
  it('after over=, step= or as a line’s name are ignored, and say so at the caret', () => {
    expect(spans(`&k 0 2 4\n&mel step=1 over=&k^1 0 2\n${PLAY}`)).toEqual([
      { severity: 'warning', message: expect.stringMatching(/^&k\^1 after over=: \^ and \^\$ move a cell a braid plays .*the move is ignored/), line: 2, col: 20, len: 2 },
    ]);
    expect(spans(`&bar step=1\n&mel step=&bar^$7 0 2\n${PLAY}`)).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/^&bar\^\$7 in step=/), line: 2, col: 15, len: 3 }),
    ]);
    expect(spans(`&mel^1 step=1 0 2\n${PLAY}`)).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/^&mel\^1 names the line/), line: 1, col: 5 }),
    ]);
  });
  it('in a braid they move it, quietly', () => {
    expect(spans(`&k 0 2 4\n&mel step=1 over=&k &k^1 0\n${PLAY}`)).toEqual([]);
  });
});

describe('a ^ that isn’t one move by a whole number', () => {
  it('two carets say one per reference', () => {
    expect(spans(`&x 0 2\n&mel step=1 &x^1^2\n${PLAY}`)).toEqual([
      { severity: 'error', message: '&x^1^…: one ^ per reference; nest with degree(…): degree(&x^1, n)', line: 2, col: 17, len: 1 },
    ]);
  });
  it('a fraction says a whole number', () => {
    expect(spans(`&x 0 2\n&mel step=1 &x^1.5\n${PLAY}`)).toEqual([
      { severity: 'error', message: '&x^1…: ^ takes a whole number of steps (&x^1, &x^$-12)', line: 2, col: 15, len: 4 },
    ]);
  });
});

describe('a gate', () => {
  const G = '&bar step=1\n&tune step=&bar 0 2\n&k 0 2\n&v s=sine\n';
  it('given over= or step= ignores them, and says so at each', () => {
    expect(spans(G + '&g play=&tune over=&k step=&bar [&v]')).toEqual([
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/^over= on a gate does nothing: .*put it on &tune/), line: 5, col: 20, len: 2 }),
      expect.objectContaining({ severity: 'warning', message: expect.stringMatching(/^step= on a gate does nothing/), line: 5, col: 28, len: 4 }),
    ]);
  });
  it('a negative level warns at it; the old gain= too', () => {
    expect(spans(G + '&g play=&tune level=-.5 [&v]')).toEqual([
      { severity: 'warning', message: "level=-0.5: a level is 0 or more, and a negative one doesn't play softer — write 0.5", line: 5, col: 21, len: 3 },
    ]);
    expect(spans(G + '&g trigger=&tune gain=-.5 &v')[0]).toMatchObject({ severity: 'warning', message: expect.stringMatching(/^gain=-0.5: a level is 0 or more/) });
  });
  it('a receiver that isn’t a cell is an unknown cell, not a product with no voice', () => {
    expect(spans(G + '&g play=&tune [&nope]')).toEqual([{ severity: 'error', message: 'Unknown cell &nope', line: 5, col: 16, len: 5 }]);
    expect(spans(G + '&out map=sample [&tune * &nope]')).toEqual([{ severity: 'error', message: 'Unknown cell &nope', line: 5, col: 26, len: 5 }]);
  });
  it('a gate as a level, or a voice as the notes, says it is a sound, by the port it is on', () => {
    expect(spans(G + '&g play=&tune [&v]\n&h play=&tune level=&g [&v]')).toEqual([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringMatching(/^level=&g: a gate's level= takes a level .* and &g is a sound \(a gate\)/),
        line: 6,
        col: 21,
        len: 2,
      }),
    ]);
    expect(spans(G + '&g play=&tune [&v]\n&h trigger=&tune velocity=&g &v')[0].message).toMatch(/^velocity=&g: a gate's velocity= takes a level/);
    expect(spans(G + '&h play=&v [&v]')[0].message).toMatch(/^play=&v: a gate's play= takes the notes it plays .* and &v is a sound \(a voice\)/);
  });
});

describe('a table of taps nothing selects', () => {
  it('warns at the table: every part plays all the time', () => {
    expect(spans('&bar step=1\n&parts step=&bar &p1 &p2\n&mel step=&p1 0 2\n&m2 step=&p2 4 5\n&v s=sine\n&out map=sample [&mel * &v, &m2 * &v]')).toEqual([
      {
        severity: 'warning',
        message:
          '&parts declares taps (&p1 &p2), and nothing selects them: every part plays all the time. A selector reads the table and switches them, a section per step: &song over=&parts step=&bar/16 0 [0,1]',
        line: 2,
        col: 1,
        len: 6,
      },
    ]);
  });
  it('with a selector, quiet', () => {
    expect(
      spans('&bar step=1\n&parts step=&bar &p1 &p2\n&song over=&parts step=&bar/4 0 1\n&mel step=&p1 0 2\n&m2 step=&p2 4 5\n&v s=sine\n&out map=sample [&mel * &v, &m2 * &v]'),
    ).toEqual([]);
  });
});

describe('a melody of rests only', () => {
  it('a pick from a cell of rests plays nothing, and says so where it is played', () => {
    expect(spans(`&e ~\n&bar step=1\n&mel step=&bar &e[0]\n${PLAY}`)).toEqual([
      { severity: 'warning', message: '&mel plays only rests (~): nothing sounds on &v', line: 5, col: 18, len: 4 },
    ]);
  });
  it('one note among them, or a braid left free for a take, is quiet', () => {
    expect(spans(`&e ~\n&bar step=1\n&mel step=&bar &e[0] 2\n${PLAY}`)).toEqual([]);
    expect(spans(`&bar step=1\n&mel step=&bar free(~ ~)\n${PLAY}`)).toEqual([]);
  });
});

describe('a key by name left free with names of its own', () => {
  it('ignores them, and says so at them', () => {
    const src = `&mel step=1 shift=free(Eb, "x y") 0 2\n${PLAY}`;
    expect(spans(src)).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringMatching(/^free\(Eb, "x y"\): a key by name has the twelve pitch names as its choices, so these names are ignored/),
        line: 1,
        col: 26,
        len: 7,
      }),
    ]);
    expect(freeList(compileSource(src))[0]).toMatchObject({ lo: 0, hi: 11, labels: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] });
  });
});

describe('a MIDI card', () => {
  const M = '&bar step=1\n&mel step=&bar 0 2\n&v s=sine\n';
  it('read as a map’s table says it has no numbers', () => {
    expect(spans(M + '&synth map=midi [&mel * &v]\n&w map=&synth 0 1').filter((d) => d.message.startsWith('map='))).toEqual([
      { severity: 'warning', message: "map=&synth: a map reads a table's numbers, and &synth is a MIDI card, which has none: nothing is mapped", line: 5, col: 8, len: 6 },
    ]);
  });
  it('on one channel, a repeated entry says it sends each note that many times', () => {
    expect(spans(M + '&synth map=midi(3) [&mel * &v]!4096').filter((d) => d.message.startsWith('!'))).toEqual([
      {
        severity: 'warning',
        message: '!4096 on a card with one channel (map=midi(3)): each note goes out 4,096 times on it, at once — leave out the !4096',
        line: 4,
        col: 20,
        len: 16,
      },
    ]);
    expect(spans(M + '&synth map=midi [&mel * &v]!2').filter((d) => d.message.startsWith('!'))).toEqual([]);
  });
  it('as another card’s entry says a card isn’t one', () => {
    expect(spans(M + '&a map=midi [&mel * &v]\n&b map=midi &a').filter((d) => d.severity === 'error')).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/^&a is a MIDI card: a card's entries are what it sends/), line: 5, col: 13, len: 2 }),
    ]);
  });
  it('mixed as a sound says it is a card', () => {
    expect(spans(M + '&synth map=midi [&mel * &v, &synth]').filter((d) => d.severity === 'error')).toEqual([
      expect.objectContaining({
        message: expect.stringMatching(/&synth is a MIDI card: it sends what it names to a device, and is no sound to mix or play$/),
        line: 4,
        col: 29,
        len: 6,
      }),
    ]);
  });
});

describe('a grid too big to build', () => {
  it('cycle= past the cap is an error at its value, before it runs out of memory', () => {
    expect(spans('&e cycle=1000000000 map=edo')).toEqual([
      {
        severity: 'error',
        message: "cycle=1000000000: at most 50,000, the most steps a cell can hold (a grid's to its period, a table's turns before it comes round)",
        line: 1,
        col: 10,
        len: 10,
      },
    ]);
  });
});

describe('free(…) as a braid, and what follows it', () => {
  it('a stray ) says it closes nothing', () => {
    expect(spans(`&bar step=1\n&mel step=&bar free(0 2))\n${PLAY}`)).toEqual([
      { severity: 'error', message: "A ')' with nothing to close: free(0 2) ends at its first ')'", line: 2, col: 25, len: 1 },
    ]);
  });
  it('a modifier after it says it goes inside, and that spelling compiles', () => {
    expect(spans(`&bar step=1\n&mel step=&bar free(0 2)!3\n${PLAY}`)).toEqual([
      { severity: 'error', message: 'free(0 2)!3: a modifier goes on its steps, inside the parentheses: free([0 2]!3)', line: 2, col: 25, len: 2 },
    ]);
    expect(spans(`&bar step=1\n&mel step=&bar free([0 2]!3)\n${PLAY}`)).toEqual([]);
  });
});

describe('the nits of #250', () => {
  it('a generated name never shows: an unnamed cell is &( … )', () => {
    expect(spans('&bar step=1\n&v s=sine\n&mel step=&bar degree(&(0 2), 1000000000)\n&out map=sample [&mel * &v]')[0].message).toMatch(/^degree\(&\( … \), 1000000000\) moves it/);
    expect(spans('&v s=sine\n&mel step=1 &(shift=100000000 0 2)\n&out map=sample [&mel * &v]')[0].message).toMatch(/^shift=100000000 turns an unnamed cell &\( … \) about/);
  });
  it('a negative pick is before the start', () => {
    expect(messages('&bar 0 1 2\n&foo &bar[-4]').filter((m) => m.includes('picks nothing'))).toEqual(['&bar[-4] picks nothing: before the start, &bar has 3 steps']);
  });
  it('the shift= warning points at shift=, not the cell’s name', () => {
    expect(spans(`&mel step=1 shift=100000000 0 2\n${PLAY}`)).toEqual([expect.objectContaining({ severity: 'warning', line: 1, col: 13, len: 15 })]);
  });
  it('rung= says it is tier= now', () => {
    expect(spans('&a title="x" tags="tutorial" rung=3\n&v s=sine loop=A4')).toEqual([
      { severity: 'error', message: 'rung= is now tier= (decision 020): the tutorial is in tiers, tier=1 to tier=9', line: 1, col: 30, len: 4 },
    ]);
  });
  it('fifths(n) past a lap says it climbs, and how fifths(note) differs', () => {
    expect(spans('&k fifths(13)\n&bar step=1\n&m over=&k step=&bar 0 1 2\n&v s=sine\n&out map=sample [&m * &v]')).toEqual([
      {
        severity: 'warning',
        message: 'fifths(13): the circle comes round after 12, and a turn past a lap climbs one, as every shift does: fifths(1) up 1 octave (fifths(G) names the note, no octave)',
        line: 1,
        col: 11,
        len: 2,
      },
    ]);
  });
});
