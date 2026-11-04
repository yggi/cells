import { describe, expect, it } from 'vitest';
import { shorten, shortenAll } from './index';
import { placedHints, type RepeatHint } from '../fold/hints';
import { soundsIdentical } from '../sameness';

// Shorten taking hints in (decision 049, #157): what Fold found in the notes, in steps, placed on the lines as written.
const tail = '\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
/** A repeat hint by hand, as `hints(lines)` makes them: spans in steps, each moved from the first. */
const repeat = (spans: [string, number, number][], transforms: RepeatHint['transforms']): RepeatHint => ({
  kind: 'repeat',
  symbol: 'h1',
  spans: spans.map(([line, from, to]) => ({ line, from, to, base: 0 })),
  transforms,
  confidence: 1,
  length: spans[0]![2] - spans[0]![1],
});

describe('placedHints: a hint in steps placed on the tokens as written', () => {
  const braid = { name: 't', tokens: ['0', '4', '7', '~@2', '5', '9', '12', '~@2'] };
  it('a span lands where it starts and ends on token edges, a held token as long as it is written', () => {
    const [h] = placedHints(
      [
        repeat(
          [
            ['t', 0, 5],
            ['t', 5, 10],
          ],
          [{ kind: 'same' }, { kind: 'transposed', by: 5 }],
        ),
      ],
      [braid],
    );
    expect(h!.spans.map((s) => [s.from, s.to])).toEqual([
      [0, 4],
      [4, 8],
    ]);
    expect(h!.transforms).toEqual([{ kind: 'same' }, { kind: 'transposed', by: 5 }]);
  });
  it('a span inside a held token, or on a line not written, is left out; one place left is no hint', () => {
    expect(
      placedHints(
        [
          repeat(
            [
              ['t', 0, 4],
              ['t', 5, 9],
            ],
            [{ kind: 'same' }, { kind: 'transposed', by: 5 }],
          ),
        ],
        [braid],
      ),
    ).toEqual([]);
    expect(
      placedHints(
        [
          repeat(
            [
              ['t', 0, 5],
              ['u', 0, 5],
            ],
            [{ kind: 'same' }, { kind: 'same' }],
          ),
        ],
        [braid],
      ),
    ).toEqual([]);
  });
  it('the first place kept is the one the others move from: their moves are taken from its', () => {
    const [h] = placedHints(
      [
        repeat(
          [
            ['u', 0, 5],
            ['t', 0, 5],
            ['t', 5, 10],
          ],
          [{ kind: 'same' }, { kind: 'transposed', by: 2 }, { kind: 'transposed', by: 7 }],
        ),
      ],
      [braid],
    );
    expect(h!.transforms).toEqual([{ kind: 'same' }, { kind: 'transposed', by: 5 }]);
  });
});

describe('shorten with hints (#157)', () => {
  const src = '&t step=4 0 4 7 11 ~@2 1 5 9 2 6 10 ~ 5 9 12 16 ~@2 8 3' + tail;
  it('a flat text and its hint come out as the structure the hint names: one cell, used at its places, moved', () => {
    const hint = repeat(
      [
        ['t', 0, 6],
        ['t', 13, 19],
      ],
      [{ kind: 'same' }, { kind: 'transposed', by: 5 }],
    );
    const s = shorten(src, { hints: [hint] }).find((x) => x.kind === 'phrase' && x.before.startsWith('0 4 7 11 ~@2'))!;
    expect(s.after).toBe('&m … &m^$5');
    const next = s.apply(src);
    expect(next).toMatch(/^&m1? 0 4 7 11 ~@2$/m);
    expect(soundsIdentical(src, next)).toBe(true);
    const { source } = shortenAll(src, 60, { hints: [hint] });
    expect(soundsIdentical(src, source)).toBe(true);
  });
  it('a wrong hint, spans that are not alike, costs no notes: nothing is offered from it', () => {
    const wrong = repeat(
      [
        ['t', 0, 6],
        ['t', 6, 12],
      ],
      [{ kind: 'same' }, { kind: 'transposed', by: 5 }],
    );
    const said = shorten(src, { hints: [wrong] });
    for (const s of said) expect(soundsIdentical(src, s.apply(src)), s.title).toBe(true);
    expect(said.map((s) => s.title)).toEqual(shorten(src).map((s) => s.title));
  });
});
