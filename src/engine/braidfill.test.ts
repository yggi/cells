/**
 * A braid fill (decision 085 §4, #792 6b): a plugin-fragment's fill with no lap is answered once, when its `from` line is
 * expanded, its text in place of `fill()`, so everything after (compile, the folder, the core) reads ordinary steps. The
 * plugin here is a stand-in, as a host would hand one (`CompileOptions.plugins`): `necklace`, k places as evenly as they
 * go over n, which the language already writes as `even(k, n, phase)` (#784), so it is a test's and no seed's.
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import type { PluginFragment } from './fills';
import { toCore } from './core';
import { expand } from './use';

/** The fragment the stand-in's code answers: its signature, k its main argument, n and phase optional with defaults. */
const NECKLACE = '&places from (&n, &phase) &k\n&places fill()\n&n 12\n&phase 0';
const resolve = (id: string) => (id === 'necklace' ? NECKLACE : null);

/** The places' intervals, as a scan: each place at floor((j·n + phase) / k), its own arithmetic, not the engine's. */
const necklace: PluginFragment = {
  id: 'necklace',
  fragment: 'necklace',
  fills: { places: {} },
  origin: 0,
  cycle: 0,
  stepSeconds: 0,
  fill: (_name, _lap, args) => {
    const [k, n, phase] = [Number(args.k), Number(args.n), Number(args.phase)];
    const at = Array.from({ length: k }, (_, j) => Math.floor((j * n + phase) / k));
    return `scan(${at.map((p, j) => (at[j + 1] ?? at[0]! + n) - p).join(' ')})`;
  },
};
const options = { resolve, plugins: [necklace] };

/** A cell's steps as compiled, without where it is written. */
const steps = (text: string, name: string) => {
  const r = compileSource(text, undefined, options);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return JSON.stringify(r.cells.get(name)!.units, (k, v) => (k === 'span' ? undefined : v));
};

describe('a braid fill is answered at expansion (#792 6b)', () => {
  it('necklace(n=12, phase=5) 7 plays even(7, 12, 5)’s places', () => {
    expect(steps('&scale from necklace(n=12, phase=5) 7', 'scale')).toBe(steps('&scale even(7, 12, 5)', 'scale'));
    // (its defaults, the fragment's own lines: n 12, phase 0)
    expect(steps('&scale from necklace 7', 'scale')).toBe(steps('&scale even(7, 12, 0)', 'scale'));
    expect(steps('&scale from necklace(n=8, phase=1) 3', 'scale')).toBe(steps('&scale even(3, 8, 1)', 'scale'));
  });

  it('its copy is its answer, no fill() left: the expansion and the core write it', () => {
    const piece = '&scale from necklace(n=12, phase=5) 7';
    // (with its code: the answer in place of fill(); the main argument a cell of the copy's, as any template's)
    expect(expand(piece, resolve, undefined, [necklace])).toBe('\n&scale scan(2 2 1 2 2 2 1)\n&scale_k 7');
    const core = toCore(piece, { ...options, interface: ['&scale'] }).source;
    // (the core of its answer: its places, written out as Core writes a scan, no fill() left)
    expect(core).toBe('&scale 0 2 4 5 7 9 11');
  });

  it('without its code, the fill stays unanswered: no answer is made up', () => {
    const r = compileSource('&scale from necklace(n=12, phase=5) 7', undefined, { resolve });
    expect(r.cells.get('scale')?.fill).toEqual({ fragment: 'necklace', name: 'places', clock: 'scale_k' });
    // (written out, it says which fill it is, for a host that has the code)
    expect(expand('&scale from necklace 7', resolve)).toBe('\n&scale fill(necklace, places, &scale_k)\n&scale_k 7');
  });
});
