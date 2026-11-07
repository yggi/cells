import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { drawKeyOf } from './drawkey';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { createRenderer } from './render';
import { soundsIdentical } from './sameness';
import { FAMILIES, minify } from './core';
import { EXAMPLES } from './examples';
import { resolveSeed } from '../repository/library';

// #481: a draw is keyed on what its cell plays, not its name or its spelling; a noise starts where its place says.
const BAR = '&bar meter("4/4") step=&tempo\n&tempo step=120bpm';
const notes = (text: string) => {
  const r = compileSource(text);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 16)
    .map((e) => `${e.at.toFixed(4)} ${e.freq.toFixed(2)}`)
    .join('\n');
};

describe('a draw is keyed on what its cell plays (#481)', () => {
  const piece = (a: string, b: string) => `${BAR}\n&${a} 0 2? [4|7] 5?.7 [0 2|9]\n&${b} step=8n &${a} &${a}\n&v s=sine loop=C4\n&out map=sample [&${b} * &v]`;

  it('a text renamed draws as it did: the same notes, every one', () => {
    expect(notes(piece('a1', 'arp'))).toBe(notes(piece('motif', 'bells')));
    expect(soundsIdentical(piece('a1', 'arp'), piece('motif', 'bells'))).toBe(true);
  });

  it('a text respelled draws as it did: a run counted, a chance said on the cell or on the step', () => {
    const run = (b: string) => `${BAR}\n&t step=8n ${b}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
    expect(notes(run('0? 0? 0? 0? 2 4'))).toBe(notes(run('0?!4 2 4')));
    const chance = (attr: string, b: string) => `${BAR}\n&t step=8n ${attr}${b}\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
    expect(notes(chance('chance=.3 ', '0? 2? 4 5?'))).toBe(notes(chance('', '0?.3 2?.3 4 5?.3')));
  });

  it('two cells that play alike draw alike; one that plays otherwise, otherwise', () => {
    const r = compileSource(`${BAR}\n&a step=8n 0? 2? 4? 5?\n&b step=8n 0? 2? 4? 5?\n&c step=8n 0? 2? 4? 7?\n&v s=sine loop=C4\n&out map=sample [&a * &v, &b * &v, &c * &v]`);
    const key = drawKeyOf(r);
    expect(key('a')).toBe(key('b'));
    expect(key('a')).not.toBe(key('c'));
  });

  it('a seed= still gives a cell its own draws', () => {
    const seeded = (s: string) => `${BAR}\n&t step=8n ${s}0? 2? 4? 5? 7? 9? 11? 12?\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
    expect(notes(seeded(''))).not.toBe(notes(seeded('seed=7 ')));
  });
});

describe('a noise starts where its place among the noise voices says (#481)', () => {
  const samples = (text: string) => {
    const r = compileSource(text);
    const rr = createRenderer(r, codeShifts(r), { sampleRate: 8000 });
    rr.add(eventsBetween(plan(r, codeShifts(r)), 0, 1, true));
    return [...rr.render(8000).mix[0]!.slice(0, 4000)];
  };
  const noise = (name: string, attrs = '') => `&${name} s=white ${attrs}env=&(map=adsr 0 .05 0 .01)\n&n step=4 0 0 0 0\n&out map=sample [&n * &${name}]`;

  it('renamed, it plays the same samples', () => {
    expect(samples(noise('v'))).toEqual(samples(noise('hiss')));
  });
});

// every example, its `from` lines written in and every name it may rename renamed (minify: a
// drum's kept, since on a MIDI card a drum's name is its note), plays as it did: renaming is free, draws and all
describe('every example renamed plays as it did (#481)', () => {
  const O = { resolve: resolveSeed };
  const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;
  it.each(Object.entries(EXAMPLES))('%s', (_, p) => {
    const text = written(p.source, O);
    expect(soundsIdentical(text, minify(text), undefined, O)).toBe(true);
  });
});
