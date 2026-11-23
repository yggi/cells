// A frontend's mask (`VaryOptions.fixed`, decision 052, point 11) on a line, as on a line of slots: by the line's name,
// the steps of its grid no operator moves, in place of the anchors the text derives (a pitched line's roots on its chord
// changes, a kick's or a backbeat's whole line). On decision 052's own bass and drum bar: with no mask what point 3
// derives; with one, what it fixes, at every scale alike.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { flatten } from '../flatten';
import { codeShifts } from '../program';
import { PITCHED_OPERATORS, RHYTHM_OPERATORS, variationBy, variations, type VaryOptions } from '.';

const BASS_BENCH = '&bar meter("4/4") step=120bpm\n&key scale(minor, A)\n&harm over=&key step=2n [0,2,4] [3,5,7]';
const BASS = '&bass over=&harm step=8n 0 ~ 1 2 0 ~ 2 1\n&low s=tri loop=C2\n&mix map=sample [&bass * &low]';
const DRUM_BENCH = '&bar meter("4/4") step=120bpm\n&bd note=36 s=white\n&sd note=38 s=white\n&hh note=42 s=white';
const DRUMS = [
  '&kick note=36 step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~',
  '&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~',
  '&hat step=16n ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25 ~',
  '&drums map=midi(10) [&kick, &backbeat, &hat]',
].join('\n');

const bass = (fixed?: VaryOptions['fixed']) => ({ workbench: BASS_BENCH, operators: PITCHED_OPERATORS, ...(fixed ? { fixed } : {}) });
const drums = (fixed?: VaryOptions['fixed']) => ({ workbench: DRUM_BENCH, operators: RHYTHM_OPERATORS, ...(fixed ? { fixed } : {}) });

/** A line's notes as they play: each step and degree (a drum line's: its step). */
const notesOf = (text: string, bench: string, line: string) => {
  const result = compileSource(`${bench}\n${text}`);
  return flatten(result, line, codeShifts(result)).map((e) => `${e.step}:${e.value}`);
};
const braidOf = (text: string, line: string) => text.split('\n').find((l) => l.startsWith(`&${line} `))!;

describe('a mask on a melodic line', () => {
  it('none: the roots on the chord changes, steps 0 and 4, stay', () => {
    expect(braidOf(variationBy(BASS, 'transpose &bass 1', bass())!.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 0 ~ 2 3 0 ~ 3 2');
  });

  it('an empty mask frees them: every note moves', () => {
    expect(braidOf(variationBy(BASS, 'transpose &bass 1', bass({ '&bass': [] }))!.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 1 ~ 2 3 1 ~ 3 2');
  });

  it('a mask of its first and last step fixes those instead, a form’s anchors on a line', () => {
    const v = variationBy(BASS, 'transpose &bass 1', bass({ bass: [0, -1] }))!;
    expect(braidOf(v.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 0 ~ 2 3 1 ~ 3 1');
    // (reversed between its fixed steps: the inner six read backwards, the slot operators' reverse on a line's steps)
    const r = variationBy(BASS, 'reverse &bass', bass({ bass: [0, -1] }))!;
    expect(braidOf(r.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 0 2 ~ 0 2 1 ~ 1');
  });

  it('keeps every fixed note where it was, in every variation', () => {
    for (const fixed of [[], [0], [0, -1], [2, 3]] as const) {
      const at = (text: string) => notesOf(text, BASS_BENCH, 'bass').filter((n) => fixed.some((f) => Number(n.split(':')[0]) === (f < 0 ? 8 + f : f)));
      for (const v of variations(BASS, bass({ '&bass': fixed }))) expect(at(v.apply(BASS)), `${fixed} ${v.by}`).toEqual(at(BASS));
    }
  });
});

describe('a mask on a line of hits', () => {
  it('none: the kick and the backbeat are anchors, whole', () => {
    expect(variations(DRUMS, drums()).some((v) => v.line === '&kick' || v.line === '&backbeat')).toBe(false);
  });

  it('a mask frees the kick but for the steps it fixes: drops and adds around them, its rotation within its spans', () => {
    const kick = variations(DRUMS, drums({ '&kick': [0, 8] })).filter((v) => v.line === '&kick');
    expect(kick.map((v) => v.by)).toEqual(['rotate &kick', 'drop &kick 4', 'drop &kick 12', ...[1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map((s) => `add &kick ${s}`)]);
    expect(braidOf(variationBy(DRUMS, 'rotate &kick', drums({ '&kick': [0, 8] }))!.apply(DRUMS), 'kick')).toBe('&kick note=36 step=16n &bd ~ ~ ~ ~ &bd ~ ~ &bd ~ ~ ~ ~ &bd ~ ~');
  });

  it('with no mask a rotation is the slot operators’ rotate over the whole line: every hit a step later', () => {
    expect(braidOf(variationBy(DRUMS, 'rotate &hat', drums())!.apply(DRUMS), 'hat')).toBe('&hat step=16n ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.5 ~ ~ ~ &hh:0:.25 ~ ~ ~ &hh:0:.25');
  });
});

describe('the slot operators on a line’s steps (point 11)', () => {
  const asked = (fixed?: VaryOptions['fixed']) => ({ ...bass(fixed), operators: ['swap', 'substitute'] as const });
  const bys = (fixed?: VaryOptions['fixed']) => variations(BASS, { ...asked(fixed), operators: [...asked(fixed).operators] }).map((v) => v.by);

  it('swap two adjacent steps, rests among them; substitute a step by another the line holds; never a root', () => {
    expect(braidOf(variationBy(BASS, 'swap &bass 2', { ...bass(), operators: ['swap'] })!.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 0 ~ 2 1 0 ~ 2 1');
    expect(braidOf(variationBy(BASS, 'substitute &bass 7 0', { ...bass(), operators: ['substitute'] })!.apply(BASS), 'bass')).toBe('&bass over=&harm step=8n 0 ~ 1 2 0 ~ 2 0');
    // (the roots on steps 0 and 4 neither move nor take another step's: no swap reaches them, no substitution is on them)
    const all = bys();
    expect(all.filter((b) => /^swap /.test(b))).toEqual(['swap &bass 1', 'swap &bass 2', 'swap &bass 5', 'swap &bass 6']);
    expect(all.filter((b) => /^substitute &bass [04] /.test(b))).toEqual([]);
    expect(all.length).toBe(22);
  });

  it('with an empty mask the roots are slots too', () => {
    expect(bys({ '&bass': [] }).filter((b) => /^swap /.test(b))).toEqual([
      'swap &bass 0',
      'swap &bass 1',
      'swap &bass 2',
      'swap &bass 3',
      'swap &bass 4',
      'swap &bass 5',
      'swap &bass 6',
    ]);
  });

  it('are asked by name: the line operators alone give what they gave', () => {
    expect(variations(BASS, bass()).some((v) => v.rule === 'swap' || v.rule === 'substitute')).toBe(false);
    expect(variations(DRUMS, drums()).some((v) => v.rule === 'swap' || v.rule === 'substitute')).toBe(false);
  });
});
