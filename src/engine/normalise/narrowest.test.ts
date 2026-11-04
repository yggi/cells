import { describe, expect, it } from 'vitest';
import { normalise } from './index';
import { soundsIdentical } from '../sameness';
import { resolveSeed } from '../../repository/library';

// The narrowest `from` (#27's row, the owner on #157): `* from foo` is a shorthand for all of foo the piece uses.
const SEED = { resolve: resolveSeed };
const piece = (from: string, more = '') => `&bar meter("4/4") step=&tempo
&tempo step=120bpm
${from}
${more}&beat step=8n &bd ~ &hh ~ &bd &bd &hh ~
&mix [&beat * .6]`;

describe('Normalise: the narrowest from (#27, #157)', () => {
  it('`* from gm_kit` is written as the cells of it the piece uses, in the fragment’s order, playing the same', () => {
    const src = piece('* from gm_kit');
    const { source, steps } = normalise(src, SEED);
    expect(source).toBe(piece('&bd, &hh from gm_kit'));
    expect(steps).toEqual(['* from gm_kit is written &bd, &hh from gm_kit: the cells of it the piece uses']);
    expect(soundsIdentical(src, source, undefined, SEED)).toBe(true);
    expect(normalise(source, SEED)).toEqual({ source, steps: [] });
  });

  it('a cell the piece defines is its own: not taken', () => {
    const src = piece('* from gm_kit', '&hh s=white hpf=9000 env=&(map=adsr 0 .03 0 0)\n');
    expect(normalise(src, SEED).source).toBe(piece('&bd from gm_kit', '&hh s=white hpf=9000 env=&(map=adsr 0 .03 0 0)\n'));
  });

  it('a `*` the piece reads nothing of is left as it is', () => {
    const src = `&bar meter("4/4") step=&tempo\n&tempo step=120bpm\n* from gm_kit\n&t over=scale(major) step=8n 0 2 4\n&lead s=saw loop=C4\n&mix [&t * &lead]`;
    expect(normalise(src, SEED).steps.filter((s) => s.includes('the cells of it the piece uses'))).toEqual([]);
  });
});
