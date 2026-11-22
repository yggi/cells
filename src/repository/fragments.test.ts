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
  // nothing, so a group a long jam keeps never pulls past the reach, 0.01 at the default pull (#162).
  it('saturates: each use pulls more up to 10, and none past it, so a known group pulls 0.01 at the default and no more', () => {
    expect([CO_USE_PULL, CO_USE_KNOWN, CO_USE_REACH]).toEqual([0.1, 10, 0.1]);
    for (let n = 1; n <= CO_USE_KNOWN; n++) expect(pullOf(n), `use ${n}`).toBeGreaterThan(pullOf(n - 1));
    for (const n of [11, 12, 20, 100, 500, 1_000_000]) expect(pullOf(n), `${n} uses`).toBe(pullOf(CO_USE_KNOWN));
    expect(pullOf(CO_USE_KNOWN)).toBeCloseTo(0.01, 15);
    expect(pullOf(1)).toBeCloseTo((0.01 * Math.log(2)) / Math.log(11), 15);
  });

  it('two fragments 0.3 apart, Jambot’s miss distance, keep their order at every count of either, a million uses included', () => {
    const counts = [0, 1, 5, 9, 10, 20, 500, 1_000_000];
    for (const near of counts) for (const far of counts) expect(counted([at('near', 0.1), at('far', 0.4)], { near, far })(), `near ${near}, far ${far}`).toEqual(['near', 'far']);
  });

  it('a known group (10 uses, not 9) takes the lead from a fragment 0.00975 nearer, and never from one more than 0.01 nearer', () => {
    expect(counted([at('near', 0.1), at('far', 0.10975)], { far: 10 })()).toEqual(['far', 'near']);
    expect(counted([at('near', 0.1), at('far', 0.10975)], { far: 9 })()).toEqual(['near', 'far']);
    expect(counted([at('near', 0.1), at('far', 0.1105)], { far: 1_000_000 })()).toEqual(['near', 'far']);
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
    // (0.05 apart: the default's 0.01 doesn't reverse them, a pull of 1 (0.1) does)
    expect(ask({}).map((f) => f.fragment.id)).toEqual(['near', 'far']);
    expect(ask({ pull: 1 }).map((f) => f.fragment.id)).toEqual(['far', 'near']);
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

describe('a fragment of no style (#540)', () => {
  const at = (id: string, point: Record<string, number>, weight = 1) => ({ id, text: `&${id} 0`, association: [{ point, weight, facet: 'module' }] });

  it('is well formed with no point: an empty point is no style, not a malformed one', () => {
    expect(fragmentProblems(at('osc', {}))).toEqual([]);
  });

  // decision 090 (the owner, 2026-11-14): no style, no query; it is taken by its name
  it('is found by no query, of its facet or of none, and every other result is as it was', () => {
    const styled = [at('near', { sync: 0.2 }), at('far', { sync: 0, harm: 0, bite: 0, mood: 0 }, 0.5)];
    const repo = createRepository([at('none', {}), ...styled]);
    const without = createRepository(styled);
    for (const point of [
      { sync: 0.2, harm: 1, bite: 1, mood: 1 },
      { sync: 1, harm: 1, bite: 1, mood: 1 },
    ])
      for (const facet of ['module', undefined]) {
        const found = repo.query(point, 3, {}, { facet });
        expect(found.map((f) => f.fragment.id)).not.toContain('none');
        expect(found).toEqual(without.query(point, 3, {}, { facet }));
      }
    // (it still says what kind of fragment it is: a frontend finds it by that, Cell studio's modules)
    expect(repo.fragments.find((f) => f.id === 'none')?.association).toEqual([{ point: {}, weight: 1, facet: 'module' }]);
  });
});

describe('a repository told the ids it knows (#716, ask 3)', () => {
  // a frontend's repository of one facet's fragments (a rhythm's), asked about use together with another facet's (a meter's)
  const at = { x: 0.5, y: 0.5 };
  const rhythm = (id: string, x: number): Fragment => ({ id, text: '&bar meter("4/4")', association: [{ point: { x, y: 0.5 }, weight: 1, facet: 'rhythm' }] });
  const rhythms = [rhythm('near', 0.5), rhythm('far', 0.7)];
  const meter = '4/4';
  const known = (id: string) => id === meter;
  const alone = createRepository(rhythms);
  const knowing = createRepository(rhythms, { known });
  const used = (r: typeof alone) => useFragments(r, EMPTY_LAYER, [{ id: meter }, { id: 'far', point: at, facet: 'rhythm' }]);

  it('refuses a use of an id it neither holds nor knows, as before; takes one it knows', () => {
    expect(() => used(alone)).toThrow(/useFragments: no fragment '4\/4'/);
    expect(() => useFragments(knowing, EMPTY_LAYER, [{ id: 'nothing' }, { id: 'far' }])).toThrow(/useFragments: no fragment 'nothing'/);
    expect(usedTogether(used(knowing), meter, 'far')).toBe(1);
    expect(knowing.knows(meter) && knowing.knows('far') && !knowing.knows('nothing') && !alone.knows(meter)).toBe(true);
  });

  it('moves no association of an id it only knows: a use of it with a point counts together and nothing else', () => {
    const layer = useFragments(knowing, EMPTY_LAYER, [{ id: meter, point: at, facet: 'meter' }, { id: 'far' }]);
    expect(usedTogether(layer, meter, 'far')).toBe(1);
    expect(layer.points).toEqual([]);
  });

  it('ranks a fragment nearer by its use with a chosen id it knows, which a repository that does not know it cannot see', () => {
    const layer = { ...EMPTY_LAYER, together: [{ ids: [meter, 'far'] as const, count: 10 }] };
    const rank = (r: typeof alone) => r.query(at, 2, {}, { facet: 'rhythm', chosen: [meter], layer });
    const far = (r: typeof alone) => rank(r).find((f) => f.fragment.id === 'far')!;
    expect(far(alone).score).toBe(far(alone).distance);
    expect(far(knowing).score).toBeLessThan(far(knowing).distance);
    expect(alone.merge(layer).unheld).toEqual([meter]);
    expect(knowing.merge(layer).unheld).toEqual([]);
    // (what it never knew stays left out)
    expect(knowing.merge({ ...EMPTY_LAYER, together: [{ ids: ['far', 'nothing'] as const, count: 3 }] }).unheld).toEqual(['nothing']);
  });
});

describe('a query asked beyond the ranking: reach, exclude, accept, within and the playing one kept (#716, ask 1)', () => {
  // five fragments on one axis, nearest first from x = 0.2; the distances are read off the query itself, so no number here
  // is the repository's own
  const at = (x: number): Fragment => ({ id: `f${x}`, text: '&bar meter("4/4")', association: [{ point: { x }, weight: 1 }] });
  const repo = createRepository([0.2, 0.25, 0.3, 0.45, 0.8].map(at));
  const point = { x: 0.2 };
  const all = repo.query(point, 10);
  const ids = (found: readonly { fragment: Fragment }[]) => found.map((f) => f.fragment.id);
  const names = ids(all);
  const d = all.map((f) => f.distance);

  it('answers as before with none of them', () => {
    expect(names).toEqual(['f0.2', 'f0.25', 'f0.3', 'f0.45', 'f0.8']);
    expect(ids(repo.query(point, 3, {}, {}))).toEqual(names.slice(0, 3));
    expect(d[0]).toBe(0);
  });

  it('reach drops what lies past it, and none lies within a reach below the nearest', () => {
    expect(ids(repo.query(point, 10, {}, { reach: d[2]! }))).toEqual(names.slice(0, 3));
    expect(repo.query(point, 10, {}, { reach: d[0]! })).toHaveLength(1);
    expect(repo.query({ x: 0.9 }, 10, {}, { reach: 0.01 })).toEqual([]);
  });

  it('exclude finds the next nearest in place of an id left out', () => {
    expect(ids(repo.query(point, 2, {}, { exclude: [names[0]!] }))).toEqual([names[1], names[2]]);
  });

  it('accept is tried in rank order until k are accepted, and a refused one is left out', () => {
    const tried: string[] = [];
    const found = repo.query(point, 2, {}, { accept: (f) => (tried.push(f.id), f.id !== names[1]) });
    expect(ids(found)).toEqual([names[0], names[2]]);
    expect(tried).toEqual([names[0], names[1], names[2]]);
  });

  it('within keeps what scores within the best’s score plus (within − 1) times its distance', () => {
    // (from the second: the nearest of what is asked has a distance above 0)
    const fromSecond = repo.query(point, 10, {}, { exclude: [names[0]!] });
    const best = fromSecond[0]!;
    const edge = (within: number) => best.score + (within - 1) * best.distance;
    for (const within of [1, 1.5, 2, 4]) {
      expect(ids(repo.query(point, 10, {}, { exclude: [names[0]!], within })), `within ${within}`).toEqual(ids(fromSecond.filter((f) => f.score <= edge(within) + 1e-9)));
    }
    expect(ids(repo.query(point, 10, {}, { exclude: [names[0]!], within: 1 }))).toEqual([names[1]]);
  });

  it('the playing one is returned first, held, where it lies within the hold of the nearest, and not where it lies farther', () => {
    const gap = d[2]! - d[0]!;
    const kept = repo.query(point, 3, {}, { playing: { id: names[2]!, hold: gap } });
    expect(ids(kept)).toEqual([names[2], names[0], names[1]]);
    expect(kept.map((f) => f.held)).toEqual([true, undefined, undefined]);
    expect(ids(repo.query(point, 3, {}, { playing: { id: names[2]!, hold: gap - 1e-6 } }))).toEqual(names.slice(0, 3));
    expect(ids(repo.query(point, 3, {}, { playing: { id: names[0]!, hold: 0 } }))).toEqual(names.slice(0, 3));
  });

  it('the playing one is held past the reach by its slack, and only where it is within the hold of the nearest', () => {
    const reach = d[1]!;
    const hold = d[3]! - d[0]!;
    // (the third lies past the reach: held with the slack that covers it, dropped without)
    expect(ids(repo.query(point, 3, {}, { reach, playing: { id: names[2]!, hold, slack: d[2]! - reach } }))).toEqual([names[2], names[0], names[1]]);
    expect(ids(repo.query(point, 3, {}, { reach, playing: { id: names[2]!, hold, slack: d[2]! - reach - 1e-6 } }))).toEqual([names[0], names[1]]);
    expect(ids(repo.query(point, 3, {}, { reach, playing: { id: names[2]!, hold } }))).toEqual([names[0], names[1]]);
    // (nothing lies within the reach but the one playing is within the slack and the hold: it is what is returned)
    expect(ids(repo.query({ x: 0.3 }, 3, {}, { reach: 0, exclude: ['f0.3'], playing: { id: 'f0.25', hold: 1, slack: 1 } }))).toEqual(['f0.25']);
  });

  it('the playing one is not kept where it is excluded, refused, or not a fragment', () => {
    const playing = { id: names[2]!, hold: 1 };
    expect(ids(repo.query(point, 3, {}, { exclude: [names[2]!], playing }))).toEqual([names[0], names[1], names[3]]);
    expect(ids(repo.query(point, 3, {}, { accept: (f) => f.id !== names[2], playing }))).toEqual([names[0], names[1], names[3]]);
    expect(ids(repo.query(point, 3, {}, { playing: { id: 'nothing', hold: 1 } }))).toEqual(names.slice(0, 3));
  });

  it('refuses a margin that is not a number in its range', () => {
    expect(() => repo.query(point, 1, {}, { reach: -1 })).toThrow(/reach is -1/);
    expect(() => repo.query(point, 1, {}, { within: 0.5 })).toThrow(/within is 0.5/);
    expect(() => repo.query(point, 1, {}, { playing: { id: 'a', hold: Number.NaN } })).toThrow(/playing.hold is NaN/);
    expect(() => repo.query(point, 1, {}, { playing: { id: 'a', hold: 0, slack: -1 } })).toThrow(/playing.slack is -1/);
  });
});
