// Extraction (#641, C4 of yggi/cell-studio#621): lines of a piece as a fragment, the piece taking it and playing the
// same. The sweep over every example is extract.slow.test.ts's.
import { describe, expect, it } from 'vitest';
import { extract } from './extract';
import { resolveSeed } from './library';
import { EXAMPLES } from '../engine/examples';

const O = { id: 'my_vamp_bass', resolve: resolveSeed };
/** Kinderlieder's vamp and bass, written out (the plan's mock-up, yggi/cell-studio docs/notes/fragments.md). */
const PIECE = [
  '&bar from meter &tempo',
  '&tempo step=100bpm',
  '&key from diatonic(mode=ionian) C',
  '&harm over=&key step=1m cycle=8 [0,2,4]!4 [4,6,8]!4',
  '&bassline over=&harm step=2n 0 0',
  '&v s=sine loop=C3',
  '&out map=sample [&bassline * &v]',
].join('\n');

describe('extract', () => {
  it('proposes heads, the one main parameter and the private rest, and the piece plays the same', () => {
    const r = extract(PIECE, [4, 5], O);
    expect(r).toMatchObject({
      heads: ['&bassline'],
      main: '&key',
      private: ['&harm'],
      sounds: [],
      line: '&bassline from my_vamp_bass &key',
      same: true,
      known: null,
      fragment: ['&bassline from &key', PIECE.split('\n')[3], PIECE.split('\n')[4]].join('\n'),
    });
    if ('why' in r) throw new Error(r.why);
    expect(r.piece.split('\n')).toEqual([...PIECE.split('\n').slice(0, 3), r.line, ...PIECE.split('\n').slice(5)]);
  });

  it('takes what a from line passes as its main parameter: Kinderlieder’s vamp and bass, as it takes them today', () => {
    const k = EXAMPLES.kinderlied.source;
    const at = (head: string) => k.split('\n').findIndex((l) => l.startsWith(head)) + 1;
    const r = extract(k, [at('&harm '), at('&bassline ')], O);
    if ('why' in r) throw new Error(r.why);
    // (`&harm from vamp_to_the_fifth &key` passes &key: an argument, a value, never a sound read by name)
    expect([r.main, r.sounds, r.same]).toEqual(['&key', [], true]);
    expect(r.fragment.split('\n')[0]).toBe('&harm, &bassline from &key');
    expect(r.line).toBe('&harm, &bassline from my_vamp_bass &key');
    // (the bass alone: what its from line passes, &harm, is its main parameter)
    const bass = extract(k, [at('&bassline ')], O);
    if ('why' in bass) throw new Error(bass.why);
    expect([bass.main, bass.sounds, bass.same]).toEqual(['&harm', [], true]);
  });

  it('says when the library holds the fragment already', () => {
    const r = extract(PIECE, [5], O);
    expect(r).toMatchObject({ main: '&harm', same: true, known: 'root_bass' });
  });

  it('quotes an id that is no word', () => {
    expect(extract(PIECE, [4, 5], { ...O, id: 'my vamp' })).toMatchObject({ line: '&bassline from "my vamp" &key', same: true });
  });

  it('leaves what it reads as a sound free, read by name, a mix’s terms too (decision 065 §3)', () => {
    const groove = [
      '* from gm_kit',
      '&bar meter("4/4") step=120bpm',
      '&level map=amp .8',
      '&kick step=8n &bd ~ &bd ~',
      '&groove [&kick * &level]',
      '&out map=sample [&groove]',
    ].join('\n');
    expect(extract(groove, [4], O)).toMatchObject({ heads: ['&kick'], main: null, sounds: ['&bd'], same: true });
    expect(extract(groove, [5], O)).toMatchObject({ heads: ['&groove'], main: null, sounds: ['&kick', '&level'], same: true });
    expect(extract(groove, [1], O)).toEqual({ why: expect.stringMatching(/^a line given defines no cell of its own/) });
  });

  it('says why lines are no fragment yet', () => {
    expect(extract(PIECE, [7], O)).toEqual({ why: expect.stringMatching(/^the lines hold a card, &out/) });
    // (a selector over the band, with the line the band reads beside it: the radio's &intensity and &form, #810)
    const radio = EXAMPLES.radio.source;
    const at = radio.split('\n').findIndex((l) => l.startsWith('&intensity ')) + 1;
    expect(extract(radio, [at, at + 1], O)).toEqual({ why: expect.stringMatching(/^the lines hold a selector over the band, &form/) });
    expect(extract(`${PIECE}\n&spare s=sine loop=C5`, [8], O)).toEqual({ why: expect.stringMatching(/^nothing else in the piece reads/) });
    expect(extract(PIECE, [1], O)).toEqual({ why: expect.stringMatching(/^the lines define the piece's main meter, &bar/) });
    const twoInputs = PIECE.replace('&bassline over=&harm step=2n 0 0', '&bassline over=&harm step=&tempo 0 0');
    expect(extract(twoInputs, [5], O)).toEqual({ why: expect.stringMatching(/^the lines read &harm, &tempo/) });
    const meter = ['&bar meter("4/4") step=100bpm', '&line step=8n 0 2', '&v s=sine loop=C4', '&out map=sample [&line * &v]'].join('\n');
    expect(extract(meter, [1, 2], O)).toEqual({ why: expect.stringMatching(/^the lines define the piece's main meter, &bar/) });
  });
});
