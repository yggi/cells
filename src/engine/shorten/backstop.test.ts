import { afterAll, describe, expect, it, vi } from 'vitest';

// #485's review: shortenAll's S1 check shown firing. A rule that misses a case is stood in by one that offers a rewrite
// which saves structure and changes the sound; shorten offers it, as a panel's suggestion, and shortenAll refuses it.
// (mocked for this test alone, and the modules read afresh after it: the test files share a module cache)
const BAD = 'a rule that misses a case';

describe('shortenAll checks each step by S1 (#477, #485’s review)', () => {
  afterAll(() => {
    vi.doUnmock('./runs');
    vi.resetModules();
  });

  it('a rewrite that changes the sound is offered by the rule, and never taken', async () => {
    vi.resetModules();
    vi.doMock('./runs', () => ({
      runs: (source: string) =>
        source.includes('0 4 7 9')
          ? [{ id: 'run:bad', tool: 'shorten', rule: 'run', title: BAD, before: '0 4 7 9', after: '0 4 7', apply: (src: string) => src.replace('0 4 7 9', '0 4 7') }]
          : [],
    }));
    const { shorten, shortenAll } = await import('./index');
    const { soundsIdentical } = await import('../sameness');
    const src = '&t step=4 0 4 7 9\n&v s=sine loop=C4\n&out map=sample [&t * &v]';
    expect(shorten(src).map((s) => s.title)).toContain(BAD);
    const { source, steps } = shortenAll(src);
    expect(steps.some((s) => s.includes(BAD))).toBe(false);
    expect(soundsIdentical(src, source)).toBe(true);
  });
});
