import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { flatten } from './flatten';
import { eventsBetween, plan } from './realize';
import { pieceTime } from './duration';
import { parse } from './parser';
import { cellView } from '../layout/cellview';

// Strudel's other step forms (#337, decision 027: a spelling shared with Strudel's mini-notation keeps its meaning):
// <a b c> one per lap, x/n slowed, x(k,n,r) a euclid on a step, [a b|c] a choice of sequences. A lap of the cell is
// Strudel's cycle.

type R = ReturnType<typeof compileSource>;
const clean = (src: string): R => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};
const err = (src: string) => parse(src).diagnostics.find((d) => d.severity === 'error')?.message ?? '';
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** A braid played a step a second, lap by lap: each lap's notes as [onset in the lap, length, semitones from C4]. */
const laps = (body: string, n: number, extra = '') => {
  const r = clean(`${extra}&t step=1 ${body}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`);
  const p = plan(r, codeShifts(r));
  const steps = r.cells.get('t')!.steps;
  return Array.from({ length: n }, (_, k) =>
    eventsBetween(p, k * steps, (k + 1) * steps)
      .map((e) => [r6(e.at - k * steps), r6(e.dur), Math.round(12 * Math.log2(e.freq / 261.6256)) + 0])
      .sort((a, b) => a[0] - b[0] || a[2] - b[2]),
  );
};
/** The same, the notes alone, a lap a string. */
const notes = (body: string, n: number, extra = '') => laps(body, n, extra).map((l) => l.map((x) => x[2]).join(' '));
const third = r6(1 / 3);

describe('<a b c>: one step a lap, as Strudel’s <…>', () => {
  it('plays its steps in turn, one each lap of the cell', () => {
    expect(notes('<0 2 4>', 4)).toEqual(['0', '2', '4', '0']);
    expect(notes('0 <2 4> 5', 3)).toEqual(['0 2 5', '0 4 5', '0 2 5']);
    expect(laps('0 <2 4>', 2)).toEqual([
      [
        [0, 1, 0],
        [1, 1, 2],
      ],
      [
        [0, 1, 0],
        [1, 1, 4],
      ],
    ]);
  });

  it('nests with brackets and with itself: <0 [2 4]>, [0 <2 4>], <0 <2 4>>', () => {
    expect(laps('<0 [2 4]>', 2)).toEqual([
      [[0, 1, 0]],
      [
        [0, 0.5, 2],
        [0.5, 0.5, 4],
      ],
    ]);
    expect(laps('[0 <2 4>]', 2)).toEqual([
      [
        [0, 0.5, 0],
        [0.5, 0.5, 2],
      ],
      [
        [0, 0.5, 0],
        [0.5, 0.5, 4],
      ],
    ]);
    // (Strudel: the inner one turns only when it is played: 0 2 0 4)
    expect(notes('<0 <2 4>>', 5)).toEqual(['0', '2', '0', '4', '0']);
    expect(notes('<[0 <2 4>] 7>', 4)).toEqual(['0 2', '7', '0 4', '7']);
  });

  it('modifiers on it: !n copies see the same lap, @n holds it, *n plays n laps of it in one', () => {
    expect(notes('<0 2>!2 9', 2)).toEqual(['0 0 9', '2 2 9']);
    expect(laps('<0 2>@2 9', 2)).toEqual([
      [
        [0, 2, 0],
        [2, 1, 9],
      ],
      [
        [0, 2, 2],
        [2, 1, 9],
      ],
    ]);
    expect(laps('<0 2>*2', 2)).toEqual([
      [
        [0, 0.5, 0],
        [0.5, 0.5, 2],
      ],
      [
        [0, 0.5, 0],
        [0.5, 0.5, 2],
      ],
    ]);
    // (Strudel's <0 2 4>*2: cycles 0 and 1 in the first, 2 and 3 in the next)
    expect(notes('<0 2 4>*2', 3)).toEqual(['0 2', '4 0', '2 4']);
  });

  it('modifiers inside: a step held @n (or _) lasts n laps, as [0@2 2]/3 does in Strudel', () => {
    expect(laps('<0@2 2>', 3)).toEqual([[[0, 2, 0]], [], [[0, 1, 2]]]);
    expect(laps('<0 _ 2>', 3)).toEqual(laps('<0@2 2>', 3));
    expect(notes('<0!2 2>', 3)).toEqual(['0', '0', '2']);
    expect(laps('<0*2 2>', 2)).toEqual([
      [
        [0, 0.5, 0],
        [0.5, 0.5, 0],
      ],
      [[0, 1, 2]],
    ]);
  });

  it('commas stack alternations, each turning by its own length', () => {
    expect(notes('<0 2, 4 5 7>', 4)).toEqual(['0 4', '2 5', '0 7', '2 4']);
  });

  it('a cell spliced in turns with the lap of the cell that plays it, through what holds it', () => {
    const a = '&a <0 2>\n';
    expect(notes('&a 9', 2, a)).toEqual(['0 9', '2 9']);
    // (in an alternation, a splice turns only when it is played, as a nested <…> does)
    expect(notes('<&a 9>', 4, a)).toEqual(['0', '9', '2', '9']);
    // (ratcheted: two of its laps in one)
    expect(notes('&a*2', 1, a)).toEqual(['0 2']);
  });
});

describe('x/n: slowed over n laps, as Strudel’s /', () => {
  it('a subsequence plays its part of itself n times slower: [0 2]/2 is 0, then 2', () => {
    expect(laps('[0 2]/2 9', 2)).toEqual([
      [
        [0, 1, 0],
        [1, 1, 9],
      ],
      [
        [0, 1, 2],
        [1, 1, 9],
      ],
    ]);
    expect(laps('[0 2 4]/2', 2)).toEqual([
      [
        [0, r6(2 / 3), 0],
        [r6(2 / 3), r6(2 / 3), 2],
      ],
      [[third, r6(2 / 3), 4]],
    ]);
  });

  it('a lone step sounds every n laps, held as long as Strudel holds it: n steps', () => {
    expect(laps('[0]/2 9', 3)).toEqual([
      [
        [0, 2, 0],
        [1, 1, 9],
      ],
      [[1, 1, 9]],
      [
        [0, 2, 0],
        [1, 1, 9],
      ],
    ]);
    // (a number's own n/d is a fraction; a step with a modifier before the / is slowed)
    expect(notes('0*1/2', 2)).toEqual(['0', '']);
  });

  it('on an alternation and a splice; with a ratchet (applied after it, whatever the order written)', () => {
    expect(notes('<0 2>/2', 4)).toEqual(['0', '', '2', '']);
    // (a splice bare lasts its own two steps: [0 2]/2 in them, each held a lap)
    expect(laps('&a/2', 2, '&a 0 2\n')).toEqual([[[0, 2, 0]], [[0, 2, 2]]]);
    expect(laps('[0 2]/2*2', 1)).toEqual(laps('[0 2]', 1));
    expect(laps('[0 2]*2/2', 1)).toEqual(laps('[0 2]', 1));
  });
});

describe('x(k,n,r): a euclid on a step, as Strudel’s bd(3,8,2)', () => {
  it('k hits over n parts of the step, each 1/n long, turned right by r as euclid(k, n, r) is', () => {
    expect(laps('0(3,8)', 1)).toEqual([
      [
        [0, 0.125, 0],
        [0.375, 0.125, 0],
        [0.75, 0.125, 0],
      ],
    ]);
    // (the same hits as the generator's, a step of it an eighth of this one)
    const gen = clean('&g step=8 euclid(3, 8, 2)\n&v s=sine loop=C4\n&out map=sample [&g * &v]');
    const at = eventsBetween(plan(gen, codeShifts(gen)), 0, 1).map((e) => r6(e.at));
    expect(laps('0(3,8,2)', 1)[0].map((x) => x[0])).toEqual(at);
  });

  it('plays what the step holds where each hit begins: a subsequence, an alternation, a chord', () => {
    expect(notes('[0 2](3,8)', 1)).toEqual(['0 0 2']);
    expect(notes('<0 2>(3,8)', 2)).toEqual(['0 0 0', '2 2 2']);
    expect(notes('[0,4](2,4)', 1)).toEqual(['0 4 0 4']);
    // (a note held from before a hit sounds under it; under a rest, nothing)
    expect(notes('[0@3 ~](4,4)', 1)).toEqual(['0 0 0']);
  });

  it('a voice in a groove; a splice bare lasts its own steps; then the other modifiers', () => {
    const voices = '&bd s=sine loop=A1\n&hh s=white\n';
    const r = clean(`${voices}&g step=1 &bd(3,8) &hh\n&out map=sample [&g * .6]`);
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 2).map((e) => `${e.voice} ${r6(e.at)} ${r6(e.dur)}`);
    expect(ev).toEqual(['bd 0 0.125', 'bd 0.375 0.125', 'bd 0.75 0.125', 'hh 1 1']);
    expect(laps('&a(2,4) 9', 1, '&a 0 2\n')).toEqual([
      [
        [0, 0.5, 0],
        [1, 0.5, 2],
        [2, 1, 9],
      ],
    ]);
    expect(notes('0(3,8)*2', 1)).toEqual(['0 0 0 0 0 0']);
    expect(notes('0(3,8)!2', 1)).toEqual(['0 0 0 0 0 0']);
  });
});

describe('[a b|c]: a choice of sequences, one each lap', () => {
  const many = (body: string, extra = '') => notes(body, 40, extra);

  it('plays one of its sequences each lap, whole, both in turn over the laps; the same every time', () => {
    const got = many('[0 2|4] 9');
    expect(new Set(got)).toEqual(new Set(['0 2 9', '4 9']));
    expect(many('[0 2|4] 9')).toEqual(got);
    // (another seed=, another sequence of draws)
    expect(many('seed=7 [0 2|4] 9')).not.toEqual(got);
  });

  it('a choice inside a choice draws on its own, though both begin together', () => {
    expect(new Set(many('[[0 1|2] 5|7]'))).toEqual(new Set(['0 1 5', '2 5', '7']));
  });

  it('ratcheted, each copy draws; slowed, a draw lasts its n laps', () => {
    const r = many('[0 2|4]*2');
    expect(r.every((l) => /^((0 2|4) ?){2}$/.test(l))).toBe(true);
    expect(new Set(r).size).toBeGreaterThan(2);
    // ([0 2]/2 over two laps: 0 then 2; or 4 held two laps)
    const s = many('[0 2|4]/2');
    const pairs = Array.from({ length: s.length / 2 }, (_, k) => `${s[2 * k]}|${s[2 * k + 1]}`);
    expect(new Set(pairs)).toEqual(new Set(['0|2', '4|']));
  });

  it('a choice of numbers stays one: [0|4|7]', () => {
    const r = clean('&t [0|4|7]');
    expect(r.cells.get('t')!.units[0].atom.kind).toBe('choice');
  });
});

describe('one step to everything around it', () => {
  it('a pick, a shift and base= take it whole', () => {
    expect(clean('&s 0 <2 4> [0 2]/2 0(3,8) [0|2 4]').cells.get('s')!.steps).toBe(5);
    expect(notes('&s[1] &s[-1:]', 2, '&s 0 <2 4> 5\n')).toEqual(['2 5', '4 5']);
    expect(notes('shift=1 0 <2 4> 5', 2)).toEqual(['2 5 12', '4 5 12']);
    expect(notes('0 [2 4]/2 5', 2)).toEqual(['0 2 5', '0 4 5']);
    expect(notes('base=&b = = 9', 2, '&b 0 <2 4> 5\n')).toEqual(['0 2 9', '0 4 9']);
    expect(notes('free(0 <2 4>)', 2)).toEqual(['0 2', '0 4']);
  });

  it('chance on it and inside it, drawn per lap and step as ever', () => {
    const r = notes('<0 2>? 9', 40);
    expect(r.some((l) => l === '9')).toBe(true);
    expect(r.some((l) => l === '0 9')).toBe(true);
    expect(r.some((l) => l === '2 9')).toBe(true);
    expect(notes('<0 2>? 9', 40)).toEqual(r);
    expect(notes('<0?0 2?1>', 4)).toEqual(['0', '', '0', '']);
  });

  it('windows played apart are what is played at once', () => {
    const r = clean('&a 0 <5 7>\n&t step=4 <0 2> [0 2]/2 [4 [5|7 9]]*2 0(3,8,1) <&a 2>@2 [0 2|4]/3\n&v s=sine loop=C4\n&out map=sample [&t * &v]');
    const p = plan(r, codeShifts(r));
    const key = (e: { at: number; dur: number; freq: number }) => `${e.at.toFixed(6)} ${e.dur.toFixed(6)} ${e.freq.toFixed(3)}`;
    const whole = eventsBetween(p, 0, 12).map(key);
    const tiled: string[] = [];
    for (let t = 0; t < 12; t += 0.3) tiled.push(...eventsBetween(p, t, Math.min(12, t + 0.3)).map(key));
    expect(tiled.sort()).toEqual([...whole].sort());
    expect(whole.length).toBeGreaterThan(40);
  });

  it('the piece comes round after as many laps as it alternates over', () => {
    const piece = (b: string) => pieceTime(compileSource(`&t step=1 ${b}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`)).cycle;
    expect(piece('0 2')).toBe(2);
    expect(piece('0 <2 4 5>')).toBe(6);
    expect(piece('<0 <2 4>> [0 2]/3')).toBe(24);
  });

  it('the wheel draws it as a subsequence: every alternative in its slot', () => {
    const r = clean('&t <0 2> 4');
    expect(cellView(r, 't', codeShifts(r), false)).not.toBeNull();
    const f = flatten(r, 't', codeShifts(r));
    expect(f.map((e) => [e.step, e.duration, e.value, e.laps])).toEqual([
      [0, 1, 0, { of: 2, is: 0 }],
      [0, 1, 2, { of: 2, is: 1 }],
      [1, 1, 4, undefined],
    ]);
  });
});

describe('what it says when it can’t read one', () => {
  it('names the form', () => {
    expect(err('&t <0 2')).toMatch(/'>' to close/);
    expect(err('&t <>')).toMatch(/empty alternation/i);
    expect(err('&t <0|2>')).toMatch(/choice goes in square brackets/);
    expect(err('&t 0(3)')).toMatch(/x\(k, n, r\)/);
    expect(err('&t 0(9,8)')).toMatch(/x\(k, n, r\)/);
    expect(err('&t 0*2(3,8)')).toMatch(/euclid goes straight after its step/);
    expect(err('&t [0 2]/0')).toMatch(/between 1 and/);
    expect(err('&t [0 2]/2/2')).toMatch(/once per step/);
    expect(err('&t 0 _/2')).toMatch(/takes no euclid/);
    expect(err('&t [[[[0]/100]/100]/100]')).toMatch(/comes round after/);
  });
});
