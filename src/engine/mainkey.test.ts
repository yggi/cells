import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { eventsBetween, plan } from './realize';

// #124: a bare over=key reads the piece's main key, as a bare tap reads its main meter (decision 040): the first cell in
// the text whose own braid is scale(…). With none, it is an error, never a default key (#117).

const lines = (...xs: string[]) => xs.join('\n');
/** Funk's bass, #117's case 2 (tools/open-fragments.ts, FUNK_BASS), with its table written `over=` as given. */
const bass = (over: string) =>
  lines(`&bass over=${over} step=16n 7@10 14@3 7@3`, '&bassLevel map=amp step=16n .458553@10 .321409@3 .321409@3', '&bassOut play=&bass level=&bassLevel &bassV', '&bassV loop=C1');
/** The host's lines, first: its meter and its key. */
const host = (key: string) => lines('&bar meter("4/4") step=104bpm', `&key ${key}`);
/** 8 bars of 4/4 at 104 bpm, as #117 listens. */
const SECONDS = (8 * 4 * 60) / 104;

const compiled = (src: string): CompileResult => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return r;
};
const notes = (src: string) => {
  const r = compiled(src);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, SECONDS).map((e) => ({ voice: e.voice, at: +e.at.toFixed(9), dur: +e.dur.toFixed(9), freq: +e.freq.toFixed(6) }));
};
const errors = (src: string) =>
  compileSource(src)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => ({ message: d.message, line: d.span.line, col: d.span.col, len: d.span.len }));

describe("over=key reads the piece's main key", () => {
  for (const key of ['scale(dorian, D)', 'scale(aeolian, A)'])
    it(`plays the bass of #117's case 2 in ${key} as over=&key does`, () => {
      const bare = notes(lines(host(key), bass('key')));
      expect(bare).toHaveLength(24);
      expect(bare).toEqual(notes(lines(host(key), bass('&key'))));
      expect(compiled(lines(host(key), bass('key'))).cells.get('bass')!.over).toBe('key');
    });

  it('differs between the two keys (the comparison can fail)', () => {
    expect(notes(lines(host('scale(dorian, D)'), bass('key')))).not.toEqual(notes(lines(host('scale(aeolian, A)'), bass('key'))));
  });

  it('is the first cell in the text whose braid is scale(…), whatever its name, and wherever it is written', () => {
    const two = lines('&bar meter("4/4") step=104bpm', bass('key'), '&chords scale(aeolian, A)', '&key scale(dorian, D)');
    const r = compiled(two);
    expect(r.mainKey).toBe('chords');
    expect(r.cells.get('bass')!.over).toBe('chords');
    expect(notes(two)).toEqual(notes(lines(host('scale(aeolian, A)'), bass('&key'))));
    // (over=&key keeps its meaning: the cell it names)
    expect(notes(lines('&bar meter("4/4") step=104bpm', '&chords scale(aeolian, A)', '&key scale(dorian, D)', bass('&key')))).toEqual(
      notes(lines(host('scale(dorian, D)'), bass('&key'))),
    );
  });

  it('is never an unnamed scale(…) (over=scale(…), &( … )) or a copy (base=)', () => {
    const r = compiled(lines('&copy base=&key 0 2', '&tune over=scale(minor, A) step=1 0', '&mode over=&(scale(minor, E)) 0 2', host('scale(dorian, D)')));
    expect(r.mainKey).toBe('key');
    expect(compiled(lines('&bar meter("4/4") step=104bpm', '&tune over=scale(minor, A) step=1 0')).mainKey).toBeUndefined();
  });
});

describe('with no main key', () => {
  it('over=key is an error at the word, saying the piece has none: no default key plays', () => {
    const src = lines('&bar meter("4/4") step=104bpm', '&tune over=scale(minor, A) step=1 0', bass('key'));
    expect(errors(src)).toEqual([
      { message: expect.stringMatching(/^over=key reads the piece's main key.*the piece has no main key: write one \(&key scale/), line: 3, col: 12, len: 3 },
    ]);
    expect(compileSource(src).ok).toBe(false);
  });

  it('a key written as a cell over the 12, not as scale(…), is no main key', () => {
    const src = lines('&bar meter("4/4") step=104bpm', '&key shift=2', '&dorian over=&key scan(2 1 2 2 2 1 2)', bass('key'));
    expect(errors(src).map((e) => e.message)).toEqual([expect.stringMatching(/the piece has no main key/)]);
  });
});

describe('over=key as written', () => {
  it('reads the main key whole: a turn of it names the cell', () => {
    expect(errors(lines(host('scale(dorian, D)'), '&bass over=key[<<1] step=16n 0')).map((e) => e.message)).toEqual([
      expect.stringMatching(/^over=key reads the main key whole: to turn it, name it \(over=&key\[<<2\]\)/),
    ]);
  });

  it('is the word key alone: another bare word is still an error', () => {
    expect(errors(lines(host('scale(dorian, D)'), '&bass over=keys step=16n 0')).map((e) => e.message)).toEqual([
      expect.stringMatching(/^Expected a cell, scale\(name, tonic\) or key after over=/),
    ]);
  });
});
