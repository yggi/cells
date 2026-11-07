import { describe, expect, it } from 'vitest';
import { toCore } from '.';
import { normalise } from '../normalise';
import { EXAMPLES } from '../examples';
import { soundsIdentical } from '../sameness';
import { LIBRARY, resolveSeed } from '../../repository/library';

// The core over every example (decision 069, #482's bounds): S1 against the source, its own core, and the core of its
// normal form (the examples are normal, `normalise.test.ts`, so that is the core of the text Normalise writes).
const O = { resolve: resolveSeed, library: LIBRARY };

describe('the core of every example (decision 069)', () => {
  it.each(Object.entries(EXAMPLES))('%s: plays the same, is its own core, and is its normal form’s core', (_, p) => {
    const c = toCore(p.source, O);
    expect(soundsIdentical(p.source, c.source, undefined, O)).toBe(true);
    expect(toCore(c.source, O).source).toBe(c.source);
    expect(toCore(normalise(p.source, O).source, O).source).toBe(c.source);
  });
});
