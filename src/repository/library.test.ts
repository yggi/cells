// The library (#138): the meters and the rhythms in one repository. A query that names the facet `meter` returns what the
// meters alone return, at every point Jambot asks at and over a grid, so the rhythms change no meter query (Jambot's,
// yggi/jambot#384). What a query costs: `timing.slow.test.ts`.
import { describe, expect, it } from 'vitest';
import { createRepository, type Fragment, type StylePoint } from './fragments';
import { BASS_FRAGMENTS } from './bass';
import { HARMONY_FRAGMENTS } from './harmony';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { EXPRESSION_FRAGMENTS } from './expression';
import { LIBRARY, resolveSeed, RETIRED } from './library';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { PERFORMER_FRAGMENTS } from './performers';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';
import { STAB_FRAGMENTS } from './stab';
import { MOTIF_FRAGMENTS } from './motifs';
import { FORM_FRAGMENTS } from './forms';

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
  it('is the thirteen meters, the fifteen rhythms, the six bass lines, the six harmonies, the thirteen instruments, the vibrato and the envelopes, the nine modes, the five performers, the stab line, the ten motifs and the four forms, every point associated as its facet, the bell and scale as two: seventy-six', () => {
    expect(LIBRARY).toHaveLength(84);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'meter')).toEqual(METER_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'rhythm')).toEqual(RHYTHM_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'bass')).toEqual(BASS_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'harmony')).toEqual(HARMONY_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'instrument')).toEqual(INSTRUMENT_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'expression')).toEqual(EXPRESSION_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f)[0] === 'mode')).toEqual(MODE_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'performer')).toEqual(PERFORMER_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'stab')).toEqual(STAB_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'motif')).toEqual(MOTIF_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'form')).toEqual(FORM_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).length > 1).map((f) => [f.id, facetsOf(f)])).toEqual([['bell and scale', ['mode', 'rhythm']]]);
    expect([
      METER_FRAGMENTS.length,
      RHYTHM_FRAGMENTS.length,
      BASS_FRAGMENTS.length,
      HARMONY_FRAGMENTS.length,
      INSTRUMENT_FRAGMENTS.length,
      EXPRESSION_FRAGMENTS.length,
      MODE_FRAGMENTS.length,
      PERFORMER_FRAGMENTS.length,
      STAB_FRAGMENTS.length,
      MOTIF_FRAGMENTS.length,
      FORM_FRAGMENTS.length,
    ]).toEqual([13, 15, 6, 6, 13, 2, 9, 5, 1, 10, 4]);
  });

  it('resolves a retired id for a minor version as a use of what took its place, and lists none of them (#196)', () => {
    for (const [id, text] of RETIRED) {
      expect(
        LIBRARY.some((f) => f.id === id),
        id,
      ).toBe(false);
      expect(resolveSeed(id)).toBe(text);
    }
    expect([...RETIRED.keys()]).toEqual(['core kit', 'gm kit']);
    expect(resolveSeed('gm_kit')).toBe(LIBRARY.find((f) => f.id === 'gm_kit')!.text);
  });

  it('a query of the meters over it returns what the meters alone return, at every one of 661 points', () => {
    expect(POINTS).toHaveLength(661);
    for (const point of POINTS) expect(ranked(library.query(point, 25, {}, { facet: 'meter' })), JSON.stringify(point)).toEqual(ranked(meters.query(point, 13)));
  });

  it('and so do the rhythms, with the bell and scale: the bass lines, the harmonies and the modes change no rhythm query', () => {
    for (const point of POINTS)
      expect(ranked(library.query(point, 25, {}, { facet: 'rhythm' })), JSON.stringify(point)).toEqual(ranked(rhythmsAndBell.query(point, 16, {}, { facet: 'rhythm' })));
  });

  it('and so do the bass lines: the harmonies change no bass query', () => {
    for (const point of POINTS) expect(ranked(library.query(point, 25, {}, { facet: 'bass' })), JSON.stringify(point)).toEqual(ranked(basses.query(point, 6)));
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

describe('the points proposed for two more presets (#349)', () => {
  // (the library as it was before them: their new fragments out, and the associations they added to old ones)
  const ADDED: Record<string, StylePoint> = {
    '4/4 swung on 8n': ELECTRO_SWING,
    'walking bass': ELECTRO_SWING,
    'harmonic minor': SPOOKY,
    '5/4': SPOOKY,
    '6/8': { ...SPOOKY, energy: 0.27 },
    '3/4': { ...SPOOKY, energy: 0.43 },
  };
  const same = (a: StylePoint, b: StylePoint) => AXES.every((axis) => a[axis] === b[axis]);
  const NEW = new Set(['Spooky drums', 'creeping bass', 'dark cadence', 'diesIrae']);
  const before = createRepository(
    LIBRARY.filter((f) => !NEW.has(f.id)).map((f) => ({ ...f, association: f.association.filter((wp) => !(ADDED[f.id] && same(wp.point, ADDED[f.id]!))) })),
  );
  const facets = [...new Set(LIBRARY.flatMap((f) => f.association.map((wp) => wp.facet!)))];

  // (further down a ranking a fragment can move up, nearer by the point it gained: the ladder's fetch from near by, not
  // the preset itself. And where no harmony is near a preset, the dark cadence is nearer than any vamp: four bars, it is
  // no progression Jambot's composer reads, which takes eight (yggi/jambot packages/engine/src/harmony-query.ts), so
  // those five presets generate their harmony as before)
  it('change nothing Jambot’s eight presets find first, in any facet, nor how far it is, but the dark cadence where no harmony was near', () => {
    expect(facets).toHaveLength(11);
    const NAMES = ['Synth-pop', 'Techno', 'Deep house', 'Ambient', 'Lo-fi hip hop', 'Funk', 'Bossa nova', 'Swing jazz'];
    const first = (r: typeof library, point: StylePoint, facet: string) => ranked(r.query(point, 1, {}, { facet }));
    const moved = PRESETS.flatMap((point, i) =>
      facets
        .filter((facet) => JSON.stringify(first(library, point, facet)) !== JSON.stringify(first(before, point, facet)))
        .map((facet) => [NAMES[i], facet, first(library, point, facet)[0]![0], first(before, point, facet)[0]![1]]),
    );
    expect(moved.map(([name, facet, id]) => `${name}, ${facet}: ${id}`)).toEqual(
      ['Synth-pop', 'Deep house', 'Lo-fi hip hop', 'Bossa nova', 'Swing jazz'].map((name) => `${name}, harmony: dark cadence`),
    );
    for (const [, , , was] of moved) expect(was).toBeGreaterThan(0.35);
    expect(HARMONY_FRAGMENTS.find((f) => f.id === 'dark cadence')!.text).toMatch(/ cycle=4 /);
  });

  it('find there, at distance 0, what each was proposed with', () => {
    const at = (point: StylePoint, facet: string) =>
      library
        .query(point, 25, {}, { facet })
        .filter((f) => f.distance === 0)
        .map((f) => f.fragment.id);
    expect(['meter', 'rhythm', 'bass', 'mode', 'stab', 'motif'].map((facet) => at(ELECTRO_SWING, facet))).toEqual([
      ['4/4 swung on 8n'],
      ['Electro swing drums'],
      ['walking bass'],
      ['harmonic minor'],
      ['Charleston stabs'],
      ['gypsy'],
    ]);
    expect(['meter', 'rhythm', 'bass', 'harmony', 'mode', 'motif'].map((facet) => at(SPOOKY, facet))).toEqual([
      ['5/4'],
      ['Spooky drums'],
      ['creeping bass'],
      ['dark cadence'],
      ['harmonic minor'],
      ['diesIrae'],
    ]);
  });
});
