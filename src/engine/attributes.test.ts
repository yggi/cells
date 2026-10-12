import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATTRIBUTES, PARAMS, VOICE_PARAMS, nearestAttribute } from './attributes';
import { compileSource } from './compile';
import { parse } from './parser';

describe('the attribute table', () => {
  test('the parser reads every attribute in it', () => {
    for (const k of Object.keys(ATTRIBUTES)) {
      const ms = parse(`&a ${k}=1`).diagnostics.map((d) => d.message);
      expect(
        ms.filter((m) => m.startsWith('Unknown attribute')),
        k,
      ).toEqual([]);
    }
  });

  test('… and nothing else (the retired ones say what replaced them)', () => {
    expect(parse('&a attack=1').diagnostics[0].message).toMatch(/attack= is gone/);
    expect(parse('&a fmh=1').diagnostics[0].message).toMatch(/^Unknown attribute fmh=/);
  });

  test('every attribute is written as key= on the page that documents it', () => {
    const pages = new Map<string, string>();
    for (const [k, a] of Object.entries(ATTRIBUTES)) {
      if (!pages.has(a.doc)) pages.set(a.doc, readFileSync(`docs/language/${a.doc}`, 'utf8'));
      expect(pages.get(a.doc), `${k}= in docs/language/${a.doc}`).toMatch(new RegExp(`(^|[^A-Za-z])${k}=`));
    }
  });

  test('sound parameters make a voice; a physical cell’s make none', () => {
    expect([...VOICE_PARAMS].sort()).toEqual(
      ['s', 'lpf', 'lpq', 'hpf', 'hpq', 'room', 'delay', 'delaytime', 'delayfeedback', 'pan', 'distort', 'crush', 'fm', 'ratio', 'index', 'body', 'ring', 'hard'].sort(),
    );
    expect(Object.keys(PARAMS).length).toBe(58);
  });

  test('a misspelling finds its nearest attribute', () => {
    expect(nearestAttribute('stpe')).toBe('step');
    expect(nearestAttribute('lpff')).toBe('lpf');
    expect(nearestAttribute('delaytme')).toBe('delaytime');
    expect(nearestAttribute('qqqqqq')).toBe(null);
  });
});

describe('an attribute where it does nothing is a warning', () => {
  const tail = '\n&v s=saw\n&mix [&t * &v]\n&out loop=SAMPLE_RATE map=sample &mix &mix';
  const warnings = (source: string) => {
    const r = compileSource(source);
    expect(r.ok).toBe(true);
    return r.diagnostics.map((d) => d.message);
  };
  test.each([
    ['swing= on a voice', '&t step=4 0 1' + tail.replace('s=saw', 's=saw swing=.6'), 'swing= acts on a meter (step= a rate): on &v it does nothing'],
    ['level= off the sound card', '&t step=4 level=-3 0 1' + tail, 'level= acts on the sound card (map=sample) or a gate (play= with a braid): on &t it does nothing'],
    ['wow= without a motor', '&m step=90bpm wow=.01\n&t step=&m 0 1' + tail, 'wow= acts on a meter with a motor=: on &m it does nothing'],
    ['ratio= on a voice no fm= names', '&t step=4 0 1' + tail.replace('s=saw', 's=saw ratio=2'), 'ratio= acts on a voice another’s fm= names: on &v it does nothing'],
    ['title= on a cell that plays', '&t step=4 title="x" 0 1' + tail, 'title= acts on a note (a label= and nothing else): on &t it does nothing'],
    ['a word for a number, not on a voice', '&m step=90bpm motor=strong\n&t step=&m 0 1' + tail, "motor= takes a number: 'strong' does nothing"],
    [
      'swing= on a scan',
      '&m scan(3 3 3 3) step=90bpm swing=.6\n&t step=&m 0 1' + tail,
      'swing= swings a meter written as a list or meter(…); a scan(…) places its steps itself — write the swing into it',
    ],
  ])('%s', (_, source, message) => {
    expect(warnings(source)).toEqual([message]);
  });

  test('in their place, none', () => {
    expect(warnings('&m step=90bpm motor=1 wow=.01 swing=.6 0 1 2 3\n&t step=&m 0 1' + tail.replace('&out', '&out level=-3'))).toEqual([]);
    expect(warnings('&op s=sine ratio=2\n&t step=4 0 1' + tail.replace('s=saw', 's=sine fm=&op index=3'))).toEqual([]);
  });

  test('a clock with a sound parameter: the error says which made it a voice', () => {
    const r = compileSource('&m step=90bpm lpf=300\n&t step=&m 0 1' + tail);
    expect(r.diagnostics[0].message).toMatch(/\(lpf= makes &m a voice; a meter takes none\)$/);
  });
});
