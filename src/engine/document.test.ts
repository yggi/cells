// A document gives fragments (decision 082): a file of several signatures, each a part taken by its head; a piece and a
// fragment one kind of file, in one namespace; Kinderlieder's six tunes its parts, and Migrate's rewrite of old takes.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { planOf } from './host';
import { migrate } from './migrate';
import { readPiece, withLockfile } from './piecefile';
import { soundsIdentical } from './sameness';
import { windowAt } from './schedule';
import { partOf, partsOf, usesIn } from './use';
import { LIBRARY, PARTS, resolveSeed, usesOf } from '../repository/library';

const DOC = [
  '&twinkle from &key',
  '&twinkle over=&key step=8n 0 0 4 4 5 5 4@2',
  '&wonder from &key',
  '&wonder over=&key step=8n 3 3 2 2 1 1 0@2',
  '&bar meter("4/4") step=100bpm',
  '&key scale(major, C)',
  '&tune step=8n &twinkle &wonder',
  '&v s=sine loop=C4',
  '&out map=sample [&tune * &v]',
].join('\n');
const resolve = (id: string, hash?: string) => (id === 'tunes' ? DOC : resolveSeed(id, hash));
const O = { resolve };
const taking = (line: string, play: string) => ['&bar meter("4/4") step=100bpm', '&key scale(dorian, D)', line, '&v s=tri loop=C4', `&out map=sample [&${play} * &v]`].join('\n');
const errors = (text: string, options = O) =>
  compileSource(text, undefined, options)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('a part of a document', () => {
  it('is its signature and the lines its heads read, never its main parameter’s line nor another part', () => {
    expect(partsOf(DOC)).toEqual([['twinkle'], ['wonder']]);
    expect(partOf(DOC, 'wonder')).toBe('&wonder from &key\n&wonder over=&key step=8n 3 3 2 2 1 1 0@2');
    expect(partOf(DOC, 'tune')).toBeNull();
    // (a text of one signature is its own part)
    const one = '&a from &key\n&a over=&key 0 2';
    expect(partOf(one, 'a')).toBe(one);
  });

  it('is taken by its head, or renamed by its head, over the key the line gives; a part is hashed alone', () => {
    const byHead = compileSource(taking('&wonder from tunes &key', 'wonder'), undefined, O);
    const renamed = compileSource(taking('&w=wonder from tunes &key', 'w'), undefined, O);
    expect(byHead.diagnostics).toEqual([]);
    expect(renamed.diagnostics).toEqual([]);
    expect(byHead.takes?.[0]).toMatchObject({ id: 'tunes', part: 'wonder' });
    expect(byHead.takes?.[0]?.hash).toBe(renamed.takes?.[0]?.hash);
    // (the piece's own lines change no part's hash)
    const edited = DOC.replace('&key scale(major, C)', '&key scale(minor, A)');
    const after = compileSource(taking('&wonder from tunes &key', 'wonder'), undefined, { resolve: (id: string) => (id === 'tunes' ? edited : resolveSeed(id)) });
    expect(after.takes?.[0]?.hash).toBe(byHead.takes?.[0]?.hash);
  });

  it('says so where a line names no part, or takes * from a document', () => {
    expect(errors(taking('&w from tunes &key', 'w'))).toContainEqual('"tunes" gives no part headed &w: its parts are &twinkle · &wonder');
    expect(errors('&bar meter("4/4") step=100bpm\n&key scale(major)\n* from tunes')).toContainEqual(expect.stringMatching(/^"tunes" gives 2 parts, each taken by its head/));
  });

  it('plays its document as a piece, over its own key', () => {
    expect(errors(DOC)).toEqual([]);
    expect(windowAt(planOf(DOC, undefined, O), 0, 4).events.length).toBeGreaterThan(0);
  });

  it('is locked by its document and head, `tunes/wonder`', () => {
    const r = compileSource(taking('&wonder from tunes &key', 'wonder'), undefined, O);
    const file = readPiece(`---\ntitle: T\n---\n\n\`\`\`cells\n${taking('&wonder from tunes &key', 'wonder')}\n\`\`\`\n`);
    if ('problems' in file) throw new Error('reads');
    expect(withLockfile(file, r.takes!).frontmatter.uses).toEqual([{ id: 'tunes/wonder', hash: r.takes![0]!.hash }]);
  });
});

describe('Kinderlieder gives its six tunes (decision 082)', () => {
  it('as parts, each taken by its head from another piece, over that piece’s key', () => {
    const k = EXAMPLES.kinderlied.source;
    expect(partsOf(k)).toEqual([['twinkle'], ['wonder'], ['haenschen'], ['hinein'], ['heim'], ['weinet']]);
    for (const head of ['twinkle', 'wonder', 'haenschen', 'hinein', 'heim', 'weinet'])
      expect(errors(taking(`&${head} from kinderlied &key`, head), { resolve: resolveSeed }), head).toEqual([]);
  });

  it('and Migrate rewrites a take of an old id as a take of the part, playing the same', () => {
    const old = [
      '&bar meter("4/4") step=100bpm',
      '&key scale(major, C)',
      '&twinkle from twinkle &key',
      '&tw from wonder &key # the answer',
      '&song from ternary(answer=&tw) &twinkle',
      '&v s=sine loop=C4',
      '&out map=sample [&song * &v]',
    ].join('\n');
    // (a compile refuses the old id: it is a piece's key now, one namespace, and wonder resolves to nothing)
    expect(errors(old, { resolve: resolveSeed }).length).toBeGreaterThan(0);
    const m = migrate(old, { resolve: resolveSeed });
    expect(m.source.split('\n').slice(2, 4)).toEqual(['&twinkle from kinderlied &key', '&tw=wonder from kinderlied &key # the answer']);
    expect(errors(m.source, { resolve: resolveSeed })).toEqual([]);
    expect(soundsIdentical(m.source, old, 8, { resolve: resolveSeed, old: true })).toBe(true);
  });
});

describe('how a document plays its parts (#692)', () => {
  it('reads each line that takes a fragment over a head, with its named arguments as written', () => {
    const text = ['&a from &key', '&a over=&key step=8n 0 1', '&s from ternary(answer=&b, bridge=&a^1) &a', '&t from call_and_answer &b', '&u from AABA label="x" &a'].join('\n');
    expect(usesIn(text, 'a')).toEqual([
      { id: 'ternary', args: { answer: '&b', bridge: '&a^1' } },
      { id: 'AABA', args: {} },
    ]);
    expect(usesIn(text, 'b')).toEqual([{ id: 'call_and_answer', args: {} }]);
    expect(usesIn(text, 'c')).toEqual([]);
  });

  it('gives Twinkle its ternary, wonder its answer, and Hänschen klein its rounded binary, its three lines by role', () => {
    expect(usesOf('kinderlied/twinkle')).toEqual([{ id: 'ternary', args: { answer: 'kinderlied/wonder' } }]);
    expect(usesOf('kinderlied/haenschen')).toEqual([
      {
        id: 'rounded_binary',
        args: { answer: 'kinderlied/hinein', close: 'kinderlied/heim', bridge: 'kinderlied/weinet' },
      },
    ]);
  });

  it('gives none to a part its document takes nothing over, nor to any fragment that isn’t a part', () => {
    const played = ['kinderlied/twinkle', 'kinderlied/haenschen'];
    expect(PARTS.filter((f) => !played.includes(f.id) && usesOf(f.id).length > 0).map((f) => f.id)).toEqual([]);
    expect(LIBRARY.filter((f) => !PARTS.includes(f) && usesOf(f.id).length > 0).map((f) => f.id)).toEqual([]);
    expect(usesOf('nowhere/twinkle')).toEqual([]);
  });

  it('names each part its argument names as its document gives it, so a frontend takes it by that id', () => {
    for (const use of [...usesOf('kinderlied/twinkle'), ...usesOf('kinderlied/haenschen')])
      for (const id of Object.values(use.args))
        expect(
          PARTS.some((f) => f.id === id),
          id,
        ).toBe(true);
  });
});
