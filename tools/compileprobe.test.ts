import { describe, expect, it } from 'vitest';
import { probe } from './compileprobe';
import { EXAMPLES } from '../src/engine/examples';

// The compile tool's probe (#441), over an example; its families, minify and fold are src/engine/core's, tested there.

describe('the probe over an example', () => {
  it('Canon: every family alone and all of them in order play the same, idempotent; the core fold too', () => {
    const r = probe('canon', EXAMPLES.canon!.source, false);
    expect(Object.values(r.families).every((f) => f === null || f.same)).toBe(true);
    expect(r.core).toMatchObject({ same: true, idempotent: true });
    expect(r.minified.same).toBe(true);
    // (wholly in the core: its `&d!2` under a rotation is a count, decision 077)
    expect(r.context).toEqual([]);
  });
});
