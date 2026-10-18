// Fragment files (#143, decision 047): every seed file writes back byte for byte and every seed fragment reads back
// unchanged; metadata keeps its unknown keys in order; a malformed file names its problem and its line; the seed library
// built from the files is the meters and the rhythms.
import { describe, expect, it } from 'vitest';
import { readFragment, readFragments, writeFragment, type FragmentFile } from './files';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';
import { SEED } from './seed';
import { SEED_FILES } from './seed.generated';

const read = (markdown: string): FragmentFile => {
  const r = readFragment(markdown);
  if ('problems' in r) throw new Error(JSON.stringify(r.problems));
  return r;
};
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
  it('are twenty-six', () => expect(files).toHaveLength(26));

  it.each(files)('%s writes back byte for byte', (_, markdown) => {
    expect(writeFragment(read(markdown))).toBe(markdown);
  });

  it.each(SEED.map((f) => [f.fragment.id, f]))('%s reads back from what it writes, fragment, metadata and prose', (_, { fragment, meta, prose }) => {
    expect(read(writeFragment({ fragment, meta, prose }))).toEqual({ fragment, meta, prose });
  });

  it('build the meters and the rhythms, in file order, and the library is both', () => {
    expect(SEED.map((f) => f.fragment)).toEqual(LIBRARY);
    expect(SEED.filter((f) => f.path.startsWith('meters/')).map((f) => f.fragment)).toEqual(METER_FRAGMENTS);
    expect(SEED.filter((f) => f.path.startsWith('rhythms/')).map((f) => f.fragment)).toEqual(RHYTHM_FRAGMENTS);
  });

  // (the points that come from Jambot's presets, lifted into presets.ts: a file must write each exactly; the points placed
  // by hand, the other meters' and the claves', have the files as their source)
  it("write Jambot's presets' points exactly, where a meter or a drum bar is at a preset", () => {
    const AT_PRESETS: Record<string, readonly object[]> = {
      '4/4': [SYNTH_POP, TECHNO, BOSSA_NOVA],
      '4/4 swung on 8n': [SWING_JAZZ],
      '4/4 leaning on 16n': [LO_FI],
      '4/4 leaning lightly on 16n': [DEEP_HOUSE, FUNK],
      '4/4 leaning faintly on 16n': [AMBIENT],
      'Synth-pop drums': [SYNTH_POP],
      'Techno drums': [TECHNO],
      'Deep house drums': [DEEP_HOUSE],
      'Ambient drums': [AMBIENT],
      'Lo-fi hip hop drums': [LO_FI],
      'Funk drums': [FUNK],
      'Bossa nova drums': [BOSSA_NOVA],
      'Swing jazz drums': [SWING_JAZZ],
    };
    for (const [id, points] of Object.entries(AT_PRESETS))
      expect(
        LIBRARY.find((f) => f.id === id)!.association.map((wp) => wp.point),
        id,
      ).toEqual(points);
  });

  it('each says it is a seed, every drum bar where it was lifted from, and each has prose', () => {
    expect(SEED.every((f) => f.meta.source === 'seed' && f.prose.length > 0)).toBe(true);
    expect(SEED.filter((f) => f.meta.lifted).map((f) => f.fragment.id)).toEqual(RHYTHM_FRAGMENTS.filter((f) => f.id.endsWith(' drums')).map((f) => f.id));
    expect(new Set(SEED.map((f) => f.meta.lifted).filter(Boolean))).toEqual(new Set(['yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8']));
  });
});

describe('a fragment file', () => {
  it('reads its entry, its metadata and its prose', () => {
    expect(read(good())).toEqual({
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
        'heard: 2026-10-18T21:00:00Z',
        'muse:',
        '  confidence: 0.8',
        '  bars: [1, 2]',
        'alpha: 1',
        'created: 2026-10-18',
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
    expect(read(loose)).toEqual(read(good()));
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
    ['two cells blocks', good((l) => l.push('', '```cells', '&y 0', '```')), 17, /a second ```cells block \(the first is at line 11\)/],
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
    ['prose before the block', good((l) => l.splice(9, 0, '# A heading')), 10, /prose before the ```cells block/],
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
