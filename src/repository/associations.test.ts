// Associations that are consistent and complete (#540): every style finds at least two fragments within reach in each
// facet the composer asks for, so a style has a choice within itself; and every point is well formed.
import { describe, expect, it } from 'vitest';
import { AXIS_NAMES } from '../engine/style';
import { createRepository, pointDistance } from './fragments';
import { LIBRARY } from './library';
import { STYLES } from './styles';

/** Jambot's miss distance (`MISS_DISTANCE`): a fragment farther than this from a style isn't found there. */
const REACH = 0.3;
/** The fragments each style finds within reach, in each core facet: two, so that it has a choice (the owner, 2026-11-11). */
const DEPTH = 2;
/** The facets Jambot's composer asks for at a style (#540). Stabs and forms are found where their idiom is, not at every style. */
const CORE = ['meter', 'rhythm', 'bass', 'harmony', 'mode', 'motif', 'instrument'] as const;
/**
 * Two points of one fragment (one facet, one set of arguments) closer than this are one: the second is redundant. Under
 * the closest pair the library places on purpose: `root_bass`'s own point, bass.ts's, 0.025 from Ambient's, and the
 * mixolydian halfway between Funk and Bossa nova, 0.029 from Salsa's.
 */
const SAME = 0.02;

const repo = createRepository(LIBRARY);

describe('every style finds its parts (#540)', () => {
  it.each(STYLES.flatMap((s) => CORE.map((facet) => [s.name, facet, s.point] as const)))('%s finds at least two %s fragments within reach', (_, facet, point) => {
    const near = repo.query(point, LIBRARY.length, {}, { facet }).filter((f) => f.distance <= REACH);
    expect(near.length).toBeGreaterThanOrEqual(DEPTH);
  });

  it('is shown firing: a style placed where nothing is misses', () => {
    expect(repo.query({ sync: 1, harm: 0, bite: 0, mood: 0 }, LIBRARY.length, {}, { facet: 'instrument' }).filter((f) => f.distance <= REACH).length).toBeLessThan(DEPTH);
  });
});

describe('every association point is well formed (#540)', () => {
  const points = LIBRARY.flatMap((f) => f.association.map((a) => ({ id: f.id, ...a })));

  it('names only the axes, each within its range', () => {
    for (const p of points)
      for (const [axis, v] of Object.entries(p.point)) {
        expect(AXIS_NAMES, `${p.id}: ${axis}`).toContain(axis);
        expect(v >= 0 && v <= 1, `${p.id}: ${axis}=${v}`).toBe(true);
      }
  });

  it('stands at no centre: no point is .5 on every axis, a stand-in for "any style" (the owner: placed by idiom instead)', () => {
    expect(points.filter((p) => AXIS_NAMES.every((a) => p.point[a] === 0.5)).map((p) => p.id)).toEqual([]);
  });

  it('holds no two points of a fragment within 0.02 of each other, as one facet with one set of arguments: one would be redundant', () => {
    const close: string[] = [];
    for (const f of LIBRARY)
      f.association.forEach((a, i) =>
        f.association.slice(i + 1).forEach((b) => {
          if ((a.facet ?? '') === (b.facet ?? '') && JSON.stringify(a.args ?? {}) === JSON.stringify(b.args ?? {}) && pointDistance(a.point, b.point) < SAME) close.push(f.id);
        }),
      );
    expect(close).toEqual([]);
  });
});
