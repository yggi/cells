// Patching as an edit (decision 067 §4, #469): a cell's jacks, and a cable patched in or pulled out, each one line rewritten.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { jacksOf, MOVING, patch, PatchError, unpatch } from './patch';
import { PARAMS } from './attributes';
import { resolveSeed } from '../repository/library';

const lines = (...xs: string[]) => xs.join('\n');
const PATCHBAY = EXAMPLES.patchbay.source;
const diagnostics = (text: string) => compileSource(text, undefined, { resolve: resolveSeed }).diagnostics.map((d) => d.message);
const lineOf = (text: string, cell: string) => text.split('\n').find((l) => l.startsWith(`&${cell} `));
const BASE = lines('&bar meter("4/4") step=120bpm', '&tune step=8n 0 3 7 10', '&eg map=adsr .002 .2 .1 .1', '&lfo map=lin loop=&bar/2 sin(12)', '&wob map=lin loop=&bar*2 sin(12)');

describe('a cell’s jacks', () => {
  it('a module’s: its optional parameters, each its knob or its cable, and its input', () => {
    expect(jacksOf(PATCHBAY, 'vcf', resolveSeed)).toEqual([
      { port: 'cutoff', kind: 'argument', band: 'cv', patched: ['sweep'], knob: 'map=lin .5' },
      { port: 'res', kind: 'argument', band: 'cv', patched: ['jitter'], knob: 'map=lin .3' },
      { port: 'eg', kind: 'argument', band: 'cv', patched: ['contour'], knob: 'map=adsr 0 0 1 0' },
      { port: 'in', kind: 'input', band: 'audio', patched: ['saw', 'sub'], knob: null },
    ]);
    // (an inline cell is a value given, the knob as written, no cable)
    expect(jacksOf(PATCHBAY, 'vca', resolveSeed).map((j) => [j.port, j.band, j.patched, j.knob])).toEqual([
      ['eg', 'cv', [], '&(map=adsr .002 .3 .5 .06)'],
      ['level', 'cv', [], 'map=amp 1'],
      ['in', 'audio', ['vcf'], null],
    ]);
  });

  it('a voice’s: its moving sound parameters, pitch=, env= and fm=, each its value and the cells in it', () => {
    const text = lines(BASE, '&v s=saw loop=C2 lpf=70..4800 * &eg * &lfo lpq=8 env=&eg # a voice', '&out map=sample [&tune * &v]');
    const jacks = jacksOf(text, 'v');
    expect(jacks.map((j) => j.port)).toEqual([...MOVING, 'pitch', 'env', 'fm']);
    expect(jacks.find((j) => j.port === 'lpf')).toEqual({ port: 'lpf', kind: 'attribute', band: 'cv', patched: ['eg', 'lfo'], knob: '70..4800' });
    expect(jacks.find((j) => j.port === 'lpq')!.knob).toBe('8');
    expect(jacks.find((j) => j.port === 'hpf')!.knob).toBeNull();
    expect(jacks.find((j) => j.port === 'env')!.patched).toEqual(['eg']);
    expect(jacks.find((j) => j.port === 'fm')!.band).toBe('audio');
  });

  it('an instrument’s: its linear parameters; a melody, a card: none', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf lpf=800 [&saw]', '&out map=sample [&tune * &vcf]');
    expect(jacksOf(text, 'vcf').map((j) => j.port)).toEqual([...MOVING]);
    expect(jacksOf(text, 'tune')).toEqual([]);
    expect(jacksOf(text, 'out')).toEqual([]);
  });

  it('the moving parameters it offers are the attribute table’s, but a line’s legato=, a carrier’s index= (offered where fm= is) and pan= (#696: read per note, not yet a jack)', () => {
    expect(Object.keys(PARAMS).filter((k) => PARAMS[k]!.moves && !['legato', 'index', 'pan'].includes(k))).toEqual([...MOVING]);
  });
});

describe('patch and unpatch: one line rewritten', () => {
  it('into a module’s jack, its argument; out of it, its knob again', () => {
    const patched = patch(PATCHBAY, 'vca', 'level', 'sweep', resolveSeed);
    expect(lineOf(patched, 'vca')).toBe('&vca from amp(eg=&(map=adsr .002 .3 .5 .06), level=&sweep) &vcf');
    expect(diagnostics(patched)).toEqual([]);
    expect(unpatch(patched, 'vca', 'level', 'sweep', resolveSeed)).toBe(PATCHBAY);
    // (a jack takes one cable: one in it is pulled out before another goes in, and nothing is lost)
    expect(() => patch(PATCHBAY, 'vcf', 'res', 'drift', resolveSeed)).toThrow(/holds &jitter: pull it out first/);
    const swapped = patch(unpatch(PATCHBAY, 'vcf', 'res', 'jitter', resolveSeed), 'vcf', 'res', 'drift', resolveSeed);
    expect(lineOf(swapped, 'vcf')).toContain('lowpass(eg=&contour, cutoff=&sweep, res=&drift)');
    // (pulled out of every jack, the module's own knobs)
    let all = PATCHBAY;
    for (const [port, cell] of [
      ['cutoff', 'sweep'],
      ['res', 'jitter'],
      ['eg', 'contour'],
    ])
      all = unpatch(all, 'vcf', port!, cell!, resolveSeed);
    expect(lineOf(all, 'vcf')).toBe('&vcf delay=.3 delaytime=8n. delayfeedback=.45 from lowpass [&saw, &sub * .5]');
  });

  it('into a module’s input, a reference in its mix; out of it, the mix without it; never its last', () => {
    const more = patch(PATCHBAY, 'vcf', 'in', 'hat', resolveSeed);
    expect(lineOf(more, 'vcf')).toMatch(/ \[&saw, &sub \* \.5, &hat\]$/);
    expect(unpatch(more, 'vcf', 'in', 'hat', resolveSeed)).toBe(PATCHBAY);
    const one = unpatch(PATCHBAY, 'vcf', 'in', 'sub', resolveSeed);
    expect(lineOf(one, 'vcf')).toMatch(/\) &saw$/);
    expect(diagnostics(one)).toEqual([]);
    expect(() => unpatch(one, 'vcf', 'in', 'saw', resolveSeed)).toThrow(PatchError);
  });

  it('into a moving parameter, a factor; into a fixed one, at zero depth (decision 067 §4); out, the range’s foot', () => {
    const text = lines(BASE, '&v s=saw loop=C2 lpf=70..4800 * &eg lpq=8 # a voice', '&out map=sample [&tune * &v]');
    const factor = patch(text, 'v', 'lpf', 'lfo');
    expect(lineOf(factor, 'v')).toBe('&v s=saw loop=C2 lpf=70..4800 * &eg * &lfo lpq=8 # a voice');
    expect(unpatch(factor, 'v', 'lpf', 'lfo')).toBe(text);
    const zero = patch(text, 'v', 'lpq', 'wob');
    expect(lineOf(zero, 'v')).toBe('&v s=saw loop=C2 lpf=70..4800 * &eg lpq=8..8 * &wob # a voice');
    // (at zero depth the cable moves nothing until the range is opened)
    expect(diagnostics(zero)).toEqual([]);
    expect(unpatch(zero, 'v', 'lpq', 'wob')).toBe(text);
    // (a range left with no cell doesn't compile: its foot, what a share of 0 plays)
    expect(lineOf(unpatch(text, 'v', 'lpf', 'eg'), 'v')).toBe('&v s=saw loop=C2 lpf=70 lpq=8 # a voice');
    // (patched twice, or out of a jack it isn't in: the text as it was)
    expect(patch(factor, 'v', 'lpf', 'lfo')).toBe(factor);
    expect(unpatch(text, 'v', 'lpf', 'lfo')).toBe(text);
  });

  it('into pitch=, env= or fm=, that cell; out, the attribute gone', () => {
    const text = lines(BASE, '&v s=saw loop=C2 env=&eg', '&out map=sample [&tune * &v]');
    const vibrato = patch(text, 'v', 'pitch', 'wob');
    expect(lineOf(vibrato, 'v')).toBe('&v pitch=&wob s=saw loop=C2 env=&eg');
    expect(diagnostics(vibrato)).toEqual([]);
    expect(unpatch(vibrato, 'v', 'pitch', 'wob')).toBe(text);
    expect(() => patch(text, 'v', 'env', 'lfo')).toThrow(/env= holds &eg: pull it out first/);
    expect(lineOf(patch(unpatch(text, 'v', 'env', 'eg'), 'v', 'env', 'lfo'), 'v')).toBe('&v env=&lfo s=saw loop=C2');
  });

  it('refuses what the text can’t say, and says why', () => {
    const text = lines(BASE, '&v s=saw loop=C2 lpf=&lfo', '&out map=sample [&tune * &v]');
    expect(() => patch(text, 'v', 'lpf', 'eg')).toThrow(/two cells multiply a range/);
    expect(() => patch(text, 'v', 'hpf', 'eg')).toThrow(/write its value first/);
    expect(() => patch(text, 'v', 'nothing', 'eg')).toThrow(/no jack/);
    // (a cable from a cell the text doesn't define, or from the cell itself)
    expect(() => patch(text, 'v', 'pitch', 'nosuch')).toThrow(/defined nowhere/);
    expect(() => patch(text, 'v', 'pitch', 'v')).toThrow(/into itself/);
    // (a cell a from line takes is defined: Patchbay's modules)
    expect(lineOf(patch(PATCHBAY, 'hat', 'hpf', 'sweep'), 'hat')).toContain('hpf=7500..7500 * &sweep');
  });

  // (#471's review: a module's knob given on the line was replaced by a cable and lost when it came out)
  it('a module’s knob given on the line is kept: a cable is refused until it is cleared, so the sound doesn’t jump', () => {
    expect(() => patch(PATCHBAY, 'vca', 'eg', 'contour', resolveSeed)).toThrow(/eg is set on the line \(&\(map=adsr \.002 \.3 \.5 \.06\)\)/);
    // (on &vcf's line: its note's label quotes the line too)
    const set = PATCHBAY.replace(/^(&vcf .*)res=&jitter/m, '$1res=.7');
    expect(() => patch(set, 'vcf', 'res', 'drift', resolveSeed)).toThrow(/res is set on the line \(\.7\)/);
    expect(jacksOf(set, 'vcf', resolveSeed).find((j) => j.port === 'res')).toEqual({ port: 'res', kind: 'argument', band: 'cv', patched: [], knob: '.7' });
  });
});
