import { describe, expect, it } from 'vitest';
import { rewriteAll, type Find, type Rewrite } from './rewrite';

const SRC = `&bar scan(1 1 1 1) step=120bpm
&tune over=scale(major) step=&bar 0 2 4 2
&lead s=saw loop=C4 cutoff=800 resonance=2
&mix [&tune * &lead]`;

/** A rewrite of one word into another, everywhere. */
const respell = (from: string, to: string): Rewrite => ({
  id: `test:${from}`,
  tool: 'normalise',
  rule: 'test',
  title: `${from} as ${to}`,
  before: from,
  after: to,
  apply: (s) => s.split(from).join(to),
});

describe('rewriteAll: a tool’s rewrites applied until none is left (#155)', () => {
  it('applies each rewrite that plays the same, a round each, and tells them in order', () => {
    const find: Find = (s) => [respell('cutoff=', 'lpf='), respell('resonance=', 'lpq=')].filter((r) => r.apply(s) !== s);
    const { source, steps } = rewriteAll(SRC, find);
    expect(source).toContain('lpf=800 lpq=2');
    expect(steps).toEqual(['cutoff= as lpf=', 'resonance= as lpq=']);
  });

  it('skips a rewrite that moves a note, or that fails, and takes the next', () => {
    const fails: Rewrite = {
      ...respell('x', 'y'),
      apply: () => {
        throw new Error('no');
      },
    };
    const find: Find = (s) => [fails, respell('0 2 4 2', '0 2 4 4'), respell('cutoff=', 'lpf=')].filter((r) => r === fails || r.apply(s) !== s);
    const { source, steps } = rewriteAll(SRC, find);
    expect(source).toContain('0 2 4 2');
    expect(steps).toEqual(['cutoff= as lpf=']);
  });

  it('stops after its rounds, and on a text that doesn’t compile', () => {
    let n = 0;
    const find: Find = () => [{ ...respell('', ''), apply: (s) => s + `\n# ${n++}` }];
    expect(rewriteAll(SRC, find, 3).steps).toHaveLength(3);
    expect(rewriteAll('&a over=&nowhere 0', find).steps).toEqual([]);
  });
});
