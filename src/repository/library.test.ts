// The library (#138): the meters and the rhythms in one repository. A query that names the facet `meter` returns what the
// meters alone return, at every point Jambot asks at and over a grid, so the rhythms change no meter query (Jambot's,
// yggi/jambot#384). What a query costs: `timing.slow.test.ts`.
import { newPoint } from '../engine/migrate/axes';
import { describe, expect, it } from 'vitest';
import { createRepository, type Fragment, type StylePoint } from './fragments';
import { LIBRARY, ofFacet, resolveSeed, RETIRED } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';
import { STYLE_FRAGMENTS } from './styles';
import { seedFragments } from './seed';

const METER_FRAGMENTS = seedFragments('meters');
const RHYTHM_FRAGMENTS = seedFragments('rhythms');
const BASS_FRAGMENTS = seedFragments('bass');
const HARMONY_FRAGMENTS = seedFragments('harmony');
const INSTRUMENT_FRAGMENTS = seedFragments('instruments');
const EXPRESSION_FRAGMENTS = seedFragments('expression');
const MODE_FRAGMENTS = seedFragments('modes');
const PERFORMER_FRAGMENTS = seedFragments('performers');
const STAB_FRAGMENTS = seedFragments('stab');
const MOTIF_FRAGMENTS = ofFacet('motif');
const FORM_FRAGMENTS = seedFragments('forms');
const BAND_FRAGMENTS = seedFragments('bands');
const MODULE_FRAGMENTS = seedFragments('modules');

const library = createRepository(LIBRARY);
const meters = createRepository(METER_FRAGMENTS);
// (the bell and scale is a rhythm too, and a mode: decision 056)
const rhythmsAndBell = createRepository([...RHYTHM_FRAGMENTS, ...MODE_FRAGMENTS.filter((f) => f.association.some((wp) => wp.facet === 'rhythm'))]);
const basses = createRepository(BASS_FRAGMENTS);
const PRESETS = [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ];
// (decision 076's axes; a meter, a rhythm, a performer, a module, a form and an expression have no mood)
const AXES = ['sync', 'harm', 'bite', 'mood'] as const;

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
  it('is the thirteen meters, the thirty-two rhythms, the seventeen bass lines, the seventeen harmonies, the twenty-nine instruments, the vibrato and the envelopes, the nine modes, the five performers, the three stab lines, the fifty-six motifs, the six forms, the band, the styles and the eight modules, every point associated as its facet, the bell and scale as two: a hundred and ninety-nine (#572, #542, #540, #646)', () => {
    expect(LIBRARY).toHaveLength(199);
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
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'band')).toEqual(BAND_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'style')).toEqual(STYLE_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).join() === 'module')).toEqual(MODULE_FRAGMENTS);
    expect(LIBRARY.filter((f) => facetsOf(f).length > 1).map((f) => [f.id, facetsOf(f)])).toEqual([['bell_and_scale', ['mode', 'rhythm']]]);
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
      BAND_FRAGMENTS.length,
      STYLE_FRAGMENTS.length,
    ]).toEqual([13, 32, 17, 17, 29, 2, 9, 5, 3, 56, 6, 1, 1]);
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
      expect(ranked(library.query(point, 31, {}, { facet: 'rhythm' })), JSON.stringify(point)).toEqual(ranked(rhythmsAndBell.query(point, 31, {}, { facet: 'rhythm' })));
  });

  it('and so do the bass lines: the harmonies change no bass query', () => {
    for (const point of POINTS) expect(ranked(library.query(point, 30, {}, { facet: 'bass' })), JSON.stringify(point)).toEqual(ranked(basses.query(point, 17)));
  });

  it('and so does one that names chosen fragments with no use recorded', () => {
    for (const point of POINTS.slice(0, 36)) expect(ranked(library.query(point, 25, {}, { facet: 'meter', chosen: ['funk_drums'] }))).toEqual(ranked(meters.query(point, 13)));
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
    'meter(swing=8n:2/3)': ELECTRO_SWING,
    walking_bass: ELECTRO_SWING,
    harmonic_minor: SPOOKY,
    'meter(grouping=meter("5/4"))': SPOOKY,
    'meter(grouping=meter("6/8"))': { sync: SPOOKY.sync!, harm: SPOOKY.harm!, bite: 0.22 },
    'meter(grouping=meter("3/4"))': { sync: SPOOKY.sync!, harm: SPOOKY.harm!, bite: 0.38 },
  };
  // (a fragment's point over the axes it has: a meter's has no mood)
  const same = (a: StylePoint, b: StylePoint) => AXES.every((axis) => !(axis in a) || a[axis] === b[axis]);
  // (and the ghost-house fragments near Spooky, added after: the presets' first finds are what they were before either)
  const NEW = new Set([
    'spooky_drums',
    'creeping_bass',
    'dark_cadence',
    'diesIrae',
    'ghost_drums',
    'tiptoe_bass',
    'haunted_progression',
    'wail',
    'haunt',
    'lament',
    'peek',
    'haunted_pad',
    // (and Twinkle's and Hänschen klein's pieces, at the point proposed for children's songs)
    'kinderlied_drums',
    'twinkle',
    'wonder',
    'haenschen',
    'hinein',
    'heim',
    'weinet',
    'ternary',
    'rounded_binary',
  ]);
  const before = createRepository(
    LIBRARY.filter((f) => !NEW.has(f.id)).map((f) => ({ ...f, association: f.association.filter((wp) => !(ADDED[f.id] && same(wp.point, ADDED[f.id]!))) })),
  );
  const facets = [...new Set(LIBRARY.flatMap((f) => f.association.map((wp) => wp.facet!)))];

  // (further down a ranking a fragment can move up, nearer by the point it gained: the ladder's fetch from near by, not
  // the preset itself. And at Swing jazz, where no harmony is near, the dark cadence is nearer than any vamp, though
  // beyond the miss distance at its weight, 0.4 (#404), and four bars, no progression Jambot's composer reads, which
  // takes eight (yggi/jambot packages/engine/src/harmony-query.ts), so it generates its harmony as before. On decision
  // 076's axes Swing jazz (ionian) and Spooky (harmonic minor) are told apart by their mood, so the dark cadence no
  // longer reaches it, and nothing moves, #572)
  it('change nothing Jambot’s eight presets find first, in any facet, nor how far it is', () => {
    expect(facets).toHaveLength(14);
    const NAMES = ['Synth-pop', 'Techno', 'Deep house', 'Ambient', 'Lo-fi hip hop', 'Funk', 'Bossa nova', 'Swing jazz'];
    const first = (r: typeof library, point: StylePoint, facet: string) => ranked(r.query(point, 1, {}, { facet }));
    const moved = PRESETS.flatMap((point, i) =>
      facets
        .filter((facet) => JSON.stringify(first(library, point, facet)) !== JSON.stringify(first(before, point, facet)))
        .map((facet) => [NAMES[i], facet, first(library, point, facet)[0]![0], first(before, point, facet)[0]![1], first(library, point, facet)[0]![1]]),
    );
    expect(moved.map(([name, facet, id]) => `${name}, ${facet}: ${id}`)).toEqual([]);
    for (const [, , , , now] of moved) expect(now).toBeGreaterThan(0.3);
    for (const [, , , was] of moved) expect(was).toBeGreaterThan(0.35);
    expect(HARMONY_FRAGMENTS.find((f) => f.id === 'dark_cadence')!.text).toMatch(/ cycle=4 /);
  });

  it('find there, at distance 0, what each was proposed with', () => {
    const at = (point: StylePoint, facet: string) =>
      library
        .query(point, 25, {}, { facet })
        .filter((f) => f.distance === 0)
        .map((f) => f.fragment.id);
    expect(['meter', 'rhythm', 'bass', 'mode', 'stab', 'motif'].map((facet) => at(ELECTRO_SWING, facet))).toEqual([
      ['meter(swing=8n:2/3)'],
      ['electro_swing_drums'],
      ['walking_bass'],
      ['harmonic_minor'],
      ['charleston_stabs'],
      ['gypsy'],
    ]);
    expect(['meter', 'rhythm', 'bass', 'harmony', 'mode', 'motif'].map((facet) => at(SPOOKY, facet))).toEqual([
      ['meter(grouping=meter("5/4"))'],
      ['spooky_drums'],
      ['creeping_bass'],
      ['dark_cadence'],
      ['harmonic_minor'],
      ['diesIrae'],
    ]);
  });
});

// A seed placed for one preset is no other preset's first find within Jambot's miss distance (#404): where a preset has
// nothing of its own near in a facet, its composer would take the nearest fragment of anyone's within 0.3 (yggi/jambot
// `MISS_DISTANCE`, `meter-query.ts`) and play another preset's in its place. A fragment is placed for the preset nearest
// its point of that facet; one with a point at the centre of style space is everyone's default (the instruments). The
// facets are those a frontend asks for at its style point: Jambot's seven, and the stab and expression it is to ask for
// (yggi/jambot#541); a performer and a form are taken by name.
describe('a seed placed for one preset (#404)', () => {
  const MISS_DISTANCE = 0.3;
  const ALL_PRESETS: Record<string, StylePoint> = {
    'Synth-pop': SYNTH_POP,
    Techno: TECHNO,
    'Deep house': DEEP_HOUSE,
    Ambient: AMBIENT,
    'Lo-fi hip hop': LO_FI,
    Funk: FUNK,
    'Bossa nova': BOSSA_NOVA,
    'Swing jazz': SWING_JAZZ,
    'Electro swing': ELECTRO_SWING,
    Spooky: SPOOKY,
  };
  // (the centre, as decision 076's rule moved it, #572: a tonal fragment's there has the mood the old centre takes,
  // Synth-pop's, within 0.15 of it)
  const CENTRE = newPoint({ sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 });
  const both = (a: StylePoint, b: StylePoint) => AXES.filter((axis) => axis in a && axis in b);
  const plain = (a: StylePoint, b: StylePoint) => Math.hypot(...both(a, b).map((axis) => a[axis]! - b[axis]!));
  const placedFor = (fragment: Fragment, facet: string): string[] =>
    fragment.association
      .filter((wp) => wp.facet === undefined || wp.facet === facet)
      .flatMap((wp) => {
        if (both(wp.point, CENTRE).every((axis) => wp.point[axis] === CENTRE[axis])) return Object.keys(ALL_PRESETS);
        const nearest = Math.min(...Object.values(ALL_PRESETS).map((p) => plain(p, wp.point)));
        return Object.entries(ALL_PRESETS)
          .filter(([, p]) => plain(p, wp.point) === nearest)
          .map(([name]) => name);
      });
  /** Each preset's first find in each facet that lies within the miss distance and was placed for another preset. */
  const leaks = (fragments: readonly Fragment[]) => {
    const repository = createRepository(fragments);
    const facets = ['meter', 'mode', 'rhythm', 'bass', 'harmony', 'motif', 'instrument', 'stab', 'expression'];
    return Object.entries(ALL_PRESETS).flatMap(([name, point]) =>
      facets.flatMap((facet) => {
        const first = repository.query(point, 1, {}, { facet })[0];
        if (!first || first.distance > MISS_DISTANCE || placedFor(first.fragment, facet).includes(name)) return [];
        return [`${name}, ${facet}: ${first.fragment.id}`];
      }),
    );
  };
  /** The progressions written for the presets whose first harmony missed (#540), and axis_progression's point at Synth-pop. */
  const BEFORE_540 = ['ninth_vamp', 'ninth_loop', 'turnaround', 'ii_v_i', 'minor_swing'];
  const withoutSynthPopAxis = (fragments: readonly Fragment[]) =>
    fragments.map((f) =>
      f.id === 'axis_progression' ? { ...f, association: f.association.filter((wp) => !(wp.facet === 'harmony' && plain(wp.point, ALL_PRESETS['Synth-pop']!) === 0)) } : f,
    );
  const weighted = (id: string, weight: number) => LIBRARY.map((f) => (f.id === id ? { ...f, association: f.association.map((wp) => ({ ...wp, weight })) } : f));

  it('holds over the library: no preset finds another’s first within 0.3, in any facet', () => {
    expect(leaks(LIBRARY)).toEqual([]);
  });

  it('fires where it should: the dark cadence and the Charleston stabs at weight 1, the haunted progression at 1', () => {
    // (on decision 076's axes, #572: Electro swing, harmonic minor as Spooky is, comes within reach of the dark cadence and
    // the haunted progression, and Deep house and Bossa nova, dorian and ionian, leave it; Spooky finds its own stab first since #572, spooky_stabs)
    // (#540: Synth-pop, Lo-fi, Swing jazz and Electro swing find their own harmony at distance 0 since, so nothing leaks into
    // them; the witness fires on the library without those progressions, as it did before them)
    const unfilled = (fragments: readonly Fragment[]) => fragments.filter((f) => !BEFORE_540.includes(f.id));
    expect(leaks(weighted('dark_cadence', 1))).toEqual([]);
    expect(leaks(unfilled(withoutSynthPopAxis(weighted('dark_cadence', 1))))).toEqual(
      ['Synth-pop', 'Lo-fi hip hop', 'Swing jazz', 'Electro swing'].map((name) => `${name}, harmony: dark_cadence`),
    );
    expect(leaks(weighted('charleston_stabs', 1))).toEqual(
      ['Synth-pop', 'Deep house', 'Lo-fi hip hop', 'Bossa nova', 'Swing jazz'].map((name) => `${name}, stab: charleston_stabs`),
    );
    expect(leaks(unfilled(withoutSynthPopAxis(weighted('haunted_progression', 1))).filter((f) => f.id !== 'dark_cadence'))).toEqual(
      ['Synth-pop', 'Lo-fi hip hop', 'Swing jazz', 'Electro swing'].map((name) => `${name}, harmony: haunted_progression`),
    );
  });
});
