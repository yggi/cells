// The library (#138): the meters and the rhythms in one repository. A query that names the facet `meter` returns what the
// meters alone return, at every point Jambot asks at and over a grid, so the rhythms change no meter query (Jambot's,
// yggi/jambot#384); and a query costs under a millisecond.
import { describe, expect, it } from 'vitest';
import { createRepository, EMPTY_LAYER, type Fragment, type StylePoint } from './fragments';
import { useFragments } from './learned';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

const library = createRepository(LIBRARY);
const meters = createRepository(METER_FRAGMENTS);
const PRESETS = [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ];
const AXES = ['sync', 'harm', 'artic', 'energy'] as const;

// Every preset, as Jambot queries with it (swing and bpm too, which no fragment has), every point halfway between two,
// and a grid of five values on each of the four axes: 8 + 28 + 625 points.
const halfway = (a: StylePoint, b: StylePoint) => Object.fromEntries(AXES.map((axis) => [axis, (a[axis]! + b[axis]!) / 2]));
const grid = AXES.reduce<StylePoint[]>((points, axis) => points.flatMap((p) => [0, 0.25, 0.5, 0.75, 1].map((v) => ({ ...p, [axis]: v }))), [{}]);
const POINTS: StylePoint[] = [
  ...PRESETS.map((p, i) => ({ ...p, swing: i / 8, bpm: 72 + 10 * i })),
  ...PRESETS.flatMap((a, i) => PRESETS.slice(i + 1).map((b) => halfway(a, b))),
  ...grid,
];

const ranked = (found: ReturnType<typeof library.query>) => found.map((f) => [f.fragment.id, f.distance, f.score]);

describe('the library', () => {
  const facetsOf = (f: Fragment) => [...new Set(f.association.map((wp) => wp.facet))];
  it('is the thirteen meters and the thirteen rhythms, every point associated as its facet: twenty-six', () => {
    expect(LIBRARY).toHaveLength(26);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'meter')).toEqual(METER_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'rhythm')).toEqual(RHYTHM_FRAGMENTS);
    expect([METER_FRAGMENTS.length, RHYTHM_FRAGMENTS.length]).toEqual([13, 13]);
  });

  it('a query of the meters over it returns what the meters alone return, at every one of 661 points', () => {
    expect(POINTS).toHaveLength(661);
    for (const point of POINTS) expect(ranked(library.query(point, 25, {}, { facet: 'meter' })), JSON.stringify(point)).toEqual(ranked(meters.query(point, 13)));
  });

  it('and so does one that names chosen fragments with no use recorded', () => {
    for (const point of POINTS.slice(0, 36)) expect(ranked(library.query(point, 25, {}, { facet: 'meter', chosen: ['Funk drums'] }))).toEqual(ranked(meters.query(point, 13)));
  });

  it('a query that names no facet mixes them: the facet is what keeps the meters apart', () => {
    const facets = library.query(BOSSA_NOVA, 3).flatMap((f) => facetsOf(f.fragment));
    expect(facets).toContain('rhythm');
    expect(facets).toContain('meter');
  });

  // (as yggi/jambot#375 timed its query: 20,000 of them, each over every fragment, here with a facet and two fragments chosen)
  it('a query over the 26 costs under 1 ms', () => {
    const r = createRepository(LIBRARY);
    const uses = (ids: string[]) => ids.map((id) => ({ id }));
    const layer = useFragments(
      r,
      useFragments(r, EMPTY_LAYER, uses(['4/4', 'Bossa nova drums', 'bossa nova clave'])),
      uses(['4/4 leaning lightly on 16n', 'Funk drums', 'rumba clave 3-2']),
    );
    const n = 20_000;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const point = POINTS[i % POINTS.length]!;
      r.query(point, 25, {}, i % 2 ? { facet: 'rhythm', chosen: ['4/4', 'Funk drums'], layer } : { facet: 'meter', layer });
    }
    const perQuery = (performance.now() - t0) / n;
    expect(perQuery).toBeLessThan(1);
  });
});
