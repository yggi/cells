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
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';

/** The fragment the stand-in's code answers: its signature, k its main argument, n and phase optional with defaults. */
const NECKLACE = '&places from (&n, &phase) &k\n&places fill()\n&n 12\n&phase 0';
const resolve = (id: string) => (id === 'necklace' ? NECKLACE : null);

/** The places' intervals, as a scan: each place at floor((j·n + phase) / k), its own arithmetic, not the engine's. */
const necklace: PluginFragment = {
  id: 'necklace',
  fragment: 'necklace',
  // (its work a place a slot: n, refused past its fuel, 085 §8)
  fills: { places: { fuel: 64 } },
  origin: 0,
  cycle: 0,
  stepSeconds: 0,
  fill: (_name, _lap, args, fuel = 0) => {
    const [k, n, phase] = [Number(args.k), Number(args.n), Number(args.phase)];
    if (n > fuel) return { refused: `${n} slots need more than its fuel, ${fuel}` };
    if (k > n) throw new Error(`k ${k} > n ${n}`);
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

describe('a braid fill refuses (decision 085 §8, #747, #748)', () => {
  const piece = (from: string) => `${from}\n&v s=sine loop=C4\n&tune step=1 0 4 7\n&out map=sample [&tune * &v * .3]`;
  const warnings = (r: ReturnType<typeof compileSource>) => r.diagnostics.map((d) => `${d.severity} ${d.span.line}: ${d.message}`);

  it('past its fuel: a warning on the from line, the same on every run, and the rest of the piece plays', () => {
    const text = piece('&scale from necklace(n=100) 7');
    const r = compileSource(text, undefined, options);
    expect(warnings(r)).toEqual(['warning 1: "necklace" refused: 100 slots need more than its fuel, 64']);
    expect(warnings(compileSource(text, undefined, options))).toEqual(warnings(r));
    expect(r.ok).toBe(true);
    // (the fill plays nothing: unanswered, its marker kept; the tune plays)
    expect(r.cells.get('scale')?.fill?.fragment).toBe('necklace');
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 2).length).toBeGreaterThan(0);
  });

  it('the core writes no braid for a refused fill', () => {
    const core = toCore('&scale from necklace(n=100) 7', { ...options, interface: ['&scale'] }).source;
    expect(core).not.toMatch(/scan\(|\d \d/);
    expect(core).toMatch(/&scale fill\(necklace, places/);
  });

  it('a braid fill must declare its fuel: one that doesn’t refuses', () => {
    const unfuelled: PluginFragment = { ...necklace, fills: { places: {} } };
    const r = compileSource(piece('&scale from necklace 7'), undefined, { resolve, plugins: [unfuelled] });
    expect(warnings(r)).toEqual(['warning 1: "necklace" refused: its fill places declares no fuel, and a braid fill must (decision 085 §8)']);
  });

  it('a thrown error is no refusal: a bug in its code, an error on the from line', () => {
    const r = compileSource(piece('&scale from necklace(n=4) 7'), undefined, options);
    expect(warnings(r)).toEqual(['error 1: "necklace"\'s code failed on its fill places: k 7 > n 4']);
  });

  it('from a fragment that takes it: the warning on the piece’s from line, saying where', () => {
    const resolveBoth = (id: string) => (id === 'modes' ? '&key from &tonic\n&key from necklace(n=100) 7' : resolve(id));
    // (an argument by reference is 6d's, #749: its core; a number here)
    const r = compileSource(piece('&k from modes C'), undefined, { resolve: resolveBoth, plugins: [necklace] });
    expect(warnings(r).filter((w) => w.includes('refused'))).toEqual(['warning 1: "necklace" refused: 100 slots need more than its fuel, 64 (in "modes")']);
  });
});

describe('a call site’s fills are asked in its manifest’s order (decision 085 §8.1, #747)', () => {
  // (a solver: one search answers both voices; it keeps its last answer and gives the second from it)
  const asked: string[] = [];
  let searches = 0;
  let kept: { key: string; upper: string; lower: string } | null = null;
  const solver: PluginFragment = {
    id: 'twovoices',
    fragment: 'twovoices',
    fills: { upper: { fuel: 1 }, lower: { fuel: 1 } },
    origin: 0,
    cycle: 0,
    stepSeconds: 0,
    fill: (name, _lap, args) => {
      asked.push(name);
      const key = JSON.stringify(args);
      if (kept?.key !== key) {
        searches++;
        kept = { key, upper: '7 9 11', lower: '0 2 4' };
      }
      return name === 'upper' ? kept.upper : kept.lower;
    },
  };
  // (the fragment writes its lower voice first, its manifest names its upper first)
  const TWO = '&upper, &lower from &subject\n&lower fill()\n&upper fill()';
  const resolveTwo = (id: string) => (id === 'twovoices' ? TWO : null);

  it('in the manifest’s order, whatever order the fragment writes its fills in; one search answers both', () => {
    const r = compileSource('&upper, &lower from twovoices 0 2 4', undefined, { resolve: resolveTwo, plugins: [solver] });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(asked).toEqual(['upper', 'lower']);
    expect(searches).toBe(1);
    // (and each answer in its own line, as the fragment wrote them)
    expect(r.cells.get('upper')?.fill).toBeUndefined();
    expect(r.cells.get('upper')?.units).toHaveLength(3);
    expect(r.cells.get('lower')?.units).toHaveLength(3);
  });
});
