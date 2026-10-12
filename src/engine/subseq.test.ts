import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { flatten } from './flatten';
import { eventsBetween, plan } from './realize';
import { liveAt } from './live';
import { parse } from './parser';
import { buildGraph } from '../layout/drawn';
import { cellView } from '../layout/cellview';

// Brackets read as Strudel's mini-notation does (decision 027): `[a b]` a subsequence, `[a, b]` a chord, `[a b, c]` a stack.

type R = ReturnType<typeof compileSource>;
const clean = (src: string): R => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};
/** A cell's notes in its own steps: [onset, length, value] (and its chance, when it has one). */
const steps = (body: string, extra = '', name = 't') => {
  const r = clean(`${extra}&${name} ${body}`);
  return flatten(r, name, codeShifts(r)).map((e) => (e.chance === undefined ? [e.step, e.duration, e.value] : [e.step, e.duration, e.value, e.chance]));
};
const err = (src: string) => parse(src).diagnostics.find((d) => d.severity === 'error')?.message ?? '';
const third = 1 / 3;

describe('[a b c]: a subsequence, squeezed into one step', () => {
  it('shares its step evenly among its steps; the braid around it keeps its steps', () => {
    expect(steps('[0 2 4] 7')).toEqual([
      [0, third, 0],
      [third, third, 2],
      [2 * third, third, 4],
      [1, 1, 7],
    ]);
    expect(clean('&t [0 2 4] 7').cells.get('t')!.steps).toBe(2);
  });

  it('nests: [0 [2 4]] is a half and two quarters', () => {
    expect(steps('[0 [2 4]]')).toEqual([
      [0, 0.5, 0],
      [0.5, 0.25, 2],
      [0.75, 0.25, 4],
    ]);
    expect(steps('[0 [2 [4 5]]] 7')).toEqual([
      [0, 0.5, 0],
      [0.5, 0.25, 2],
      [0.75, 0.125, 4],
      [0.875, 0.125, 5],
      [1, 1, 7],
    ]);
  });

  it('modifiers inside act within it: @ holds, ! repeats, * ratchets, ~ rests, ? may drop', () => {
    expect(steps('[0 2@2]')).toEqual([
      [0, third, 0],
      [third, 2 * third, 2],
    ]);
    expect(steps('[0!2 4]')).toEqual([
      [0, third, 0],
      [third, third, 0],
      [2 * third, third, 4],
    ]);
    expect(steps('[0 ~ 4]')).toEqual([
      [0, third, 0],
      [2 * third, third, 4],
    ]);
    expect(steps('[0*2 4]')).toEqual([
      [0, 0.25, 0],
      [0.25, 0.25, 0],
      [0.5, 0.5, 4],
    ]);
    expect(steps('[0? 4]')).toEqual([
      [0, 0.5, 0, 0.5],
      [0.5, 0.5, 4],
    ]);
    expect(steps('[0?.25 4]')).toEqual([
      [0, 0.5, 0, 0.25],
      [0.5, 0.5, 4],
    ]);
  });

  it('modifiers on the bracket act on all of it: @ holds it, ! repeats it, * plays it n times in its step, ? may drop each', () => {
    expect(steps('[0 2]@2 7')).toEqual([
      [0, 1, 0],
      [1, 1, 2],
      [2, 1, 7],
    ]);
    expect(steps('[0 2]!3')).toEqual([
      [0, 0.5, 0],
      [0.5, 0.5, 2],
      [1, 0.5, 0],
      [1.5, 0.5, 2],
      [2, 0.5, 0],
      [2.5, 0.5, 2],
    ]);
    expect(steps('[0 2]*2 7')).toEqual([
      [0, 0.25, 0],
      [0.25, 0.25, 2],
      [0.5, 0.25, 0],
      [0.75, 0.25, 2],
      [1, 1, 7],
    ]);
    expect(steps('[0 2]?')).toEqual([
      [0, 0.5, 0, 0.5],
      [0.5, 0.5, 2, 0.5],
    ]);
    // (a chance inside one with a chance: either may drop it, so it sounds if both let it through)
    expect(steps('[0?.5 2]?.5')).toEqual([
      [0, 0.5, 0, 0.75],
      [0.5, 0.5, 2, 0.5],
    ]);
    // (a bare ? takes the cell's chance=, inside as out)
    expect(steps('chance=.2 [0? 2]')).toEqual([
      [0, 0.5, 0, 0.2],
      [0.5, 0.5, 2],
    ]);
  });

  it('is the step it takes for the braid around it: holds, repeats and counts as one', () => {
    const r = clean('&t 0 [2 4]@2 [5 7]!2 9');
    expect(r.cells.get('t')!.steps).toBe(6);
    expect(r.cells.get('t')!.unitSteps).toEqual([1, 2, 2, 1]);
  });
});

describe('[a, b] a chord, [a b, c] a stack', () => {
  it('commas between plain numbers are a chord, as before; a comma-less bracket is not', () => {
    const atom = (body: string) => {
      const c = parse(`&t ${body}`).cells[0]!;
      return c.braid.kind === 'list' ? c.braid.tokens[0]!.atom : null;
    };
    expect(atom('[0,2,4]')).toEqual({ kind: 'chord', notes: [0, 2, 4], alters: [0, 0, 0] });
    expect(atom('[0, 2, 4]')).toEqual(atom('[0,2,4]'));
    expect(atom('[C, E, G]')).toMatchObject({ kind: 'chord', pitched: [true, true, true] });
    expect(atom('[0 2 4]')).toMatchObject({
      kind: 'seq',
      layers: [[{ atom: { kind: 'note', value: 0 } }, { atom: { kind: 'note', value: 2 } }, { atom: { kind: 'note', value: 4 } }]],
    });
    expect(steps('[0,2,4]')).toEqual([
      [0, 1, 0],
      [0, 1, 2],
      [0, 1, 4],
    ]);
  });

  it('a stack: each layer a subsequence, all spanning the step', () => {
    expect(steps('[0 2, 4] 7')).toEqual([
      [0, 0.5, 0],
      [0, 1, 4],
      [0.5, 0.5, 2],
      [1, 1, 7],
    ]);
    expect(steps('[0 2 4, 7 9]')).toEqual([
      [0, third, 0],
      [0, 0.5, 7],
      [third, third, 2],
      [0.5, 0.5, 9],
      [2 * third, third, 4],
    ]);
    // (a layer of one with a modifier, [0, 2!2], is a stack, not a chord)
    expect(steps('[0, 2!2]')).toEqual([
      [0, 1, 0],
      [0, 0.5, 2],
      [0.5, 0.5, 2],
    ]);
    // (and a chord inside a subsequence is a chord)
    expect(steps('[[0,4] 7]')).toEqual([
      [0, 0.5, 0],
      [0, 0.5, 4],
      [0.5, 0.5, 7],
    ]);
  });

  it('a choice stays numbers between bars; a choice of sequences says so', () => {
    expect(steps('[0|4|7]')).toEqual([[0, 1, 0]]);
    expect(steps('[0 [2|4]]').map((e) => e.slice(0, 2))).toEqual([
      [0, 0.5],
      [0.5, 0.5],
    ]);
    expect(err('&t [0 2|4]')).toMatch(/A choice is numbers between bars/);
    expect(err('&t [0, 2|4]')).toMatch(/not both/);
  });

  it('says what a bracket needs', () => {
    expect(err('&t []')).toMatch(/Empty brackets/);
    expect(err('&t [0 2')).toMatch(/to close the bracket/);
    expect(err('&t [0,]')).toMatch(/after the comma/);
    expect(err('&t [, 0]')).toMatch(/before the comma/);
    expect(err('&t [0 2]x')).toMatch(/separate steps with spaces/);
    expect(err(`&t ${'['.repeat(40)}0${']'.repeat(40)}`)).toMatch(/Brackets nest 32 deep at most/);
  });
});

describe('cells inside a subsequence', () => {
  it('a splice lasts its slot, its steps squeezed into it (as Strudel squeezes a pattern); outside, its own steps', () => {
    expect(steps('[&a 7]', '&a 0 2 4 5\n')).toEqual([
      [0, 0.125, 0],
      [0.125, 0.125, 2],
      [0.25, 0.125, 4],
      [0.375, 0.125, 5],
      [0.5, 0.5, 7],
    ]);
    expect(steps('&a 7', '&a 0 2 4 5\n').map((e) => e[1])).toEqual([1, 1, 1, 1, 1]);
    expect(clean('&a 0 2 4 5\n&t [&a 7] 9').cells.get('t')!.steps).toBe(2);
    // ([&a &b]: two splices in one step, each in half of it)
    expect(steps('[&a &b]', '&a 0 2\n&b 4\n')).toEqual([
      [0, 0.25, 0],
      [0.25, 0.25, 2],
      [0.5, 0.5, 4],
    ]);
  });

  it('a splice inside is a splice: checked, drawn and lit', () => {
    expect(
      compileSource('&t [&nope 0]')
        .diagnostics.map((d) => d.message)
        .join(),
    ).toMatch(/nope/);
    expect(
      compileSource('&a [&t 0]\n&t [0 &a]')
        .diagnostics.map((d) => d.message)
        .join(),
    ).toMatch(/Circular reference/);
    const r = clean('&a 0 2\n&t step=1 [&a^1 7] 9\n&v s=sine loop=C4\n&out map=sample [&t * &v]');
    expect(r.cells.get('t')!.children.get('a')).toBe(1);
    const g = buildGraph(r, { bulbs: false });
    expect(g.edges.find((e) => e.source === 'cell:t' && e.target === 'cell:a')).toBeDefined();
    // (at a quarter of the first second &a's second note plays: lit, through &a)
    const live = liveAt(r, codeShifts(r), new Set(), 0.3);
    expect(live.nodes.has('cell:a')).toBe(true);
  });

  it('a pick takes a subsequence as one step', () => {
    expect(steps('&x[1] &x[1]', '&x 0 [2 4] 5\n')).toEqual([
      [0, 0.5, 2],
      [0.5, 0.5, 4],
      [1, 0.5, 2],
      [1.5, 0.5, 4],
    ]);
    expect(steps('&x[::-1]', '&x 0 [2 4] 5\n')).toEqual([
      [0, 1, 5],
      [1, 0.5, 2],
      [1.5, 0.5, 4],
      [2, 1, 0],
    ]);
  });

  it('a groove of voices: &bd [&hh &hh] plays two hats in a step, as &bd &hh*2 does', () => {
    const voices = '&bar scan(1 1 1 1) step=120bpm\n&bd s=sine loop=A1\n&hh s=white hpf=8000\n&sd s=white hpf=1500\n';
    const play = (g: string, more = '') => {
      const r = clean(`${voices}${more}&g step=&bar*2 ${g}\n&out map=sample [&g * .6]`);
      return eventsBetween(plan(r, codeShifts(r)), 0, 4)
        .map((e) => `${e.voice} ${e.at.toFixed(4)} ${e.dur.toFixed(4)}`)
        .sort();
    };
    expect(play('&bd [&hh &hh]')).toEqual(play('&bd &hh*2'));
    const ev = play('&bd [&hh &hh] &sd [&hh ~ &hh, &bd]');
    // (a step is a quarter of a second at 120bpm, two to a beat)
    expect(ev).toContain('hh 0.2500 0.1250');
    expect(ev).toContain('hh 0.3750 0.1250');
    expect(ev).toContain('hh 0.7500 0.0833');
    expect(ev).toContain('hh 0.9167 0.0833');
    expect(ev).toContain('bd 0.7500 0.2500');
    // (a drum motif with a subsequence, spliced into a groove)
    expect(play('&fill &bd', '&fill &sd [&sd &sd]\n')).toEqual(play('&sd &sd*2 &bd'));
  });

  it('base= moves a subsequence as a step, and = keeps whole steps only', () => {
    expect(steps('base=&a^$7 = 9', '&a [0 2] 4\n', 'b')).toEqual([
      [0, 0.5, 7],
      [0.5, 0.5, 9],
      [1, 1, 9],
    ]);
    expect(steps('base=&a = [5 7]', '&a [0 2] 4\n', 'b')).toEqual([
      [0, 0.5, 0],
      [0.5, 0.5, 2],
      [1, 0.5, 5],
      [1.5, 0.5, 7],
    ]);
    expect(err('&a 0 4\n&b base=&a [= 2]')).toMatch(/= keeps a whole step of the base, not part of one/);
    expect(err('&b [= 2]')).toMatch(/= keeps a whole step of the base, not part of one/);
  });

  it('a braid left free holds subsequences of numbers', () => {
    const r = parse('&riff free(0 [2 4] ~ [0, 4])');
    expect(r.diagnostics).toEqual([]);
    expect(r.cells[0]!.frees![0]!.hi).toBe(4);
    expect(err('&riff free(0 [&x 2])')).toMatch(/holds steps/);
  });

  it('a mix keeps its terms: [&a, &b] and [&a * &b, &c] are mixes, [&a &b] steps', () => {
    const kind = (body: string) => {
      const c = parse(`&t ${body}`).cells[0]!;
      return c.braid.kind === 'list' ? c.braid.tokens[0]!.atom.kind : null;
    };
    expect(kind('[&a, &b]')).toBe('mix');
    expect(kind('[&a * &b, &c * .5]')).toBe('mix');
    expect(kind('[(&a + 12) * &b]')).toBe('mix');
    expect(kind('[&a]')).toBe('mix');
    expect(kind('[&a &b]')).toBe('seq');
    expect(kind('[&a, &b &c]')).toBe('seq');
    expect(kind('[0 [&a, &b]]')).toBe('seq');
  });
});

describe('subsequences drawn', () => {
  it("the wheel splits a subsequence's step among its notes", () => {
    const r = clean('&t [0 2] 4');
    const v = cellView(r, 't', codeShifts(r), false)!;
    expect(v.segments.map((s) => [s.t0, s.t1, s.index])).toEqual([
      [0, 0.25, 0],
      [0.25, 0.5, 0],
      [0.5, 1, 1],
    ]);
    expect(v.detents).toBe(2);
  });
  it('a splice inside one is a bulb in its slot', () => {
    const r = clean('&a 0 2\n&t step=1 [&a 7] 9\n&v s=sine loop=C4\n&out map=sample [&t * &v]');
    const v = cellView(r, 't', codeShifts(r), false)!;
    expect(v.bulbs?.map((b) => [b.name, b.t0, b.t1])).toEqual([['a', 0, 0.25]]);
  });
});

describe('subsequences in time', () => {
  const src = '&a 0 2\n&t step=4 0 [2 4] [5 [7 &a]]*2 [0 2, 4]@2 [0? 4]!2\n&v s=sine loop=C4\n&out map=sample [&t * &v]';
  it('windows tile: no note lost or doubled across window edges', () => {
    const r = clean(src);
    const p = plan(r, codeShifts(r));
    const whole = eventsBetween(p, 0, 6).map((e) => `${e.at.toFixed(6)} ${e.dur.toFixed(6)} ${e.freq.toFixed(3)}`);
    const tiled: string[] = [];
    for (let t = 0; t < 6; t += 0.1) tiled.push(...eventsBetween(p, t, Math.min(6, t + 0.1)).map((e) => `${e.at.toFixed(6)} ${e.dur.toFixed(6)} ${e.freq.toFixed(3)}`));
    expect(tiled.sort()).toEqual([...whole].sort());
    expect(whole.length).toBeGreaterThan(20);
  });
  it('plays where flatten says: onsets a step of a quarter second apart, squeezed inside', () => {
    const r = clean(src);
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 0.5).map((e) => +e.at.toFixed(6));
    expect(at).toEqual([0, 0.25, 0.375]);
  });
});
