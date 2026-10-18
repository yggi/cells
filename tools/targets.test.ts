import { describe, expect, it } from 'vitest';
import { boundariesOf, occurrencesOf, scoreOf, voicesLike, type Target } from './targets';

// a two-voice piece by hand: a theme in the upper voice, answered a fifth up in the lower, then a second section
const HEAD = '&tempo scan(1!64) pulse=16n step=120bpm laps=1\n&a s=sine loop=C4\n&b s=tri loop=C3\n';
const BY_HAND = `${HEAD}&theme 0 2 4 5 7@4
&answer base=&theme^$7 =!4 12@4
&coda 0@8 -1@8
&up step=pulse &theme &theme^$2 &coda ~@8 &coda ~@8
&down step=pulse ~@8 &answer &coda &coda^$-5 ~@16
&out map=sample [&up * &a, &down * &b]
`;
// the same notes, written out: a line a voice
const FLAT = `${HEAD}&up step=pulse 0 2 4 5 7@4 2 4 6 7 9@4 0@8 -1@8 ~@8 0@8 -1@8 ~@8
&down step=pulse ~@8 7 9 11 12 12@4 0@8 -1@8 -5@8 -6@8 ~@16
&out map=sample [&up * &a, &down * &b]
`;
const TARGET: Target = { key: 'test', text: BY_HAND, sections: [16, 32], themes: ['theme'] };

describe('tools/targets.ts: a text scored against a piece written by hand (#177)', () => {
  it('the same notes, written by hand and written out, play alike: the gate holds', () => {
    expect(scoreOf(TARGET, FLAT).plays).toBe(true);
    expect(scoreOf(TARGET, FLAT.replace('-6@8', '-7@8')).plays).toBe(false);
  });
  it("a copy's notes are its base's family; a line's parts are what it splices", () => {
    const os = occurrencesOf(BY_HAND);
    expect(os.filter((o) => o.level === 'cell' && o.family === 'theme').map((o) => `${o.cell} ${o.voice}@${o.from}`)).toEqual(['theme a@0', 'theme a@8', 'answer b@8']);
    expect(os.filter((o) => o.level === 'part' && o.voice === 'a').map((o) => [o.cell, o.from, o.to])).toEqual([
      ['theme', 0, 8],
      ['theme', 8, 16],
      ['coda', 16, 32],
      ['coda', 40, 56],
    ]);
  });
  it('a boundary is where every voice agrees: the written-out text marks only where its voices come and go', () => {
    // (at 40 and 48 one voice is inside its coda: no boundary)
    expect(boundariesOf(occurrencesOf(BY_HAND))).toEqual([8, 16, 32]);
    expect(boundariesOf(occurrencesOf(FLAT))).toEqual([]);
  });
  it('scores: the target finds itself; the written-out text finds less, and is larger', () => {
    expect(scoreOf(TARGET, BY_HAND)).toMatchObject({ sections: { recall: 1 }, entries: { found: 3, of: 3, recall: 1 }, structure: 1 });
    const flat = scoreOf(TARGET, FLAT);
    expect(flat.sections.recall).toBe(0);
    expect(flat.entries).toMatchObject({ found: 1, of: 3 });
    expect(flat.structure).toBeGreaterThan(1);
  });
  it('voices are matched by their notes, whatever a text names them', () => {
    const renamed = FLAT.replace(/&a\b/g, '&hi').replace(/&b\b/g, '&lo');
    expect([...voicesLike(renamed, BY_HAND)]).toEqual([
      ['hi', 'a'],
      ['lo', 'b'],
    ]);
  });
});
