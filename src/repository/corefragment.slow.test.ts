import { describe, expect, it } from 'vitest';
import { coreFragment } from './corefragment';
import { LIBRARY, resolveSeed } from './library';
import { FAMILIES } from '../engine/core';
import { EXAMPLES } from '../engine/examples';
import { soundsIdentical } from '../engine/sameness';
import { signatureOf } from '../engine/use';

// #590's bounds over the seed: every fragment with a signature cored up to it, its signature line unchanged, its own
// core; and every example that uses one, the cored fragments in their places, plays the same.
const O = { resolve: resolveSeed, library: LIBRARY };
const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;
const ids = [...new Set(LIBRARY.map((f) => f.id).filter((id) => !id.includes('(')))].filter((id) => signatureOf(resolveSeed(id)!));
const cored = new Map(ids.map((id) => [id, coreFragment(resolveSeed(id)!, O)] as const));

// law L3
describe('every seed fragment cored up to its signature (#590)', () => {
  it.each(ids)('%s: its signature as written, and its own core', (id) => {
    const text = resolveSeed(id)!;
    const { source } = cored.get(id)!;
    expect(source.split('\n')[0]).toBe(text.split('\n')[0]!.trim());
    expect(coreFragment(source, O).source).toBe(source);
  });
});

describe('every example, the cored fragments in their places, plays the same (#590)', () => {
  const resolve = (id: string) => cored.get(id)?.source ?? resolveSeed(id);
  const using = Object.entries(EXAMPLES).filter(([, p]) => [...p.source.matchAll(/\bfrom ([a-z_0-9]+)/g)].some((m) => cored.has(m[1]!)));
  it.each(using)('%s', (_, p) => {
    expect(soundsIdentical(written(p.source, O), written(p.source, { ...O, resolve }), undefined, O)).toBe(true);
  });
});
