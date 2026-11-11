// One namespace (decision 082): a piece is a document a line takes parts from by its key, so no example's key is a
// fragment's id, nor an id the library still reads the old way (a renamed or a retired one).
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../engine/examples';
import { RENAMED_IDS } from '../engine/renamed';
import { RETIRED, resolveSeed } from './library';
import { SEED } from './seed';

describe('one namespace for pieces and fragments', () => {
  it('no example key is a fragment id, a renamed id or a retired one', () => {
    const ids = new Set([...SEED.map((f) => f.fragment.id), ...RENAMED_IDS.keys(), ...RETIRED.keys()]);
    expect(Object.keys(EXAMPLES).filter((k) => ids.has(k))).toEqual([]);
  });
  it('resolves every example by its key, as the piece it is', () => {
    for (const [key, e] of Object.entries(EXAMPLES)) expect(resolveSeed(key), key).toBe(e.source);
  });
});
