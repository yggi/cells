// The frontmatter's YAML subset (#143, decision 047): what it reads, what it refuses (each refusal naming its line), and
// that what it writes it reads back.
import { describe, expect, it } from 'vitest';
import { readYaml, writeYaml, yamlValue, type YamlValue } from './yaml';

const value = (text: string) => {
  const r = readYaml(text);
  if ('problems' in r) throw new Error(JSON.stringify(r.problems));
  return yamlValue(r.node);
};
const refusal = (text: string, firstLine = 1) => {
  const r = readYaml(text, firstLine);
  return 'problems' in r ? r.problems : [];
};

describe('the YAML subset reads', () => {
  it('block maps nested by indenting, and lists of maps whose first entry is on the dash line', () => {
    const text = [
      'id: 4/4',
      'association:',
      '  - point:',
      '      sync: 0.3',
      '      harm: 0',
      '    weight: 1',
      '    facet: meter',
      '  - point:',
      '      sync: 1',
      '    weight: 2',
    ].join('\n');
    expect(value(text)).toEqual({
      id: '4/4',
      association: [
        { point: { sync: 0.3, harm: 0 }, weight: 1, facet: 'meter' },
        { point: { sync: 1 }, weight: 2 },
      ],
    });
  });

  it('keeps the order of keys as written', () => {
    expect(Object.keys(value('zeta: 1\nalpha: 2\nmid: 3') as object)).toEqual(['zeta', 'alpha', 'mid']);
  });

  it('a list indented under its key or level with it, a list of lists, and a key with no value as null', () => {
    expect(value('tags:\n- a\n- b\nnext:')).toEqual({ tags: ['a', 'b'], next: null });
    expect(value('tags:\n  - a\n  - - b\n    - c')).toEqual({ tags: ['a', ['b', 'c']] });
  });

  it('scalars: plain, quoted both ways, decimal numbers, booleans, null; a timestamp stays a string', () => {
    expect(
      value(
        [
          'plain: a plain string, with commas',
          'double: "a \\"quoted\\" string\\nover two lines"',
          "single: 'it''s'",
          'numbers: [0, -1.5, .25, 1e3, +2]',
          'yes: true',
          'no: FALSE',
          'nothing: ~',
          'also: null',
          'created: 2026-10-18T21:00:00Z',
          'day: 2026-10-18',
          'sharp: C#',
          'url: https://example.org/a',
          'empty: []',
          'map: {}',
        ].join('\n'),
      ),
    ).toEqual({
      plain: 'a plain string, with commas',
      double: 'a "quoted" string\nover two lines',
      single: "it's",
      numbers: [0, -1.5, 0.25, 1000, 2],
      yes: true,
      no: false,
      nothing: null,
      also: null,
      created: '2026-10-18T21:00:00Z',
      day: '2026-10-18',
      sharp: 'C#',
      url: 'https://example.org/a',
      empty: [],
      map: {},
    });
  });

  it('a flow list of scalars, quoted items holding commas', () => {
    expect(value('tags: [jam, "Maker Faire, 2026", \'x\', 3]')).toEqual({ tags: ['jam', 'Maker Faire, 2026', 'x', 3] });
  });

  it('empty text as the empty map, and blank lines anywhere', () => {
    expect(value('')).toEqual({});
    expect(value('\na: 1\n\n\nb: 2\n')).toEqual({ a: 1, b: 2 });
  });
});

describe('the YAML subset refuses, naming the line', () => {
  const cases: [string, string, RegExp][] = [
    ['an anchor', 'a: 1\nb: &x 2', /anchor/],
    ['an alias', 'a: 1\nb: *x', /alias/],
    ['a tag', 'a: 1\nb: !!str 2', /tag/],
    ['a second document', 'a: 1\n---', /second document/],
    ['the end of a document', 'a: 1\n...', /second document/],
    ['a directive', 'a: 1\n%YAML 1.2', /directive/],
    ['a comment on its own line', 'a: 1\n# a note', /comment/],
    ['a comment after a value', 'a: 1\nb: 2 # a note', /comment/],
    ['a literal block scalar', 'a: 1\nb: |', /block scalar/],
    ['a folded block scalar', 'a: 1\nb: >', /block scalar/],
    ['a flow map', 'a: 1\nb: {c: 1}', /flow style beyond/],
    ['a flow list in a flow list', 'a: 1\nb: [[c], d]', /flow style beyond/],
    ['a flow list not closed', 'a: 1\nb: [c, d', /flow style beyond/],
    ['an empty flow item', 'a: 1\nb: [c, , d]', /empty item/],
    ['a trailing comma', 'a: 1\nb: [c, d,]', /empty item/],
    ['a complex key', 'a: 1\n? b', /complex key/],
    ['a key given twice', 'a: 1\na: 2', /given twice/],
    ['a quoted key', 'a: 1\n"b": 2', /quoted key/],
    ['a key that is a number', 'a: 1\n2026: 2', /a number/],
    ['a hexadecimal number', 'a: 1\nb: 0x1F', /number the subset doesn't read/],
    ['an octal number', 'a: 1\nb: 0o17', /number the subset doesn't read/],
    ['infinity', 'a: 1\nb: .inf', /number the subset doesn't read/],
    ['not a number', 'a: 1\nb: .nan', /number the subset doesn't read/],
    ['a tab in an indent', 'a:\n\tb: 1', /tab/],
    ['a plain value over two lines', 'a: one\n  two', /two lines/],
    ['a quoted string not closed', 'a: 1\nb: "open', /isn't closed/],
    ['an escape JSON lacks', 'a: 1\nb: "\\x41"', /escape/],
    ['text after a quoted string', 'a: 1\nb: "c" d', /text after/],
    ['a colon and a space in a plain value', 'a: 1\nb: c: d', /colon and a space/],
    ['a line with no key', 'a: 1\nb', /no key/],
    ['a list item among keys', 'a: 1\n- b', /list item where a key/],
    ['an indent no key opened', 'a: 1\n  b: 2', /two lines/],
    ['an indent back to no level', 'a:\n    b: 1\n  c: 2', /indented as no key/],
  ];
  it.each(cases)('%s', (_, text, message) => {
    const problems = refusal(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toMatch(message);
    expect(problems[0]!.line).toBe(text.split('\n').length);
  });

  it("names the file's line when the text starts further down", () => {
    expect(refusal('a: 1\nb: &x 2', 2)).toEqual([{ line: 3, message: expect.stringMatching(/anchor/) }]);
  });
});

describe('the YAML subset writes', () => {
  it('one canonical form: blocks indented by two, a list of scalars as [a, b], a map in a list from its dash', () => {
    expect(writeYaml({ id: '4/4', association: [{ point: { sync: 0.3 }, weight: 1 }], tags: ['a', 'b'], empty: [], none: {}, n: null })).toBe(
      ['id: 4/4', 'association:', '  - point:', '      sync: 0.3', '    weight: 1', 'tags: [a, b]', 'empty: []', 'none: {}', 'n: null', ''].join('\n'),
    );
  });

  // Strings a plain scalar would read as something else, or not at all: each written so that it reads back as itself.
  const STRINGS = [
    '5',
    '-1.5',
    '1e3',
    'true',
    'False',
    'null',
    '~',
    'yes',
    'off',
    '',
    ' padded',
    'a: b',
    'a #b',
    '#b',
    '-x',
    '- x',
    '&bar meter("4/4")',
    '*x',
    '!x',
    '[x]',
    '{x}',
    '|',
    '>',
    '%x',
    '@x',
    '`x`',
    "it's",
    '"q"',
    'two\nlines',
    'tab\there',
    'back\\slash',
    'x,y',
    '0x1F',
    '.inf',
    'ä ♩ 𝄞',
    'C#',
    '2026-10-18T21:00:00Z',
  ];
  it.each(STRINGS.map((s) => [JSON.stringify(s), s]))('%s as a value, an item and a flow item reads back as itself', (_, s) => {
    const v: { [key: string]: YamlValue } = { a: s, b: [s, s], c: [{ d: s }] };
    expect(value(writeYaml(v))).toEqual(v);
  });

  it('writes what it read, byte for byte, when the text was written its way', () => {
    const text = writeYaml({
      id: 'x',
      association: [{ point: { a: 1, b: -0.25 }, weight: 0.5, facet: 'meter' }],
      heard: '2026-10-18T21:00:00Z',
      tags: ['a b', 'c'],
      deep: { list: [[1, 2], { e: 'f' }] },
    });
    expect(writeYaml(value(text) as { [key: string]: YamlValue })).toBe(text);
  });

  // (a YAML 1.1 parser, js-yaml as SilverBullet runs it, reads these as booleans: quoted, each is a string to every parser)
  const OLD_BOOLEANS = ['y', 'Y', 'yes', 'Yes', 'YES', 'n', 'N', 'no', 'No', 'NO', 'on', 'On', 'ON', 'off', 'Off', 'OFF'];
  it.each(OLD_BOOLEANS)('quotes %s, a boolean to YAML 1.1, and reads it back as the string', (word) => {
    expect(writeYaml({ a: word, b: [word] })).toBe(`a: "${word}"\nb: ["${word}"]\n`);
    expect(value(writeYaml({ a: word }))).toEqual({ a: word });
  });

  // (js-yaml's two timestamp forms, a date and a date with a time: unquoted, it reads them as a Date)
  const TIMESTAMPS = [
    '2026-10-18',
    '2026-10-18T21:00:00Z',
    '2026-10-18t21:00:00Z',
    '2026-1-8T9:05:00',
    '2026-10-18 21:00:00',
    '2026-10-18T21:00:00.123+02:00',
    '2026-10-18T21:00:00 -5',
  ];
  it.each(TIMESTAMPS)('quotes the timestamp %s, so a YAML 1.1 parser reads a string, and reads it back equal', (stamp) => {
    expect(writeYaml({ created: stamp, tags: [stamp] })).toBe(`created: "${stamp}"\ntags: ["${stamp}"]\n`);
    expect(value(writeYaml({ created: stamp }))).toEqual({ created: stamp });
  });

  it('leaves plain what is no timestamp to js-yaml: a year, a month, a time alone', () => {
    expect(writeYaml({ a: '2026-10', b: 'v2026-10-18', c: '21:00' })).toBe('a: 2026-10\nb: v2026-10-18\nc: 21:00\n');
  });

  it('refuses a key the subset reads no other way, and a number that is none', () => {
    expect(() => writeYaml({ 'a: b': 1 })).toThrow(/key/);
    expect(() => writeYaml({ '12': 1 })).toThrow(/key/);
    expect(() => writeYaml({ a: Infinity })).toThrow(/Infinity/);
    expect(() => writeYaml({ a: NaN })).toThrow(/NaN/);
  });
});
