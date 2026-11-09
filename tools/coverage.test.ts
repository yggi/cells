import { describe, expect, it } from 'vitest';
import { createRepository, type Fragment } from '../src/repository/fragments';
import { LIBRARY } from '../src/repository/library';
import { STYLES } from '../src/repository/styles';
import { coverage, distanceOf, facetsOf, facetTable, placesOf, probed, rank } from './coverage';

const at = (sync: number, harm: number) => ({ sync, harm });
const fragment = (id: string, ...points: { point: Record<string, number>; weight?: number; facet?: string }[]): Fragment => ({
  id,
  text: `&${id.replace(/\W/g, '')} step=4 0`,
  association: points.map((p) => ({ weight: 1, ...p })),
});

describe('tools/coverage.ts: npm run coverage', () => {
  it('ranks as the repository’s query does with nothing chosen: every facet, every style, every fragment, in order and distance', () => {
    const repository = createRepository(LIBRARY);
    const library = probed();
    const facets = facetsOf(library);
    expect(facets).toContain('form');
    for (const { point } of STYLES)
      for (const facet of facets)
        expect(rank(library, point, facet).map((h) => [h.id, h.distance])).toEqual(
          repository.query(point, repository.fragments.length, {}, { facet }).map((f) => [f.fragment.id, f.distance]),
        );
  });

  describe('the distances', () => {
    const style = { sync: 0.5, harm: 0.5, bite: 0.5, mood: 0.5 };
    it('measure a point that names every axis, and no reach, alike', () => {
      const full = { point: { sync: 0.2, harm: 0.9, bite: 0.5, mood: 0.1 } };
      const today = distanceOf(full, style, 'today');
      expect(today).toBeCloseTo(Math.sqrt((0.09 + 0.16 + 0 + 0.16) / 4), 12);
      expect(distanceOf(full, style, 'window')).toBe(today);
      expect(distanceOf(full, style, 'hinge')).toBe(today);
      expect(distanceOf(full, style, 'whole')).toBe(today);
    });
    it('window: 0 inside a reach, and from its edge outside it', () => {
      const placed = { point: { sync: 0.2, harm: 0.5, bite: 0.5, mood: 0.5 }, reach: { sync: 0.1 } };
      expect(distanceOf(placed, style, 'window')).toBeCloseTo(Math.sqrt(0.2 ** 2 / 4), 12);
      expect(distanceOf({ ...placed, reach: { sync: 0.3 } }, style, 'window')).toBe(0);
    });
    it('hinge: a quarter of the slope inside a reach, the whole slope from its edge, so two points inside it still differ', () => {
      const placed = { point: { sync: 0.2, harm: 0.5, bite: 0.5, mood: 0.5 }, reach: { sync: 0.1 } };
      expect(distanceOf(placed, style, 'hinge')).toBeCloseTo(Math.sqrt((0.2 + 0.25 * 0.1) ** 2 / 4), 12);
      const inside = (sync: number) => distanceOf({ ...placed, point: { ...placed.point, sync }, reach: { sync: 0.3 } }, style, 'hinge');
      expect(inside(0.3)).toBeGreaterThan(inside(0.4));
      expect(inside(0.4)).toBeCloseTo(Math.sqrt((0.25 * 0.1) ** 2 / 4), 12);
    });
    it('a missing axis: dropped from the mean today, in window and in hinge, a reach of the whole axis counted in it in whole', () => {
      const partial = { point: { harm: 0.9 } };
      expect(distanceOf(partial, style, 'today')).toBeCloseTo(0.4, 12);
      expect(distanceOf(partial, style, 'window')).toBeCloseTo(0.4, 12);
      expect(distanceOf(partial, style, 'hinge')).toBeCloseTo(0.4, 12);
      expect(distanceOf(partial, style, 'whole')).toBeCloseTo(0.2, 12);
    });
  });

  it('a placement replaces a fragment’s points of the facet it names, keeps the others, and names only fragments held', () => {
    const library = [fragment('two', { point: at(0.5, 0.5), facet: 'form' }, { point: at(0.1, 0.1), facet: 'mode' }), fragment('one', { point: at(0.5, 0.5), facet: 'form' })];
    expect(rank(probed({}, library), at(0.9, 0.9), 'form').map((h) => h.id)).toEqual(['one', 'two']);
    const placed = probed({ two: [{ point: { sync: 0.9 }, facet: 'form', reach: { sync: 0.05 } }] }, library);
    expect(rank(placed, at(0.9, 0.9), 'form')).toEqual([
      { id: 'two', distance: 0 },
      { id: 'one', distance: expect.closeTo(0.4, 12) },
    ]);
    expect(rank(placed, at(0.1, 0.1), 'mode')).toEqual([{ id: 'two', distance: 0 }]);
    expect(() => probed({ three: [] }, library)).toThrow(/three/);
  });

  it('marks a tie for first with =, as the four forms at the centre are, broken by id', () => {
    const library = probed({}, [
      fragment('b', { point: at(0.5, 0.5), facet: 'form' }),
      fragment('a', { point: at(0.5, 0.5), facet: 'form' }),
      fragment('c', { point: at(0.2, 0.2), facet: 'form' }),
    ]);
    const rows = coverage(
      library,
      [
        { name: 'x', point: at(0.6, 0.6) },
        { name: 'y', point: at(0.2, 0.2) },
      ],
      ['form'],
      2,
      'today',
    );
    expect(rows[0]!.found.form!.map((h) => h.id)).toEqual(['a', 'b']);
    expect(facetTable(rows, ['form']).split('\n').slice(1)).toEqual([`x${' '.repeat(4)} ${'0.100='.padStart(10)}`, `y${' '.repeat(4)} ${'0.000 '.padStart(10)}`]);
  });

  it('measures the styles of styles, and with between the point halfway between each pair', () => {
    expect(placesOf().map((p) => p.name)).toEqual(STYLES.map((s) => s.name));
    const [a, b] = STYLES;
    const places = placesOf([a!.id, b!.id], true);
    expect(places.map((p) => p.name)).toEqual([a!.name, b!.name, `${a!.name} | ${b!.name}`]);
    for (const axis of Object.keys(a!.point)) expect(places[2]!.point[axis]).toBeCloseTo((a!.point[axis]! + b!.point[axis]!) / 2, 12);
    expect(() => placesOf(['nowhere'])).toThrow(/nowhere/);
  });
});
