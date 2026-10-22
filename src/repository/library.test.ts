// The library (#138): the meters and the rhythms in one repository. A query that names the facet `meter` returns what the
// meters alone return, at every point Jambot asks at and over a grid, so the rhythms change no meter query (Jambot's,
// yggi/jambot#384). What a query costs: `timing.slow.test.ts`.
import { describe, expect, it } from 'vitest';
import { createRepository, type Fragment, type StylePoint } from './fragments';
import { BASS_FRAGMENTS } from './bass';
import { HARMONY_FRAGMENTS } from './harmony';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

const library = createRepository(LIBRARY);
const meters = createRepository(METER_FRAGMENTS);
// (the bell and scale is a rhythm too, and a mode: decision 056)
const rhythmsAndBell = createRepository([...RHYTHM_FRAGMENTS, ...MODE_FRAGMENTS.filter((f) => f.association.some((wp) => wp.facet === 'rhythm'))]);
const basses = createRepository(BASS_FRAGMENTS);
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
  it('is the thirteen meters, the thirteen rhythms, the five bass lines, the five harmonies, the three instruments and the five modes, every point associated as its facet, the bell and scale as two: forty-four', () => {
    expect(LIBRARY).toHaveLength(44);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'meter')).toEqual(METER_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'rhythm')).toEqual(RHYTHM_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'bass')).toEqual(BASS_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'harmony')).toEqual(HARMONY_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'instrument')).toEqual(INSTRUMENT_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f)[0] === 'mode')).toEqual(MODE_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).length > 1).map((f) => [f.id, facetsOf(f)])).toEqual([['bell and scale', ['mode', 'rhythm']]]);
    expect([METER_FRAGMENTS.length, RHYTHM_FRAGMENTS.length, BASS_FRAGMENTS.length, HARMONY_FRAGMENTS.length, INSTRUMENT_FRAGMENTS.length, MODE_FRAGMENTS.length]).toEqual([
      13, 13, 5, 5, 3, 5,
    ]);
  });

  it('a query of the meters over it returns what the meters alone return, at every one of 661 points', () => {
    expect(POINTS).toHaveLength(661);
    for (const point of POINTS) expect(ranked(library.query(point, 25, {}, { facet: 'meter' })), JSON.stringify(point)).toEqual(ranked(meters.query(point, 13)));
  });

  it('and so do the rhythms, with the bell and scale: the bass lines, the harmonies and the modes change no rhythm query', () => {
    for (const point of POINTS)
      expect(ranked(library.query(point, 25, {}, { facet: 'rhythm' })), JSON.stringify(point)).toEqual(ranked(rhythmsAndBell.query(point, 14, {}, { facet: 'rhythm' })));
  });

  it('and so do the bass lines: the harmonies change no bass query', () => {
    for (const point of POINTS) expect(ranked(library.query(point, 25, {}, { facet: 'bass' })), JSON.stringify(point)).toEqual(ranked(basses.query(point, 5)));
  });

  it('and so does one that names chosen fragments with no use recorded', () => {
    for (const point of POINTS.slice(0, 36)) expect(ranked(library.query(point, 25, {}, { facet: 'meter', chosen: ['Funk drums'] }))).toEqual(ranked(meters.query(point, 13)));
  });

  it('a query that names no facet mixes them: the facet is what keeps the meters apart', () => {
    const facets = library.query(BOSSA_NOVA, 3).flatMap((f) => facetsOf(f.fragment));
    expect(facets).toContain('rhythm');
    expect(facets).toContain('meter');
  });
});
