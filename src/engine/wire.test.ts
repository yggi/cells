/**
 * A braid fill's arguments on the wire (decision 085 §8.3, #749, #792 6d): each its core, written in the wire grammar
 * (`docs/language/plugin-wire.md`): references written in, the sugar gone, a key it is read over handed as semitones.
 * The stand-in, `echo`, keeps what it is handed and answers its subject.
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import type { PluginFragment } from './fills';
import { wireArg } from './wire';

const ECHO = '&out from (&beat) &subject\n&out fill()\n&beat 1';
const resolve = (id: string) => (id === 'echo' ? ECHO : null);
let handed: Readonly<Record<string, string>> = {};
const echo: PluginFragment = {
  id: 'echo',
  fragment: 'echo',
  fills: { out: { fuel: 1 } },
  origin: 0,
  cycle: 0,
  stepSeconds: 0,
  fill: (_name, _lap, args) => {
    handed = args;
    return args.subject ?? '';
  },
};
const handedTo = (text: string) => {
  handed = {};
  const r = compileSource(text, undefined, { resolve, plugins: [echo] });
  // (what it says of the fill: the piece's own warnings, a voice it lacks, are not the wire's)
  return { handed, warnings: r.diagnostics.filter((d) => d.severity === 'error' || d.message.includes('refused')).map((d) => `${d.severity} ${d.span.line}: ${d.message}`) };
};

describe('a braid fill’s arguments are their core (#749)', () => {
  const key = '&key scale(major, D)\n&m over=&key 0 2 4\n';

  it('a reference, a ! and a ^n reach it as the steps they play, with the key they are read over', () => {
    const { handed, warnings } = handedTo(`${key}&x from echo [&m!2 &m^2]`);
    expect(warnings).toEqual([]);
    expect(handed).toEqual({ beat: '1', subject: '0@1/9 2@1/9 4@1/9 0@1/9 2@1/9 4@1/9 2@1/9 4@1/9 6@1/9', 'subject:key': '2 4 6 7 9 11 13' });
    // (the same as its written-out form: the steps written as they play, over the same key)
    const out = handedTo(`${key}&w over=&key [0 2 4 0 2 4 2 4 6]\n&x from echo &w`).handed;
    expect(out.subject).toBe(handed.subject);
    expect(out['subject:key']).toBe(handed['subject:key']);
  });

  it('renamed (L1), the text hands it the same arguments', () => {
    const before = handedTo(`${key}&x from echo(beat=2) [&m!2 &m^2]`).handed;
    const after = handedTo('&tonality scale(major, D)\n&motif over=&tonality 0 2 4\n&x from echo(beat=2) [&motif!2 &motif^2]').handed;
    expect(after).toEqual(before);
  });

  it('a number or a word as written; one with no key, no key', () => {
    expect(handedTo('&x from echo(beat=3/4) 0 ~ 2@2').handed).toEqual({ beat: '3/4', subject: '0 ~ 2@2' });
  });

  it('what the grammar can’t carry refuses the fill: chance, a key that moves', () => {
    expect(handedTo('&x from echo [0? 2]').warnings).toEqual(['warning 1: "echo" refused: its subject= [0? 2] draws by chance, and a plugin can\'t draw cells\' (wire 1)']);
    const moving = '&tonic step=1 C D\n&key scale(major, &tonic)\n&m over=&key 0 2 4\n&x from echo &m';
    expect(handedTo(moving).warnings.filter((w) => w.includes('refused'))).toEqual([
      'warning 4: "echo" refused: its subject= &m is read over a key that moves, and a plugin is handed one key (wire 1)',
    ]);
  });
});

describe('the wire grammar, version 1', () => {
  const ctx = '&key scale(major, D)\n&motif over=&key 0 2 4 2\n&a 0 2\n&b 4 5\n&r 0 ~ 2@2';
  it.each([
    ['12', { text: '12' }],
    ['dorian', { text: 'dorian' }],
    ['&a!2 &b^2', { text: '0 2 0 2 6 7' }],
    ['&motif', { text: '0 2 4 2', key: '2 4 6 7 9 11 13' }],
    ['[0 2]!2 [4, 6]', { text: '0@1/2 2@1/2 0@1/2 2@1/2 [4, 6]' }],
    ['&r', { text: '0 ~ 2@2' }],
    ['0 2#', { text: '0 2#' }],
  ])('%s', (value, wire) => expect(wireArg(value, ctx)).toEqual(wire));

  it.each(['<0 2>', '0? 2', '[0|2] 4', 'free(0..7)'])('%s is refused', (value) => expect(wireArg(value, ctx)).toHaveProperty('refused'));
});

describe('the wire’s version', () => {
  it('a plugin that reads a newer wire than cells speaks is refused', () => {
    const later: PluginFragment = { ...echo, wire: 2 };
    const r = compileSource('&x from echo 0 2', undefined, { resolve, plugins: [later] });
    expect(r.diagnostics.filter((d) => d.message.includes('refused')).map((d) => d.message)).toEqual([
      '"echo" refused: it reads wire 2, and cells speaks wire 1 (docs/language/plugin-wire.md)',
    ]);
  });
});
