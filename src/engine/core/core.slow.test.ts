import { describe, expect, it } from 'vitest';
import { toCore } from '.';
import { normalise } from '../normalise';
import { EXAMPLES } from '../examples';
import { soundsIdentical } from '../sameness';
import { compileSource } from '../compile';
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

// Decision 077 §2: every example with a performer, cored up to its roles, plays the same and keeps them, is its own core
// up to them, and cored further to nothing is the core of its source (narrowing).
describe('the core of every example up to its roles (decision 077)', () => {
  const performers = (text: string) => (compileSource(text, undefined, O).performers ?? []).map((p) => p.name);
  const banded = Object.entries(EXAMPLES).filter(([, p]) => /map=role|from \w*performer/.test(p.source));
  it.each(banded)('%s', (_, p) => {
    const roles = toCore(p.source, { ...O, interface: 'roles' }).source;
    expect(soundsIdentical(p.source, roles, undefined, O)).toBe(true);
    expect(performers(roles).length).toBeGreaterThan(0);
    expect(toCore(roles, { ...O, interface: 'roles' }).source).toBe(roles);
    expect(toCore(roles, O).source).toBe(toCore(p.source, O).source);
  });
});
