// Normalise's order and the structure measure (#632 rung 4, decision 083). Every example with its `from` lines written in
// is a text Normalise and Shorten have work on: Normalise takes it back towards the example, Shorten makes it smaller.
//
// - **Confluence (L15):** Normalise's rewrites, taken in any order, reach one text. Checked in Normalise's own order and
//   in ORDERS seeded orders (each round's rewrites shuffled; `rewriteAll` still checks each by S1). It holds for every
//   example since #729, where twelve reached two texts or more: an inline cell named inside a line that is the
//   library's, an argument written for a cell the library then gave, and a template taking its line before a clock was
//   folded and the tempo named. ORDERS is 4: 3 found all twelve, and 20, run once over every example (2026-11-11,
//   331 s), found no more.
// - **The measure never grows (L16):** no step Normalise or Shorten takes raises the structure measure as written (decision
//   049, `structureOf(…, { asWritten: true })`; over the normal form, Normalise's steps are all one text's measure). But a
//   rule that names the interface, which writes the named cell (`&tempo step=60bpm` out of `&bar … step=60bpm`): a cell
//   and a reference more, for a name a frontend reads. The core isn't held to it: it writes the sugar out (decision 069),
//   and grows 70 of the 89 examples.
import { describe, expect, it } from 'vitest';
import { FAMILIES } from './core';
import { EXAMPLES } from './examples';
import { structureOf } from './measure';
import { normalisations } from './normalise';
import { rewriteAll, ROUNDS, type Find } from './rewrite';
import { shortenAll } from './shorten';
import { LIBRARY, resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed, library: LIBRARY };
// (as `normalise` runs: a retired form read the old way)
const OLD = { ...O };
const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;
const ORDERS = 4;
const source = (key: string) => written(EXAMPLES[key as keyof typeof EXAMPLES].source, { resolve: resolveSeed });
const KEYS = Object.keys(EXAMPLES);

/** A seeded generator of numbers in [0, 1). */
const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

/** Normalise with each round's rewrites in an order drawn from `seed`; none, its own order. */
function normalised(text: string, seed?: number): string {
  const find = normalisations(OLD);
  if (seed === undefined) return rewriteAll(text, find, ROUNDS, OLD).source;
  const next = random(seed);
  const shuffled: Find = (s, r) => {
    const all = [...find(s, r)];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [all[i], all[j]] = [all[j]!, all[i]!];
    }
    return all;
  };
  return rewriteAll(text, shuffled, ROUNDS, OLD).source;
}

/** The texts Normalise reaches from `text`: its own order's, and each seeded order's. */
const reached = (key: string) => new Set([normalised(source(key)), ...Array.from({ length: ORDERS }, (_, i) => normalised(source(key), 7919 * (i + 1) + key.length))]);

/**
 * Where Normalise's order decides its text: none since #729. An example it doesn't hold for is a bug against the law,
 * listed here by name with its issue, and its test fails once it holds, so the list only shrinks (decision 083).
 */
const NOT_CONFLUENT: Record<string, string> = {};

// law L15
describe('Normalise is confluent: its rewrites, in any order, reach one text (#632 rung 4)', () => {
  it.each(KEYS.filter((k) => !(k in NOT_CONFLUENT)))('%s', (key) => {
    expect(reached(key).size).toBe(1);
  });

  it('lists no example against it', () => {
    for (const key of Object.keys(NOT_CONFLUENT)) expect(reached(key).size, key).toBeGreaterThan(1);
    expect(Object.keys(NOT_CONFLUENT)).toEqual([]);
  });

  it('is shown firing: a rule that names one inline cell or another by the order it is offered in reaches two texts', () => {
    // (two rewrites of one place, neither seeing the other: the order they are tried in is the text)
    const text = '&a step=2 0 2 4';
    const first: Find = () => [
      { id: 'x', tool: 'normalise', rule: 'aliases', title: 'x', before: '', after: '', apply: (s) => s.replace('0 2 4', '0 2 4 5'), exact: true },
      { id: 'y', tool: 'normalise', rule: 'aliases', title: 'y', before: '', after: '', apply: (s) => s.replace('0 2 4', '0 2 4 7'), exact: true },
    ];
    const second: Find = (s, r) => [...first(s, r)].reverse();
    expect(rewriteAll(text, first, 1).source).not.toBe(rewriteAll(text, second, 1).source);
  });
});

/** The rules that may raise the measure, each with why: naming the interface writes the named cell. */
const NAMES_A_CELL = new Set(['tempo']);

const measure = (text: string) => structureOf(text, { asWritten: true, resolve: resolveSeed }).total;

/** The steps Normalise takes from `text` in its own order: each text it moved from, to, and the rule that moved it. */
function normaliseSteps(text: string): { from: string; to: string; rule: string }[] {
  const find = normalisations(OLD);
  const seen: string[] = [];
  const kinds = new Map<string, Map<string, string>>();
  const recording: Find = (s, r) => {
    seen.push(s);
    const rewrites = find(s, r);
    kinds.set(
      s,
      new Map(
        rewrites.flatMap((w) => {
          try {
            return [[w.apply(s), w.rule] as const];
          } catch {
            return [];
          }
        }),
      ),
    );
    return rewrites;
  };
  const end = rewriteAll(text, recording, ROUNDS, OLD).source;
  const path = [...seen.filter((s, i) => s !== seen[i - 1]), end].filter((s, i, all) => s !== all[i - 1]);
  return path.slice(1).map((to, i) => ({ from: path[i]!, to, rule: kinds.get(path[i]!)?.get(to) ?? '?' }));
}

// law L16
describe('the structure measure never grows: no step of Normalise or Shorten raises it (#632 rung 4)', () => {
  it.each(KEYS)('Normalise: %s', (key) => {
    const grew = normaliseSteps(source(key)).flatMap((s) => {
      const d = measure(s.to) - measure(s.from);
      return d > 0 && !NAMES_A_CELL.has(s.rule) ? [`${s.rule} +${d}`] : [];
    });
    expect(grew).toEqual([]);
  });

  it('Normalise’s naming of the tempo is what grows, where it does: breve’s &tempo, a cell and a reference', () => {
    // (breve's bar written as bar's template writes it, meter("2/2"), a text: its own meter("2/2", 2) is no template's line, decision 103)
    const steps = normaliseSteps(source('breve').replace('meter("2/2", 2)', 'meter("2/2")')).filter((s) => measure(s.to) > measure(s.from));
    expect(steps.map((s) => [s.rule, measure(s.to) - measure(s.from)])).toEqual([['tempo', 2]]);
  });

  it.each(KEYS)('Shorten: %s', (key) => {
    const text = source(key);
    const { source: shortened, steps } = shortenAll(text, 60, O);
    // (each step says what it saved: structure, or characters at the same structure)
    expect(steps.filter((s) => !/^−\d+( characters)?: /.test(s))).toEqual([]);
    expect(measure(shortened)).toBeLessThanOrEqual(measure(text));
  });
});
