// Law L11 (I4 on #26, decision 006: `+` and `*` commute), over every example: each product of a mix written with its
// factors reversed (`[&a * &b, &c]` → `[&b * &a, &c]`, a sum's terms each so) and each pitch sum with its terms
// reversed (`(&walk + &changes)` → `(&changes + &walk)`), the piece plays what it played (S1). An invariant has no
// exception (decision 083): an example it doesn't hold for is a bug against it, listed here by name with its issue, and
// it fails here once it holds, so the list only shrinks.
import { describe, expect, it } from 'vitest';
import { soundsIdentical } from './sameness';
import { EXAMPLES } from './examples';
import { resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed };

/** The text with every mix's products and every pitch sum written the other way round; `from` lines and comments as they are. */
function commuted(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      /^\s*(#|\/\/)/.test(line) || / from /.test(line)
        ? line
        : line
            .replace(
              /\[([^[\]()"]+)\]/g,
              (_, inner: string) =>
                `[${inner
                  .split(', ')
                  .map((entry) =>
                    entry
                      .split(' + ')
                      .map((t) => t.split(' * ').reverse().join(' * '))
                      .join(' + '),
                  )
                  .join(', ')}]`,
            )
            .replace(/\((&[A-Za-z_]\w*(?:\^-?\d+)?(?: \+ (?:&[A-Za-z_]\w*|-?\d+(?:\.\d+)?))+)\)/g, (_, inner: string) => `(${inner.split(' + ').reverse().join(' + ')})`),
    )
    .join('\n');
}

/** Where it doesn't hold yet: none since #687, a gate's stack reading its line wherever it is written. */
const BROKEN: Readonly<Record<string, string>> = {};

// law L11
describe('`+` and `*` commute: every example with its products and pitch sums written the other way round plays the same (L11, I4)', () => {
  it('rewrites most examples, so the law is tested: 73 of 86', () => {
    const changed = Object.values(EXAMPLES).filter((p) => commuted(p.source) !== p.source).length;
    expect(changed).toBeGreaterThanOrEqual(70);
  });

  it.each(Object.entries(EXAMPLES).filter(([, p]) => commuted(p.source) !== p.source))('%s', (key, p) => {
    expect(soundsIdentical(p.source, commuted(p.source), undefined, O), key).toBe(!(key in BROKEN));
  });

  it('is shown firing: a product of a line and a sound that sound different in its two orders', () => {
    const text = (stack: string) =>
      [
        '&bar meter("4/4") step=120bpm',
        '&bd note=36 s=sine loop=A1',
        '&kit &bd',
        '&kick step=4n &bd!4',
        '&form step=1m 1 .5',
        `&lines ${stack}`,
        '&g play=&lines &kit',
        '&out map=sample [&g]',
      ].join('\n');
    expect(soundsIdentical(text('[&kick * &form]'), commuted(text('[&kick * &form]')), undefined, O)).toBe(false);
  });
});
