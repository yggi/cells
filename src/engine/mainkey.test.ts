import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import type { CompileResult } from './program';

// The piece's main key (`CompileResult.mainKey`, #124): the first cell in the text whose own braid is scale(…), which a host
// that shows one key and Normalise's interface name `&key` read. `over=key`, the bare word that once read it, went with
// the forms retired before 1.0.0 (#643): a line names the key it reads, over=&key.

const lines = (...xs: string[]) => xs.join('\n');
/** The host's lines, first: its meter and its key. */
const host = (key: string) => lines('&bar meter("4/4") step=104bpm', `&key ${key}`);

const compiled = (src: string): CompileResult => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return r;
};
const errors = (src: string) =>
  compileSource(src)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe("the piece's main key", () => {
  it('is the first cell in the text whose braid is scale(…), whatever its name, and wherever it is written', () => {
    const two = lines('&bar meter("4/4") step=104bpm', '&bass over=&key step=16n 0', '&chords scale(aeolian, A)', '&key scale(dorian, D)');
    expect(compiled(two).mainKey).toBe('chords');
    expect(compiled(lines(host('scale(dorian, D)'), '&bass over=&key step=16n 0')).mainKey).toBe('key');
  });

  it('is never an unnamed scale(…) (over=scale(…), &( … )) or a copy (base=)', () => {
    const r = compiled(lines('&copy base=&key 0 2', '&tune over=scale(minor, A) step=1 0', '&mode over=&(scale(minor, E)) 0 2', host('scale(dorian, D)')));
    expect(r.mainKey).toBe('key');
    expect(compiled(lines('&bar meter("4/4") step=104bpm', '&tune over=scale(minor, A) step=1 0')).mainKey).toBeUndefined();
  });

  it('is none for a key written as a cell over the 12, not as scale(…)', () => {
    const src = lines('&bar meter("4/4") step=104bpm', '&key shift=2', '&dorian over=&key scan(2 1 2 2 2 1 2)', '&bass over=&dorian step=16n 0');
    expect(compiled(src).mainKey).toBeUndefined();
  });
});

describe('over=key is no form', () => {
  it('a bare word after over= is an error: a line names the key it reads', () => {
    for (const word of ['key', 'keys'])
      expect(errors(lines(host('scale(dorian, D)'), `&bass over=${word} step=16n 0`))).toEqual([expect.stringMatching(/^Expected a cell or scale\(name, tonic\) after over=/)]);
  });
});
