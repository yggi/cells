// The learned layer (#145, decision 048): merged with the seed at each query and never stored, so an empty one changes no
// query and two repositories answer alike; filing (a point at the query's point, weight 0.1, `source` and `created`, a
// file); identity after renaming; use moving an association (the point that finds a fragment raised, to 1.2).
import { describe, expect, it } from 'vitest';
import { renameCell } from '../engine/edit';
import { chanceOf } from '../engine/realize';
import { readFragment, writeFragment } from './files';
import { createRepository, EMPTY_LAYER, layerProblems, type Fragment, type LearnedLayer, type QueryOptions, type StylePoint } from './fragments';
import { canonicalText, FILING_WEIGHT, fileFragment, sameText, USE_CAP, USE_STEP, usedTogether, useFragments, type Filing } from './learned';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';

const library = createRepository(LIBRARY);
const PRESETS = [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ];
const AXES = ['sync', 'harm', 'artic', 'energy'] as const;

/** n points on the four axes, each drawn by `chanceOf` on its index: the same points every run. */
const drawn = (n: number, tag: string): StylePoint[] =>
  Array.from({ length: n }, (_, i) => Object.fromEntries(AXES.map((axis) => [axis, Math.round(chanceOf(`${tag}|${i}|${axis}`) * 1e6) / 1e6])));

const ranked = (found: ReturnType<typeof library.query>) => found.map((f) => [f.fragment.id, f.distance, f.score]);

/** A deep copy, frozen all the way down: a function that changed it would throw. */
const frozen = <T>(value: T): T => {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (v: unknown) => {
    if (typeof v === 'object' && v !== null) {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(copy);
  return copy;
};

const filing = (point: StylePoint, more: Partial<Filing> = {}): Filing => ({
  text: '&bar meter("9/8")',
  point,
  facet: 'meter',
  source: 'composer',
  created: '2026-10-18T21:04:00Z',
  ...more,
});

describe('an empty layer', () => {
  const POINTS = drawn(1_000, 'empty');
  const options: QueryOptions[] = [{}, { facet: 'meter' }, { facet: 'rhythm', chosen: ['4/4'] }, { chosen: ['Funk drums', '4/4 leaning on 16n'] }];

  it('changes no query: over 1,000 points, each query handed it ranks as the seed’s alone', () => {
    expect(POINTS).toHaveLength(1_000);
    for (const [i, point] of POINTS.entries()) {
      const o = options[i % options.length]!;
      expect(ranked(library.query(point, 26, {}, { ...o, layer: EMPTY_LAYER })), JSON.stringify(point)).toEqual(ranked(library.query(point, 26, {}, o)));
      expect(ranked(library.query(point, 26, {}, { ...o, layer: { filed: [], points: [], together: [] } }))).toEqual(ranked(library.query(point, 26, {}, o)));
    }
  });

  it('merges to the seed itself', () => {
    expect(library.merge(EMPTY_LAYER).fragments).toBe(library.fragments);
  });

  // (Jambot's meter query: `createRepository(METER_FRAGMENTS).query(point)`, no options, yggi/jambot packages/engine/src/repository.ts)
  it('leaves Jambot’s meter query as it is, and so does a layer that learned only rhythms', () => {
    const meters = createRepository(METER_FRAGMENTS);
    const onRhythms = useFragments(library, EMPTY_LAYER, [
      { id: 'Funk drums', point: FUNK, facet: 'rhythm' },
      { id: 'son clave 3-2', point: BOSSA_NOVA, facet: 'rhythm' },
    ]);
    for (const point of [...PRESETS, ...POINTS.slice(0, 200)]) {
      expect(ranked(meters.query(point, 13, {}, { layer: EMPTY_LAYER }))).toEqual(ranked(meters.query(point, 13)));
      expect(ranked(library.query(point, 13, {}, { facet: 'meter', layer: onRhythms }))).toEqual(ranked(meters.query(point, 13)));
    }
  });
});

// The pull a query option (#151): at 0 it ranks as a query with nothing chosen, and with nothing chosen no pull changes
// anything, so Jambot's meter query, which chooses nothing, ranks as it did.
describe('the pull', () => {
  const POINTS = drawn(1_000, 'pull');
  const ids = LIBRARY.map((f) => f.id);
  const pick = (tag: string) => ids[Math.floor(chanceOf(tag) * ids.length)]!;
  // (a layer that has learned: every pair of the library used together, 1 to 500 times, drawn; and a jam's points and filings)
  const together = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => ({ ids: [a, b].sort() as [string, string], count: 1 + Math.floor(chanceOf(`count|${a}|${b}`) * 500) })));
  let layer: LearnedLayer = fileFragment(library, EMPTY_LAYER, filing(AMBIENT)).layer;
  layer = useFragments(library, layer, [
    { id: '4/4 swung on 8n', point: LO_FI, facet: 'meter' },
    { id: 'Lo-fi hip hop drums', point: LO_FI, facet: 'rhythm' },
  ]);
  layer = { ...layer, together: [...together, ...layer.together.filter((p) => p.ids.includes('composer 2026-10-18T21:04:00Z'))] };
  const facets = [undefined, 'meter', 'rhythm'] as const;
  const optionsAt = (i: number): QueryOptions => {
    const facet = facets[i % 3];
    return { ...(facet ? { facet } : {}), layer, chosen: Array.from({ length: 1 + (i % 3) }, (_, j) => pick(`chosen|${i}|${j}`)) };
  };

  // (in quarters too, each its own test, for the same reason as below)
  it.each([0, 250, 500, 750])('at 0, ranks as a query with nothing chosen: over 1,000 points, 250 from %i, with a layer that counts every pair', (from) => {
    expect(POINTS).toHaveLength(1_000);
    let moved = 0;
    for (const [i, point] of POINTS.entries()) {
      if (i < from || i >= from + 250) continue;
      const { chosen, ...unchosen } = optionsAt(i);
      const none = ranked(library.query(point, 27, {}, unchosen));
      expect(ranked(library.query(point, 27, {}, { ...unchosen, chosen, pull: 0 })), JSON.stringify(point)).toEqual(none);
      if (JSON.stringify(ranked(library.query(point, 27, {}, { ...unchosen, chosen }))) !== JSON.stringify(none)) moved++;
    }
    // (and the default pull, over the same, does move them: the 0 is what holds)
    expect(moved).toBeGreaterThan(225);
  });

  // (the 1,000 points in quarters, each its own test: a query merges a layer that counts every pair of the library, so
  // its cost grows with the square of the library's size)
  it.each([0, 250, 500, 750])('with nothing chosen, no pull changes a query: over 1,000 points, 250 from %i', (from) => {
    for (const [i, point] of POINTS.entries()) {
      if (i < from || i >= from + 250) continue;
      const { chosen: _, ...unchosen } = optionsAt(i);
      const asked = ranked(library.query(point, 27, {}, unchosen));
      for (const pull of [0, 0.5, 10]) expect(ranked(library.query(point, 27, {}, { ...unchosen, pull })), `${JSON.stringify(point)} pull ${pull}`).toEqual(asked);
      expect(ranked(library.query(point, 27, {}, { ...unchosen, chosen: [] }))).toEqual(asked);
    }
  });
});

describe('filing', () => {
  it('a filed fragment is found first at its point, at distance 0: at 200 points, and at each preset’s, where a seed fragment sits at 0 too', () => {
    for (const point of [...drawn(200, 'filed'), ...PRESETS]) {
      const { layer, id } = fileFragment(library, EMPTY_LAYER, filing(point));
      const [first] = library.query(point, 1, {}, { facet: 'meter', layer });
      expect([first!.fragment.id, first!.distance]).toEqual([id, 0]);
    }
  });

  it('gives it one point, at the query’s point, of weight 0.1, its facet, and `source` and `created`', () => {
    const { layer, id, file, renamed } = fileFragment(library, EMPTY_LAYER, filing(FUNK, { meta: { tags: ['maker faire'] }, prose: 'Made on a miss.' }));
    expect(FILING_WEIGHT).toBe(0.1);
    expect(id).toBe('composer 2026-10-18T21:04:00Z');
    expect(file).toEqual({
      fragment: { id, text: '&bar meter("9/8")', association: [{ point: FUNK, weight: 0.1, facet: 'meter' }] },
      meta: { source: 'composer', created: '2026-10-18T21:04:00Z', tags: ['maker faire'] },
      prose: 'Made on a miss.',
    });
    expect(layer.filed).toEqual([file]);
    expect(renamed.size).toBe(0);
  });

  it('is found only near its point: a tenth of the distance to the nearest seed fragment', () => {
    const point = { sync: 0.95, harm: 0.95, artic: 0.05, energy: 0.05 };
    const seedFirst = library.query(point, 1, {}, { facet: 'meter' })[0]!;
    const { layer } = fileFragment(library, EMPTY_LAYER, filing(point));
    const off = (d: number) => ({ ...point, energy: point.energy + d * 2 });
    expect(library.query(off(seedFirst.distance * 0.05), 1, {}, { facet: 'meter', layer })[0]!.fragment.text).toBe('&bar meter("9/8")');
    expect(library.query(off(seedFirst.distance * 0.2), 1, {}, { facet: 'meter', layer })[0]!.fragment.id).toBe(seedFirst.fragment.id);
  });

  it('writes a file that reads back as the fragment filed', () => {
    const { file } = fileFragment(library, EMPTY_LAYER, filing(LO_FI, { meta: { heard: '2026-10-18T21:05:00Z' } }));
    const text = writeFragment(file!);
    expect(text).toContain('source: composer\ncreated: "2026-10-18T21:04:00Z"');
    expect(readFragment(text)).toEqual({ ...file, layout: expect.anything() });
  });

  it('names a second filing at the same time apart, and refuses an id that is taken', () => {
    const first = fileFragment(library, EMPTY_LAYER, filing(FUNK));
    const second = fileFragment(library, first.layer, filing(FUNK, { text: '&bar meter("11/8")' }));
    expect(second.id).toBe('composer 2026-10-18T21:04:00Z 2');
    expect(() => fileFragment(library, EMPTY_LAYER, filing(FUNK, { id: '4/4' }))).toThrow(/the id 4\/4 is taken/);
    expect(fileFragment(library, EMPTY_LAYER, filing(FUNK, { id: 'nine eighths' })).id).toBe('nine eighths');
  });

  it('refuses a filing with no text, source or created, a malformed point, or metadata the file writes itself', () => {
    expect(() => fileFragment(library, EMPTY_LAYER, filing(FUNK, { text: ' ' }))).toThrow(/no text/);
    expect(() => fileFragment(library, EMPTY_LAYER, filing(FUNK, { source: '' }))).toThrow(/no source/);
    expect(() => fileFragment(library, EMPTY_LAYER, filing(FUNK, { created: '' }))).toThrow(/no created/);
    expect(() => fileFragment(library, EMPTY_LAYER, filing({ sync: NaN }))).toThrow(/sync is NaN/);
    expect(() => fileFragment(library, EMPTY_LAYER, filing(FUNK, { meta: { source: 'muse' } }))).toThrow(/meta names source/);
  });
});

describe('identity, until the hash', () => {
  const son = LIBRARY.find((f) => f.id === 'son clave 3-2')!;

  it('a text is the same as another after renaming its own names, with comments and spacing aside', () => {
    // (`&claves` is a hole, no cell of the text's own: a name an instrument gives, which a rename leaves)
    const renamedSon = renameCell(renameCell(son.text, 'clave', 'cl'), 'percussion', 'perc');
    expect(renamedSon).not.toBe(son.text);
    expect(sameText(renamedSon, son.text)).toEqual(
      new Map([
        ['&cl', '&clave'],
        ['&perc', '&percussion'],
      ]),
    );
    expect(sameText(`${son.text.replace(' &claves', '   &claves')} // the son`, son.text)?.size).toBe(0);
    expect(canonicalText(son.text)).toBe(['&#1 step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!3 &claves ~!7', '&#2 [&#1 * .5]'].join('\n'));
  });

  it('but not one that differs, nor one that renames an interface name or a name it uses and doesn’t define', () => {
    expect(sameText(son.text.replace('~!3', '~!4'), son.text)).toBeNull();
    expect(sameText('&b meter("3/4")', '&bar meter("3/4")')).toBeNull();
    expect(sameText('&x step=16n &harm', '&x step=16n &chord')).toBeNull();
    expect(sameText('&a step=16n 0 2\n&b step=16n 4', '&b step=16n 4\n&a step=16n 0 2')).toBeNull();
  });

  it('a filed text held already adds a point to the fragment that holds it, not a second fragment', () => {
    const point = { sync: 0.2, harm: 0.2, artic: 0.9, energy: 0.2 };
    const text = renameCell(son.text, 'clave', 'cl');
    const { layer, id, file, renamed } = fileFragment(library, EMPTY_LAYER, { text, point, facet: 'rhythm', source: 'muse', created: '2026-10-18T22:00:00Z' });
    expect([id, file, [...renamed]]).toEqual(['son clave 3-2', null, [['&cl', '&clave']]]);
    expect(layer).toEqual({ filed: [], points: [{ id: 'son clave 3-2', point: son.association[0]!.point, weight: 1.1, facet: 'rhythm' }], together: [] });
  });

  it('and so does a text the layer filed itself', () => {
    const first = fileFragment(library, EMPTY_LAYER, filing(FUNK));
    const again = fileFragment(library, first.layer, filing({ ...FUNK, energy: 0.7 }, { text: '&bar  meter("9/8") // nine', source: 'muse', created: 'later' }));
    expect([again.id, again.file]).toEqual([first.id, null]);
    expect(again.layer.filed).toHaveLength(1);
    expect(again.layer.filed[0]!.fragment.association).toEqual([{ point: FUNK, weight: 0.2, facet: 'meter' }]);
  });
});

describe('use moves an association', () => {
  const at = (id: string, x: number, weight = 1): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x }, weight, facet: 'meter' }] });
  const r = createRepository([at('a', 0), at('b', 1)]);

  it('raises the seed point that finds it by 0.1, as a point of the layer at its place, to 1.2 at most', () => {
    expect([USE_STEP, USE_CAP]).toEqual([0.1, 1.2]);
    let layer = EMPTY_LAYER;
    const weights: number[] = [];
    for (let n = 0; n < 4; n++) {
      layer = useFragments(r, layer, [{ id: 'a', point: { x: 0.4 }, facet: 'meter' }]);
      weights.push(...layer.points.map((p) => p.weight));
    }
    expect(weights).toEqual([1.1, 1.2, 1.2, 1.2]);
    expect(layer.points).toEqual([{ id: 'a', point: { x: 0 }, weight: 1.2, facet: 'meter' }]);
    expect(useFragments(r, layer, [{ id: 'a', point: { x: 0.4 }, facet: 'meter' }])).toBe(layer);
  });

  it('so it is found there more readily: a query between two fragments turns to the one used', () => {
    const point = { x: 0.52 };
    expect(r.query(point, 1)[0]!.fragment.id).toBe('b');
    const layer = useFragments(r, EMPTY_LAYER, [{ id: 'a', point: { x: 0.45 }, facet: 'meter' }]);
    const [first] = r.query(point, 1, {}, { layer });
    expect([first!.fragment.id, first!.distance]).toEqual(['a', 0.52 / 1.1]);
  });

  it('but never past a seed point by more than the cap: a fragment more than 1.2 times as far stays behind', () => {
    let layer = EMPTY_LAYER;
    for (let n = 0; n < 50; n++) layer = useFragments(r, layer, [{ id: 'a', point: { x: 0.3 }, facet: 'meter' }]);
    expect(r.query({ x: 0.54 }, 1, {}, { layer })[0]!.fragment.id).toBe('a'); // (0.54 / 0.46 ≈ 1.17)
    expect(r.query({ x: 0.55 }, 1, {}, { layer })[0]!.fragment.id).toBe('b'); // (0.55 / 0.45 ≈ 1.22)
  });

  it('raises a filed fragment’s own point in place, so its file carries its whole association', () => {
    const filed = fileFragment(r, EMPTY_LAYER, filing({ x: 0.5 }));
    const layer = useFragments(r, filed.layer, [{ id: filed.id, point: { x: 0.51 }, facet: 'meter' }]);
    expect(layer.points).toEqual([]);
    expect(layer.filed[0]!.fragment.association).toEqual([{ point: { x: 0.5 }, weight: 0.2, facet: 'meter' }]);
  });

  it('adds a point at the use’s place where the fragment has none of that facet', () => {
    const layer = useFragments(r, EMPTY_LAYER, [{ id: 'a', point: { x: 0.3 }, facet: 'rhythm' }]);
    expect(layer.points).toEqual([{ id: 'a', point: { x: 0.3 }, weight: 0.1, facet: 'rhythm' }]);
  });

  it('a use that names no point counts toward use together and moves nothing', () => {
    const layer = useFragments(r, EMPTY_LAYER, [{ id: 'a' }, { id: 'b', facet: 'meter' }]);
    expect(layer).toEqual({ filed: [], points: [], together: [{ ids: ['a', 'b'], count: 1 }] });
    expect(usedTogether(layer, 'b', 'a')).toBe(1);
  });
});

describe('cells stateless', () => {
  const POINTS = drawn(300, 'stateless');
  const learned = (): LearnedLayer => {
    let layer = fileFragment(library, EMPTY_LAYER, filing(AMBIENT)).layer;
    layer = fileFragment(library, layer, { text: '&perc step=16n euclid(5,16)', point: FUNK, facet: 'rhythm', source: 'muse', created: 't1' }).layer;
    layer = useFragments(library, layer, [
      { id: '4/4 swung on 8n', point: LO_FI, facet: 'meter' },
      { id: 'Lo-fi hip hop drums', point: LO_FI, facet: 'rhythm' },
    ]);
    return useFragments(library, layer, [
      { id: '3/4', point: SWING_JAZZ, facet: 'meter' },
      { id: 'muse t1', point: { ...FUNK, sync: 0.9 }, facet: 'rhythm' },
    ]);
  };
  const ask = (repository: typeof library, layer: LearnedLayer) =>
    POINTS.map((point, i) => ranked(repository.query(point, 5, {}, { facet: i % 2 ? 'rhythm' : 'meter', chosen: ['4/4 swung on 8n'], layer })));

  it('two repositories built from the same seed and handed the same layer answer alike', () => {
    expect(ask(createRepository(LIBRARY), learned())).toEqual(ask(createRepository(LIBRARY), learned()));
  });

  it('a repository keeps nothing of a layer it was handed: asked with another between, it answers as before', () => {
    const repository = createRepository(LIBRARY);
    const before = ask(repository, learned());
    ask(repository, EMPTY_LAYER);
    ask(repository, useFragments(repository, learned(), [{ id: '4/4', point: AMBIENT, facet: 'meter' }]));
    expect(ask(repository, learned())).toEqual(before);
    expect(ask(repository, EMPTY_LAYER)).toEqual(ask(createRepository(LIBRARY), EMPTY_LAYER));
  });

  it('filing and use return a new layer and never change the one they were given', () => {
    const layer = frozen(learned());
    const copy = JSON.stringify(layer);
    fileFragment(library, layer, filing(TECHNO, { text: '&bar meter("5/8")' }));
    fileFragment(library, layer, filing(TECHNO, { text: '&bar meter("3/4")' }));
    useFragments(library, layer, [
      { id: 'composer 2026-10-18T21:04:00Z', point: AMBIENT, facet: 'meter' },
      { id: 'Techno drums', point: TECHNO, facet: 'rhythm' },
    ]);
    expect(JSON.stringify(layer)).toBe(copy);
  });

  it('the layer is plain data: read back from JSON, it answers alike', () => {
    const layer = learned();
    expect(ask(library, JSON.parse(JSON.stringify(layer)) as LearnedLayer)).toEqual(ask(library, layer));
  });
});

describe('a malformed layer', () => {
  const file = fileFragment(library, EMPTY_LAYER, filing(FUNK)).file!;
  const malformed: [string, unknown, RegExp][] = [
    ['filed not a list', { ...EMPTY_LAYER, filed: {} }, /filed is not a list/],
    ['a filed fragment with no text', { ...EMPTY_LAYER, filed: [{ ...file, fragment: { ...file.fragment, text: '' } }] }, /filed 1: .*no text/],
    ['an id filed twice', { ...EMPTY_LAYER, filed: [file, file] }, /filed twice/],
    ['a point with no id', { ...EMPTY_LAYER, points: [{ point: { x: 0 }, weight: 1 }] }, /learned point 1: no id/],
    ['a point of weight 0', { ...EMPTY_LAYER, points: [{ id: '4/4', point: { x: 0 }, weight: 0 }] }, /learned point 1: weight 0/],
    ['a pair out of order', { ...EMPTY_LAYER, together: [{ ids: ['b', 'a'], count: 1 }] }, /not two, in order/],
    ['a pair of one', { ...EMPTY_LAYER, together: [{ ids: ['a', 'a'], count: 1 }] }, /not two, in order/],
    ['a count that is no whole number', { ...EMPTY_LAYER, together: [{ ids: ['a', 'b'], count: 1.5 }] }, /count 1.5/],
    [
      'a pair counted twice',
      {
        ...EMPTY_LAYER,
        together: [
          { ids: ['a', 'b'], count: 1 },
          { ids: ['a', 'b'], count: 2 },
        ],
      },
      /counted twice/,
    ],
  ];
  it.each(malformed)('%s', (_, layer, message) => {
    expect(layerProblems(layer as LearnedLayer).join('; ')).toMatch(message);
    expect(() => library.query(FUNK, 1, {}, { layer: layer as LearnedLayer })).toThrow(/A malformed learned layer/);
  });

  it('one that files a seed fragment’s id', () => {
    const layer = { ...EMPTY_LAYER, filed: [{ ...file, fragment: { ...file.fragment, id: '4/4' } }] };
    expect(layerProblems(layer)).toEqual([]);
    expect(() => library.merge(layer)).toThrow(/files 4\/4, a seed fragment's id/);
  });

  it('a point or a pair naming a fragment nobody holds is left out, and named', () => {
    const layer: LearnedLayer = { ...EMPTY_LAYER, points: [{ id: 'gone', point: FUNK, weight: 1 }], together: [{ ids: ['4/4', 'gone'], count: 3 }] };
    expect(library.merge(layer).unheld).toEqual(['gone']);
    expect(ranked(library.query(FUNK, 26, {}, { chosen: ['4/4'], layer }))).toEqual(ranked(library.query(FUNK, 26, {}, { chosen: ['4/4'] })));
  });
});
