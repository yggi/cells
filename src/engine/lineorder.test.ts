// Law L19 (decision 089, #757): the order of a piece's lines is irrelevant. Every example, its lines shuffled, compiles
// and plays what it played (S1). A line is a logical one: a line that ends in `,` `[` `+` or `*` goes on with the next,
// and a comment or a blank line travels with the line after it. Three orders each, seeded, so a failure names its seed.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { splitComment } from './edit';
import { EXAMPLES } from './examples';
import { soundsIdentical } from './sameness';
import { resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed };
const SEEDS = [1, 2, 3];

/** A text's logical lines, each with the comments and blank lines above it. */
function units(source: string): string[] {
  const out: string[] = [];
  let now: string[] = [];
  for (const line of source.split('\n')) {
    now.push(line);
    const code = splitComment(line)[0].trimEnd();
    if (code.trim() === '' || /[,[+*]$/.test(code)) continue;
    out.push(now.join('\n'));
    now = [];
  }
  if (now.length) out.push(now.join('\n'));
  return out;
}

/** The lines in another order: a seeded shuffle (a linear congruential draw a line, sorted by it). */
function shuffled(lines: readonly string[], seed: number): string[] {
  let s = seed;
  const draw = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  return lines
    .map((line) => [draw(), line] as const)
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
}

describe('law L19: the order of a piece’s lines is irrelevant (decision 089)', () => {
  it('shuffles: most examples’ lines come out in another order', () => {
    const moved = Object.values(EXAMPLES).filter((p) => shuffled(units(p.source), 1).join('\n') !== p.source).length;
    expect(moved).toBeGreaterThanOrEqual(85);
  });

  // law L19
  it.each(Object.entries(EXAMPLES))('%s plays the same in three other orders of its lines', (key, p) => {
    for (const seed of SEEDS) {
      const text = shuffled(units(p.source), seed).join('\n');
      expect(
        compileSource(text, undefined, O).diagnostics.filter((d) => d.severity === 'error'),
        `${key}, seed ${seed}`,
      ).toEqual([]);
      expect(soundsIdentical(p.source, text, undefined, O), `${key}, seed ${seed}`).toBe(true);
    }
  });

  it('is shown firing: the old way, two meters and a bare tap, played by the order of the meters’ lines', () => {
    const meters = ['&waltz meter("3/4") step=60bpm', '&march meter("4/4") step=120bpm'];
    const rest = ['&lead s=saw loop=C4', '&t step=4n 0 2 4 5', '&out map=sample [&t * &lead]'];
    const a = [...meters, ...rest].join('\n');
    const b = [...meters.reverse(), ...rest].join('\n');
    expect(soundsIdentical(a, b, undefined, { old: true })).toBe(false);
    // (as the language reads them now, neither compiles: the tap names no meter)
    expect(compileSource(a).ok).toBe(false);
    expect(compileSource(b).ok).toBe(false);
  });
});
