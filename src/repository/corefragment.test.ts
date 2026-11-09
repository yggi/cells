import { describe, expect, it } from 'vitest';
import { coreFragment } from './corefragment';
import { LIBRARY, resolveSeed } from './library';
import { FAMILIES } from '../engine/core';
import { soundsIdentical } from '../engine/sameness';
import { signatureOf } from '../engine/use';

// #590: a fragment cored up to its signature, heard through a host; the sweep over the seed and the examples is
// corefragment.slow.test.ts's.
const O = { resolve: resolveSeed, library: LIBRARY };
const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;

describe('a fragment cored up to its signature (#590)', () => {
  it('its signature line as written, its heads and parameters by name, its own lines cored', () => {
    const text = resolveSeed('meter')!;
    const { source, why } = coreFragment(text, O);
    expect(why).toBeUndefined();
    expect(source.split('\n')[0]).toBe(text.split('\n')[0]);
    expect(signatureOf(source)).toEqual(signatureOf(text));
    // (a parameter stays read by name: the copy of &grouping is not written out)
    expect(source).toMatch(/^&bar base=&grouping /m);
    expect(source).toMatch(/^&grouping meter\("\*-\+-"\)$/m);
  });
  it('what it takes from another fragment stays a from line: a piece may give its own', () => {
    const text = resolveSeed('bass_performer')!;
    const { source } = coreFragment(text, O);
    expect(source).toMatch(/^&bassV from bass$/m);
  });
  it('a tap under a meter it doesn’t define stays as written: the meter is its piece’s', () => {
    const { source } = coreFragment(resolveSeed('dark_cadence')!, O);
    expect(source).toMatch(/step=1m/);
  });
  it('used in its place, a piece plays the same', () => {
    const src = '&bar from meter &tempo\n&tempo step=2\n&key scale(minor, 2)\n&harm from dark_cadence &key\n&v s=sine loop=C4\n&out map=sample [&harm * &v]';
    const cored = coreFragment(resolveSeed('meter')!, O).source;
    const resolve = (id: string) => (id === 'meter' ? cored : resolveSeed(id));
    expect(soundsIdentical(written(src, O), written(src, { ...O, resolve }), undefined, O)).toBe(true);
  });
  it('a text with no signature is cored as a piece: as written, and says so', () => {
    expect(coreFragment('&a 0 2', O)).toEqual({ source: '&a 0 2', why: 'no signature: a collection is cored as a piece' });
  });
});
