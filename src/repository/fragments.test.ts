// The repository's format and its query (decisions 041 and 046): a malformed entry fails, a query ranks by the weighted
// distance over the axes a point shares with each association, and ignores the axes it doesn't; it finds the facet it
// names; and how often fragments were used together with what is chosen ranks beside the distance, within its bounds: a
// count that saturates, as strongly as the query's pull (#151).
import { describe, expect, it } from 'vitest';
import {
  CO_USE_KNOWN,
  CO_USE_PULL,
  CO_USE_REACH,
  coUseScore,
  createRepository,
  EMPTY_LAYER,
  fragmentDistance,
  fragmentProblems,
  pointDistance,
  type Fragment,
  type QueryOptions,
  type StylePoint,
} from './fragments';
import { usedTogether, useFragments } from './learned';

const good: Fragment = { id: 'a', text: '&bar meter("4/4")', association: [{ point: { x: 0, y: 0 }, weight: 1 }] };

describe('a malformed entry fails', () => {
  const malformed: [string, unknown][] = [
    ['no text', { ...good, text: '' }],
    ['a blank text', { ...good, text: '  \n' }],
    ['text missing', { id: 'a', association: good.association }],
    ['a weight of 0', { ...good, association: [{ point: { x: 0 }, weight: 0 }] }],
    ['a weight below 0', { ...good, association: [{ point: { x: 0 }, weight: -1 }] }],
    ['a weight that is no number', { ...good, association: [{ point: { x: 0 }, weight: NaN }] }],
    ['a weight missing', { ...good, association: [{ point: { x: 0 } }] }],
    ['an empty point', { ...good, association: [{ point: {}, weight: 1 }] }],
    ['an empty point after a good one', { ...good, association: [...good.association, { point: {}, weight: 1 }] }],
    ['an axis that is no number', { ...good, association: [{ point: { x: Infinity }, weight: 1 }] }],
    ['no style point', { ...good, association: [] }],
    ['no id', { ...good, id: '' }],
    ['an empty facet', { ...good, association: [{ point: { x: 0 }, weight: 1, facet: ' ' }] }],
    ['a facet that is no name', { ...good, association: [{ point: { x: 0 }, weight: 1, facet: 3 }] }],
  ];
  it.each(malformed)('%s', (_, entry) => {
    expect(fragmentProblems(entry as Fragment)).not.toEqual([]);
    expect(() => createRepository([good, entry as Fragment])).toThrow(/malformed/);
  });

  it('an id given twice', () => {
    expect(() => createRepository([good, { ...good }])).toThrow(/a: the id is given twice/);
  });

  it('a well-formed entry has no problem', () => {
    expect(fragmentProblems(good)).toEqual([]);
    expect(createRepository([good]).fragments).toEqual([good]);
  });
});

describe('the distance', () => {
  it('is over the axes the two points share, a root mean square', () => {
    expect(pointDistance({ x: 0, y: 0 }, { x: 0.3, y: 0.4, z: 9 })).toBeCloseTo(Math.sqrt((0.09 + 0.16) / 2), 12);
    expect(pointDistance({ x: 0 }, { y: 1 })).toBe(Infinity);
  });

  it('weighs the axes as the query says', () => {
    expect(pointDistance({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 3 })).toBeCloseTo(Math.sqrt(3 / 4), 12);
  });

  it('is a fragment’s nearest point, divided by its weight', () => {
    const f: Fragment = {
      id: 'f',
      text: '&bar meter("3/4")',
      association: [
        { point: { x: 0 }, weight: 1 },
        { point: { x: 1 }, weight: 4 },
      ],
    };
    expect(fragmentDistance(f, { x: 0.2 })).toBeCloseTo(0.2, 12);
    expect(fragmentDistance(f, { x: 0.6 })).toBeCloseTo(0.1, 12);
  });
});

describe('a query', () => {
  const at = (id: string, x: number, more: Record<string, number> = {}): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x, ...more }, weight: 1 }] });
  const repository = createRepository([at('c', 0.5), at('a', 0), at('b', 1), at('d', 0.5)]);
  const order = (found: ReturnType<typeof repository.query>) => found.map((f) => f.fragment.id);

  it('returns the k nearest, nearest first, ties by id', () => {
    expect(order(repository.query({ x: 0.4 }, 4))).toEqual(['c', 'd', 'a', 'b']);
    expect(order(repository.query({ x: 0.9 }, 2))).toEqual(['b', 'c']);
    expect(repository.query({ x: 0.9 }, 0)).toEqual([]);
    expect(repository.query({ x: 0.9 }, 9)).toHaveLength(4);
  });

  it('ranks an axis no fragment has as if it were absent', () => {
    expect(repository.query({ x: 0.4, tempo: 120 }, 4)).toEqual(repository.query({ x: 0.4 }, 4));
  });

  it('puts a fragment that shares no axis last', () => {
    const r = createRepository([at('a', 0), { id: 'z', text: '&bar meter("3/4")', association: [{ point: { y: 0 }, weight: 1 }] }]);
    expect(r.query({ x: 9 }, 2).map((f) => [f.fragment.id, f.distance])).toEqual([
      ['a', 9],
      ['z', Infinity],
    ]);
  });

  it('weighs one axis against another', () => {
    const r = createRepository([at('near on x', 0, { y: 1 }), at('near on y', 1, { y: 0 })]);
    expect(order(r.query({ x: 0, y: 0 }, 1, { x: 4 }))).toEqual(['near on x']);
    expect(order(r.query({ x: 0, y: 0 }, 1, { y: 4 }))).toEqual(['near on y']);
  });

  it('refuses a k, an axis or a weight that is no number', () => {
    expect(() => repository.query({ x: 0 }, -1)).toThrow(/k is -1/);
    expect(() => repository.query({ x: 0 }, 1.5)).toThrow(/k is 1.5/);
    expect(() => repository.query({ x: NaN }, 1)).toThrow(/x is NaN/);
    expect(() => repository.query({ x: 0 }, 1, { x: 0 })).toThrow(/x's weight is 0/);
  });
});

describe('a facet, on each point of an association', () => {
  // (the owner's example: the bell, a rhythm associated with one music and a scale with another)
  const bell: Fragment = {
    id: 'bell',
    text: '&bell step=8n 0 ~ 0 ~ 0 0 ~ 0 ~ 0 ~ 0',
    association: [
      { point: { x: 0.9 }, weight: 1, facet: 'rhythm' },
      { point: { x: 0.1 }, weight: 1, facet: 'scale' },
    ],
  };
  const of = (id: string, x: number, facet?: string): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x }, weight: 1, ...(facet ? { facet } : {}) }] });
  const repository = createRepository([bell, of('meter', 0.5, 'meter'), of('any', 0.4)]);
  const found = (point: number, facet?: string) => repository.query({ x: point }, 9, {}, { facet }).map((f) => [f.fragment.id, Number(f.distance.toFixed(9))]);

  it('a query that names one measures each fragment over its points of that facet', () => {
    expect(found(0.2, 'rhythm')).toEqual([
      ['any', 0.2],
      ['bell', 0.7],
    ]);
    expect(found(0.2, 'scale')).toEqual([
      ['bell', 0.1],
      ['any', 0.2],
    ]);
    expect(fragmentDistance(bell, { x: 0.2 }, {}, 'rhythm')).toBeCloseTo(0.7, 12);
  });

  it('a point that names no facet counts for every facet', () => {
    for (const facet of ['meter', 'rhythm', 'scale', 'harmony']) expect(found(0.4, facet)[0]).toEqual(['any', 0]);
  });

  it('a fragment with no point of the facet named isn’t ranked; a query that names none measures every point', () => {
    expect(found(0.5, 'meter').map(([id]) => id)).toEqual(['meter', 'any']);
    expect(found(0.5, 'harmony').map(([id]) => id)).toEqual(['any']);
    expect(found(0.2)).toEqual([
      ['bell', 0.1],
      ['any', 0.2],
      ['meter', 0.3],
    ]);
    expect(fragmentDistance(bell, { x: 0.2 }, {}, 'meter')).toBe(Infinity);
  });
});

describe('used together', () => {
  const at = (id: string, x: number): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x }, weight: 1 }] });
  // (the counts live in a learned layer, decision 048: each use returns a new one)
  const fresh = (...fragments: Fragment[]) => {
    const repository = createRepository([at('chosen', 9), at('other chosen', 9), ...fragments]);
    let layer = EMPTY_LAYER;
    return {
      repository,
      used: (ids: string[]) =>
        void (layer = useFragments(
          repository,
          layer,
          ids.map((id) => ({ id })),
        )),
      usedTogether: (a: string, b: string) => usedTogether(layer, a, b),
      query: (point: StylePoint, k: number, chosen?: string[], more: QueryOptions = {}) => repository.query(point, k, {}, { chosen, layer, ...more }),
    };
  };
  type Fresh = ReturnType<typeof fresh>;
  const order = (r: Fresh, chosen: string[], point = { x: 0 }, more: QueryOptions = {}) => r.query(point, 9, chosen, more).map((f) => f.fragment.id);
  /** A repository of these fragments and a layer that counts each one's uses with 'chosen' as given, written directly. */
  const counted = (fragments: Fragment[], counts: Record<string, number>) => {
    const repository = createRepository([at('chosen', 9), ...fragments]);
    const together = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ ids: (id < 'chosen' ? [id, 'chosen'] : ['chosen', id]) as [string, string], count }));
    return (more: QueryOptions = {}) =>
      repository
        .query({ x: 0 }, 9, {}, { chosen: ['chosen'], layer: { filed: [], points: [], together }, ...more })
        .map((f) => f.fragment.id)
        .filter((id) => id !== 'chosen');
  };
  /** How far n uses pull at the default: the distance less the score. */
  const pullOf = (n: number, pull?: number) => 1 - coUseScore(1, n, pull);
  const useTimes = (r: Fresh, n: number, ...ids: string[]) => Array.from({ length: n }, () => r.used(ids));

  it('counts each pair of a use once, both ways round; a fragment with itself, never', () => {
    const r = fresh(at('a', 0), at('b', 0));
    r.used(['a', 'b', 'chosen', 'a']);
    r.used(['b', 'chosen']);
    r.used(['a']);
    expect([r.usedTogether('a', 'b'), r.usedTogether('b', 'a'), r.usedTogether('b', 'chosen'), r.usedTogether('a', 'chosen'), r.usedTogether('a', 'a')]).toEqual([1, 1, 2, 1, 0]);
    expect(r.usedTogether('a', 'nothing')).toBe(0);
  });

  it('refuses an id it doesn’t hold, and records nothing of that use', () => {
    const r = fresh(at('a', 0));
    expect(() => r.used(['a', 'nothing', 'chosen'])).toThrow(/useFragments: no fragment 'nothing'/);
    expect(r.usedTogether('a', 'chosen')).toBe(0);
  });

  it('changes nothing while nothing is chosen: the score is the distance', () => {
    const r = fresh(at('a', 0.2), at('b', 0.1));
    useTimes(r, 50, 'a', 'chosen');
    expect(r.query({ x: 0 }, 9).map((f) => [f.fragment.id, f.score === f.distance])).toEqual([
      ['b', true],
      ['a', true],
      ['chosen', true],
      ['other chosen', true],
    ]);
  });

  it('a fragment used 5 times with what is chosen outranks one at the same distance used 0 times', () => {
    const r = fresh(at('a', 0.2), at('b', 0.2));
    expect(order(r, ['chosen']).slice(0, 2)).toEqual(['a', 'b']);
    useTimes(r, 5, 'b', 'chosen');
    expect(order(r, ['chosen']).slice(0, 2)).toEqual(['b', 'a']);
    const b = r.query({ x: 0 }, 9, ['chosen'])[0]!;
    expect([b.distance, b.score]).toEqual([0.2, coUseScore(0.2, 5)]);
    expect(b.score).toBeCloseTo(0.2 - (CO_USE_PULL * CO_USE_REACH * Math.log(6)) / Math.log(11), 15);
  });

  // The saturation (#151): each doubling of uses pulls the same until a group is known, at 10 uses; past that, more add
  // nothing, so a group a long jam keeps never pulls past the reach, 0.02 at the default pull.
  it('saturates: each use pulls more up to 10, and none past it, so a known group pulls 0.02 at the default and no more', () => {
    expect([CO_USE_PULL, CO_USE_KNOWN, CO_USE_REACH]).toEqual([0.1, 10, 0.2]);
    for (let n = 1; n <= CO_USE_KNOWN; n++) expect(pullOf(n), `use ${n}`).toBeGreaterThan(pullOf(n - 1));
    for (const n of [11, 12, 20, 100, 500, 1_000_000]) expect(pullOf(n), `${n} uses`).toBe(pullOf(CO_USE_KNOWN));
    expect(pullOf(CO_USE_KNOWN)).toBeCloseTo(0.02, 15);
    expect(pullOf(1)).toBeCloseTo((0.02 * Math.log(2)) / Math.log(11), 15);
  });

  it('two fragments 0.3 apart, Jambot’s miss distance, keep their order at every count of either, a million uses included', () => {
    const counts = [0, 1, 5, 9, 10, 20, 500, 1_000_000];
    for (const near of counts) for (const far of counts) expect(counted([at('near', 0.1), at('far', 0.4)], { near, far })(), `near ${near}, far ${far}`).toEqual(['near', 'far']);
  });

  it('a known group (10 uses, not 9) takes the lead from a fragment 0.0195 nearer, and never from one more than 0.02 nearer', () => {
    expect(counted([at('near', 0.1), at('far', 0.1195)], { far: 10 })()).toEqual(['far', 'near']);
    expect(counted([at('near', 0.1), at('far', 0.1195)], { far: 9 })()).toEqual(['near', 'far']);
    expect(counted([at('near', 0.1), at('far', 0.121)], { far: 1_000_000 })()).toEqual(['near', 'far']);
  });

  it('sums the uses with every fragment chosen before it weighs them, so a count does what it does however many are chosen', () => {
    const r = fresh(at('a', 0.5));
    useTimes(r, 5, 'a', 'chosen');
    useTimes(r, 4, 'a', 'other chosen');
    const [a] = r.query({ x: 0 }, 1, ['chosen', 'other chosen', 'chosen']);
    expect(a!.score).toBeCloseTo(coUseScore(0.5, 9), 12);
    expect(a!.score).toBeCloseTo(0.5 - (CO_USE_PULL * CO_USE_REACH * Math.log(10)) / Math.log(11), 12);
  });

  it('counts no use with a chosen id it doesn’t hold', () => {
    const r = fresh(at('a', 0.5));
    expect(r.query({ x: 0 }, 1, ['made by the composer'])[0]!.score).toBe(0.5);
  });
});

// The pull's strength is the query's (#151): the frontend sets it from its novelty ladder (decision 043, point 5), and 0
// is a query with nothing chosen. Over the library and 1,000 points: learned.test.ts.
describe('the pull, a query option', () => {
  const at = (id: string, x: number): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x }, weight: 1 }] });
  const repository = createRepository([at('chosen', 9), at('near', 0.1), at('far', 0.15)]);
  const layer = { filed: [], points: [], together: [{ ids: ['chosen', 'far'] as [string, string], count: 40 }] };
  const ask = (more: QueryOptions) => repository.query({ x: 0 }, 2, {}, { chosen: ['chosen'], layer, ...more });

  it('is CO_USE_PULL where the query names none', () => {
    expect(ask({})).toEqual(ask({ pull: CO_USE_PULL }));
    expect(ask({})[1]!.score).toBe(coUseScore(0.15, 40));
  });

  it('scales the pull: a known group pulls the pull times the reach', () => {
    for (const pull of [0.05, 0.1, 0.5, 1, 3]) {
      const far = ask({ pull }).find((f) => f.fragment.id === 'far')!;
      expect(far.score, `pull ${pull}`).toBeCloseTo(0.15 - pull * CO_USE_REACH, 15);
      expect(far.score).toBe(coUseScore(0.15, 40, pull));
    }
    // (0.05 apart: the default's 0.02 doesn't reverse them, a pull of 0.5 (0.1) does)
    expect(ask({}).map((f) => f.fragment.id)).toEqual(['near', 'far']);
    expect(ask({ pull: 0.5 }).map((f) => f.fragment.id)).toEqual(['far', 'near']);
  });

  it('at 0, pulls nothing: every score is the distance, as with nothing chosen', () => {
    expect(ask({ pull: 0 })).toEqual(repository.query({ x: 0 }, 2, {}, { layer }));
    for (const f of ask({ pull: 0 })) expect(f.score).toBe(f.distance);
    expect(coUseScore(0.3, 1_000, 0)).toBe(0.3);
    expect(coUseScore(Infinity, 3)).toBe(Infinity);
  });

  it('refuses a pull that isn’t a number ≥ 0', () => {
    for (const pull of [-0.1, -Infinity, Infinity, NaN, '0.1' as unknown as number, null as unknown as number])
      expect(() => ask({ pull }), String(pull)).toThrow(/query: pull is .*, not a number ≥ 0/);
  });
});
