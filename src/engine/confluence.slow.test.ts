// Normalise's order and the structure measure (#632 rung 4, decision 083). Every example with its `from` lines written in
// is a text Normalise and Shorten have work on: Normalise takes it back towards the example, Shorten makes it smaller.
//
// - **Confluence (L15):** Normalise's rewrites, taken in any order, reach one text. Checked in Normalise's own order and
//   in ORDERS seeded orders (each round's rewrites shuffled; `rewriteAll` still checks each by S1). It doesn't hold in
//   twelve examples, four critical pairs between the library's rules and the meter's (#729): each is listed by name, and
//   its test fails once it holds, so the list only shrinks. ORDERS is 4: 3 found all twelve, and 20, run once over every
//   example (2026-11-11, 331 s), found no more.
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
const OLD = { ...O, old: true };
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

/** Where Normalise's order decides its text (#729): each example, by the critical pair it meets. */
const NOT_CONFLUENT: Record<string, string> = {
  drums: 'library × library: an envelope named first, the kit no longer gm_kit’s word for word',
  swing: 'library × library, arguments × library',
  breve: 'library × meter, library × tempo: the template takes the meter before the tempo is named',
  'midi-out': 'library × library',
  funk: 'library × library, arguments × library',
  twelve: 'library × library',
  aksak: 'library × library',
  sailor: 'library × library',
  electroswing: 'library × library',
  spooky: 'library × library',
  kinderlied: 'library × library',
  radio: 'library × library, arguments × library',
};

// law L15
describe('Normalise is confluent: its rewrites, in any order, reach one text (#632 rung 4)', () => {
  it.each(KEYS.filter((k) => !(k in NOT_CONFLUENT)))('%s', (key) => {
    expect(reached(key).size).toBe(1);
  });

  it.each(Object.keys(NOT_CONFLUENT))('%s is listed against #729, and reaches more than one text', (key) => {
    expect(reached(key).size).toBeGreaterThan(1);
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
    const steps = normaliseSteps(source('breve')).filter((s) => measure(s.to) > measure(s.from));
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
