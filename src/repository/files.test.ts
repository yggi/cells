// Fragment files (#143, decision 047): every seed file writes back byte for byte and every seed fragment reads back
// unchanged; metadata keeps its unknown keys in order; a malformed file names its problem and its line; the seed library
// built from the files is the meters and the rhythms.
import { newPoint } from '../engine/migrate/axes';
import { describe, expect, it } from 'vitest';
import { readFragment, readFragments, writeFragment, type FragmentFile } from './files';
import { BASS_FRAGMENTS } from './bass';
import { HARMONY_FRAGMENTS } from './harmony';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, KINDERLIED, LO_FI, SPOOKY, stylePoint, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';

// (the three styles read from the examples, #572)
const ACID = stylePoint('acid');
const HAPPY_HARDCORE = stylePoint('happyHardcore');
const ELEKTRO = stylePoint('elektro');
const DARK_AMBIENT = stylePoint('darkAmbient');
// (#542's first four)
const BAROQUE = stylePoint('baroque');
const BLUES_SHUFFLE = stylePoint('bluesShuffle');
const SEA_SHANTY = stylePoint('seaShanty');
const CHIPTUNE = stylePoint('chiptune');
import { RHYTHM_FRAGMENTS } from './rhythms';
import { fragmentsOf, SEED } from './seed';
import { SEED_FILES } from './seed.generated';
import { STAB_FRAGMENTS } from './stab';
import { MOTIF_FRAGMENTS } from './motifs';

const read = (markdown: string): FragmentFile => {
  const r = readFragment(markdown);
  if ('problems' in r) throw new Error(JSON.stringify(r.problems));
  return r;
};
/** A file read without its layout (the blocks and the prose between them, literate.ts), to compare what it holds. */
const bare = ({ layout: _, ...file }: FragmentFile) => file;
const problems = (markdown: string) => {
  const r = readFragment(markdown);
  return 'problems' in r ? r.problems : [];
};

/** A well-formed file, a line each, to break one line of. */
const GOOD = [
  '---', //  1
  'id: a fragment', //  2
  'association:', //  3
  '  - point:', //  4
  '      sync: 0.5', //  5
  '    weight: 1', //  6
  '    facet: rhythm', //  7
  'source: seed', //  8
  '---', //  9
  '', // 10
  '```cells', // 11
  '&x step=16n 0', // 12
  '```', // 13
  '', // 14
  'Some prose.', // 15
];
const good = (change: (lines: string[]) => void = () => {}) => {
  const lines = [...GOOD];
  change(lines);
  return `${lines.join('\n')}\n`;
};

describe('the seed files', () => {
  const files = Object.entries(SEED_FILES);
  it('are a hundred and fifty-nine (the seven mode files one, diatonic, #387; the eight modules, #457, decision 074; the thirteen meters one, meter, #507; the cinquillo, #507; the twenty-one read from the examples for Spooky, Kinderlied, Acid, Happy hardcore, Elektro and Dark ambient, #572)', () =>
    expect(files).toHaveLength(159));

  it.each(files)('%s writes back byte for byte', (_, markdown) => {
    expect(writeFragment(read(markdown))).toBe(markdown);
  });

  it.each(SEED.map((f) => [f.fragment.id, f]))('%s reads back from what it writes, fragment, metadata and prose', (_, { fragment, meta, prose }) => {
    expect(bare(read(writeFragment({ fragment, meta, prose })))).toEqual({ fragment, meta, prose });
  });

  it('build the meters, the rhythms, the bass lines, the harmonies, the instruments and the modes, each in file order, and the library is all of them', () => {
    // (a file whose points carry a template's arguments is a fragment for each set: diatonic is seven, #387; meter thirteen, #507)
    expect(SEED.flatMap(fragmentsOf)).toEqual(
      [...LIBRARY].sort((a, b) => SEED.findIndex((f) => fragmentsOf(f).some((x) => x.id === a.id)) - SEED.findIndex((f) => fragmentsOf(f).some((x) => x.id === b.id))),
    );
    expect(SEED.flatMap(fragmentsOf)).toHaveLength(LIBRARY.length);
    expect(SEED.filter((f) => f.path.startsWith('meters/')).flatMap(fragmentsOf)).toEqual(METER_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('rhythms/')).map((f) => f.fragment)).toEqual(RHYTHM_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('bass/')).map((f) => f.fragment)).toEqual(BASS_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('harmony/')).map((f) => f.fragment)).toEqual(HARMONY_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('instruments/')).map((f) => f.fragment)).toEqual(INSTRUMENT_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('modes/')).flatMap(fragmentsOf)).toEqual(MODE_FRAGMENTS);
  });

  // (the points that come from Jambot's presets, read from the collection `styles` (styles.ts): a file must write each exactly; the points placed
  // by hand, the other meters' and the claves', have the files as their source)
  it("write Jambot's presets' points exactly, where a meter, a drum bar, a bass line or a mode is at a preset", () => {
    const AT_PRESETS: Record<string, readonly object[]> = {
      // (and Kinderlied's 4/4 and the three read from the examples', #572)
      meter: [SYNTH_POP, TECHNO, BOSSA_NOVA, KINDERLIED, ACID, HAPPY_HARDCORE, ELEKTRO, DARK_AMBIENT, BAROQUE, SEA_SHANTY, CHIPTUNE],
      'meter(swing=8n:2/3)': [BLUES_SHUFFLE, SWING_JAZZ, ELECTRO_SWING],
      // (its own point, placed on the old axes at sync .4 harm .9 artic .5 energy .3, moved by decision 076's rule, #572)
      'meter(grouping=meter("5/4"))': [newPoint({ sync: 0.4, harm: 0.9, artic: 0.5, energy: 0.3 }), SPOOKY],
      'meter(swing=16n:.65)': [LO_FI],
      'meter(swing=16n:.6)': [DEEP_HOUSE, FUNK],
      'meter(swing=16n:31/60)': [AMBIENT],
      synth_pop_drums: [SYNTH_POP],
      techno_drums: [TECHNO],
      deep_house_drums: [DEEP_HOUSE],
      ambient_drums: [AMBIENT],
      lo_fi_hip_hop_drums: [LO_FI],
      funk_drums: [FUNK],
      bossa_nova_drums: [BOSSA_NOVA],
      swing_jazz_drums: [SWING_JAZZ],
      funk_bass: [FUNK, LO_FI, BOSSA_NOVA],
      walking_bass: [SWING_JAZZ, ELECTRO_SWING],
      creeping_bass: [SPOOKY],
      dark_cadence: [SPOOKY],
      spooky_drums: [SPOOKY],
      kinderlied_drums: [KINDERLIED],
      acid_drums: [ACID],
      happy_hardcore_drums: [HAPPY_HARDCORE],
      elektro_drums: [ELEKTRO],
      acid_bass: [ACID],
      octave_bass: [ELEKTRO, CHIPTUNE],
      continuo_bass: [BAROQUE],
      blues_walk: [BLUES_SHUFFLE],
      quarter_bass: [SEA_SHANTY],
      ride_shuffle: [BLUES_SHUFFLE],
      shanty_drums: [SEA_SHANTY],
      chip_drums: [CHIPTUNE],
      quiet_pulse: [BAROQUE],
      drone_bass: [DARK_AMBIENT],
      industrial_drums: [DARK_AMBIENT],
      harmonic_minor: [ELECTRO_SWING, SPOOKY, CHIPTUNE],
      'diatonic(mode=aeolian)': [SYNTH_POP, TECHNO, LO_FI, ACID, HAPPY_HARDCORE, ELEKTRO, DARK_AMBIENT],
      'diatonic(mode=dorian)': [DEEP_HOUSE, FUNK, SEA_SHANTY],
      'diatonic(mode=ionian)': [AMBIENT, BOSSA_NOVA, SWING_JAZZ, KINDERLIED, BAROQUE],
      upright_bass: [ELECTRO_SWING],
      brass_stab: [ELECTRO_SWING],
      clarinet: [ELECTRO_SWING],
      muted_trumpet: [ELECTRO_SWING],
      round_bass: [SPOOKY],
      organ: [SPOOKY],
      theremin: [SPOOKY],
      celesta: [SPOOKY],
      sine_bass: [KINDERLIED],
      recorder: [KINDERLIED],
      tb303: [ACID],
      rave_lead: [HAPPY_HARDCORE],
      square_bass: [ELEKTRO],
      prepared_piano: [DARK_AMBIENT],
      drone_pad: [DARK_AMBIENT],
      moog: [BAROQUE],
      blues_horn: [BLUES_SHUFFLE],
      fiddle: [SEA_SHANTY],
      pulse_lead: [CHIPTUNE],
    };
    // (two bass lines sit first at a point of their own, placed by hand, and then at presets: #209)
    const AFTER_OWN_POINT: Record<string, readonly object[]> = { root_bass: [SYNTH_POP, DEEP_HOUSE, AMBIENT, KINDERLIED], pumping_bass: [TECHNO, HAPPY_HARDCORE] };
    // (a meter or a drum bar speaks to no mode, so its point leaves mood out: the preset's other axes, exactly, decision 076)
    const NO_MODE = (id: string) => id.startsWith('meter') || RHYTHM_FRAGMENTS.some((f) => f.id === id);
    const onItsAxes = (id: string, p: object) => (NO_MODE(id) ? Object.fromEntries(Object.entries(p).filter(([axis]) => axis !== 'mood')) : p);
    for (const [id, points] of Object.entries(AT_PRESETS))
      expect(
        LIBRARY.find((f) => f.id === id)!.association.map((wp) => wp.point),
        id,
      ).toEqual(points.map((p) => onItsAxes(id, p)));
    for (const [id, points] of Object.entries(AFTER_OWN_POINT))
      expect(
        LIBRARY.find((f) => f.id === id)!
          .association.slice(1)
          .map((wp) => wp.point),
        id,
      ).toEqual(points);
  });

  // (the seeds written by hand for the point proposed for a Spooky preset, #349, or near it, and lifted from nothing)
  const WRITTEN = new Set([
    // (#542: written for Baroque, lifted from no example)
    'continuo_bass',
    'fifths_sequence',
    'quiet_pulse',
    'spooky_drums',
    'creeping_bass',
    'dark_cadence',
    'ghost_drums',
    'tiptoe_bass',
    'haunted_progression',
    'haunted_pad',
    'kinderlied_drums',
    'axis_progression',
  ]);
  it('each says it is a seed, every drum bar, bass line and harmony and what an example gave where it was lifted from, but those written for Spooky, and each has prose', () => {
    expect(SEED.every((f) => f.meta.source === 'seed' && f.prose.length > 0)).toBe(true);
    expect(new Set(SEED.filter((f) => f.meta.lifted).map((f) => f.fragment.id))).toEqual(
      new Set(
        [
          // (the drum bars, and the ride shuffle, #542, lifted from the jazz example)
          ...RHYTHM_FRAGMENTS.filter((f) => (f.id.endsWith('_drums') || f.id === 'ride_shuffle') && !WRITTEN.has(f.id)),
          ...BASS_FRAGMENTS.filter((f) => !WRITTEN.has(f.id)),
          ...HARMONY_FRAGMENTS.filter((f) => !WRITTEN.has(f.id)),
          ...STAB_FRAGMENTS,
          ...MODE_FRAGMENTS.filter((f) => f.id === 'harmonic_minor'),
          ...MOTIF_FRAGMENTS.filter((f) => ['gypsy', 'raveHook', 'sequencer', 'melodie', 'ghostPhrase', 'royalTheme', 'bluesRiff', 'drunkenSailor', 'korobeiniki'].includes(f.id)),
          ...INSTRUMENT_FRAGMENTS.filter((f) => !['gm_kit', 'bass', 'keys', 'pad', 'lead'].includes(f.id) && !WRITTEN.has(f.id)),
        ].map((f) => f.id),
      ),
    );
    expect(new Set(SEED.map((f) => f.meta.lifted).filter(Boolean))).toEqual(
      new Set([
        'yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8',
        'yggi/jambot packages/engine/src/bass.ts @ 1037a80',
        'yggi/jambot packages/engine/src/themes.ts @ 0a56da9',
        'yggi/cells examples/electroswing.md @ 2c120d4',
        'yggi/cells examples/electroswing.md @ 7622a87',
        'yggi/cells examples/electroswing.md @ 6d1bfa7',
        'yggi/cells examples/spooky.md @ 6d1bfa7',
        // (#572: the parts of Spooky and Kinderlied by facet, and of the three styles read from the examples)
        'yggi/cells examples/spooky.md @ a8de625f',
        'yggi/cells examples/kinderlied.md @ a8de625f',
        'yggi/cells examples/acid.md @ 014c4c73',
        'yggi/cells examples/hypercell.md @ 014c4c73',
        'yggi/cells examples/zell.md @ 014c4c73',
        'yggi/cells examples/ghosts.md @ a8de625f',
        // (#542's first four styles)
        'yggi/cells examples/jazz.md @ b3c0acea',
        'yggi/cells examples/korobeiniki.md @ a8de625f',
        'yggi/cells examples/prelude.md @ a8de625f',
        'yggi/cells examples/ricercar.md @ 3504291b',
        'yggi/cells examples/sailor.md @ 014c4c73',
      ]),
    );
  });
});

describe('a fragment file', () => {
  it('reads its entry, its metadata and its prose', () => {
    expect(bare(read(good()))).toEqual({
      fragment: { id: 'a fragment', text: '&x step=16n 0', association: [{ point: { sync: 0.5 }, weight: 1, facet: 'rhythm' }] },
      meta: { source: 'seed' },
      prose: 'Some prose.',
    });
  });

  it('keeps every metadata key it doesn’t know, in order, and writes it back so', () => {
    const file = good((l) =>
      l.splice(
        8,
        0,
        'zeta: last letter',
        'tags: [Maker Faire, jam]',
        'heard: "2026-10-18T21:00:00Z"',
        'muse:',
        '  confidence: 0.8',
        '  bars: [1, 2]',
        'alpha: 1',
        'created: "2026-10-18"',
      ),
    );
    const { meta } = read(file);
    expect(Object.keys(meta)).toEqual(['source', 'zeta', 'tags', 'heard', 'muse', 'alpha', 'created']);
    expect(meta.muse).toEqual({ confidence: 0.8, bars: [1, 2] });
    expect(meta.heard).toBe('2026-10-18T21:00:00Z');
    expect(writeFragment(read(file))).toBe(file);
  });

  it('with no prose, or a text of several lines, writes back so', () => {
    const bare = good((l) => l.splice(13));
    expect(read(bare).prose).toBe('');
    expect(writeFragment(read(bare))).toBe(bare);
    const two = good((l) => l.splice(12, 0, '&y step=16n 1'));
    expect(read(two).fragment.text).toBe('&x step=16n 0\n&y step=16n 1');
    expect(writeFragment(read(two))).toBe(two);
  });

  it('a point with no facet counts for every facet, and is written with none', () => {
    const file = good((l) => l.splice(6, 1));
    expect(read(file).fragment.association).toEqual([{ point: { sync: 0.5 }, weight: 1 }]);
    expect(writeFragment(read(file))).toBe(file);
  });

  it('takes blank lines around the block and the prose as they come, and writes one', () => {
    const loose = good((l) => l.splice(9, 1, '', '', '')).replace('Some prose.\n', '\n\nSome prose.\n\n\n');
    expect(bare(read(loose))).toEqual(bare(read(good())));
    expect(writeFragment(read(loose))).toBe(good());
  });

  it('a writer refuses metadata named as the entry', () => {
    expect(() => writeFragment({ ...read(good()), meta: { id: 'x' } })).toThrow(/id/);
  });
});

describe('a malformed file names its problem and its line', () => {
  const cases: [string, string, number, RegExp][] = [
    ['no frontmatter', good((l) => l.splice(0, 9)), 1, /no frontmatter/],
    ['frontmatter never closed', good((l) => l.splice(8, 1)), 1, /never closed/],
    ['no cells block', good((l) => l.splice(10, 3)), 9, /no ```cells block/],
    ['a second cells block never closed', good((l) => l.push('', '```cells', '&y 0')), 17, /never closed/],
    ['a cells block never closed', good((l) => l.splice(12)), 11, /never closed/],
    ['an association point without a number', good((l) => (l[4] = '      sync: high')), 5, /sync is "high", not a number/],
    ['a weight that is no number', good((l) => (l[5] = '    weight: heavy')), 6, /weight is "heavy", not a number/],
    ['a point with no weight', good((l) => l.splice(5, 1)), 4, /no weight/],
    ['a weight of 0', good((l) => (l[5] = '    weight: 0')), 4, /weight 0, not a number > 0/],
    ['a point with no axes', good((l) => l.splice(4, 1)), 4, /a map of axes to numbers/],
    ['a facet that is no name', good((l) => (l[6] = '    facet: 3')), 7, /facet is 3, not a name/],
    ['a key a point doesn’t read', good((l) => l.splice(6, 0, '    colour: red')), 7, /colour is none of point, weight, facet/],
    ['an association that is no list', good((l) => l.splice(3, 4, '  sync: 0.5')), 4, /a list of points/],
    ['no id', good((l) => l.splice(1, 1)), 1, /no id/],
    ['an id that is a number', good((l) => (l[1] = 'id: 5')), 2, /the id is 5, not a string: quote it/],
    ['no association', good((l) => l.splice(2, 5)), 1, /no association/],
    ['an empty text', good((l) => (l[11] = ' ')), 11, /no text/],
    ['YAML the subset refuses', good((l) => (l[7] = 'source: &who seed')), 8, /anchor/],
  ];
  it.each(cases)('%s', (_, markdown, line, message) => {
    const found = problems(markdown);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]).toEqual({ line, message: expect.stringMatching(message) });
  });

  it('an id given twice in a library, with the path and line of the second', () => {
    const twice = readFragments({ 'one/a': good(), 'one/b': good((l) => (l[7] = 'source: muse')) });
    expect(twice).toEqual({ problems: ['one/b:2: the id a fragment is given twice (first in one/a)'] });
  });

  it('every file’s problems in a library, each with its path', () => {
    const r = readFragments({ ok: good(), bad: good((l) => (l[4] = '      sync: high')) });
    expect(r).toEqual({ problems: ['bad:5: point 1: sync is "high", not a number'] });
  });
});
