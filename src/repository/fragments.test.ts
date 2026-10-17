// The repository's format and its query (decision 041): a malformed entry fails, a query ranks by the weighted distance
// over the axes a point shares with each association, and ignores the axes it doesn't.
import { describe, expect, it } from 'vitest';
import { createRepository, fragmentDistance, fragmentProblems, pointDistance, type Fragment } from './fragments';

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
