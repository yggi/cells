import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { pieceTime } from './duration';

// A table turning by its braid's own steps (#122), and over= a braid of stacks reading the chord in force (#95, #125).
const midi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
/** What `&x` plays over `harm` in C major from C4, a beat a second, for `beats` beats: a MIDI key per onset. */
const plays = (harm: string, x: string, beats = 8) => {
  const r = compileSource(`&bar meter("4/4") step=60bpm\n&key scale(major, C)\n${harm}\n${x}\n&v s=tri loop=C4\n&out map=sample [&x * &v]`);
  expect(r.diagnostics).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, beats - 1e-3).map((e) => midi(e.freq));
};
/** The MIDI key of degree d of C major from C4, raised `alter` semitones. */
const degree = (d: number, alter = 0) => 60 + [0, 2, 4, 5, 7, 9, 11][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7) + alter;

describe('a stepped table turns by its braid’s own steps (#122)', () => {
  // read on 4n, every beat, and on 8n, twice a beat: C is [0,2,4]'s root (60), A is [5,7,9]'s (69)
  const C = degree(0);
  const A = degree(5);
  const twice = (xs: number[]) => xs.flatMap((x) => [x, x]);
  const cases: [string, string, number[]][] = [
    ['!3, a chord repeated', '[0,2,4]!3 [5,7,9]', [C, C, C, A, C, C, C, A]],
    ['@3, a chord held', '[0,2,4]@3 [5,7,9]', [C, C, C, A, C, C, C, A]],
    ['_, Strudel’s hold', '[0,2,4] _ _ [5,7,9]', [C, C, C, A, C, C, C, A]],
    ['@2 on the second', '[0,2,4] [5,7,9]@2', [C, A, A, C, A, A, C, A]],
  ];
  for (const [what, braid, want] of cases) {
    it(`${what}: ${braid} stays in force as long as its braid says, on 4n and on 8n`, () => {
      expect(plays(`&harm over=&key step=4n ${braid}`, '&x over=&harm step=4n 0')).toEqual(want);
      expect(plays(`&harm over=&key step=4n ${braid}`, '&x over=&harm step=8n 0')).toEqual(twice(want));
    });
  }

  it('a subsequence turns within its step: [[5,7,9] [2,4,6]] is A for half a beat, then E (#122’s [a b])', () => {
    const E = degree(2);
    expect(plays('&harm over=&key step=4n [0,2,4] [[5,7,9] [2,4,6]]', '&x over=&harm step=4n 0', 4)).toEqual([C, A, C, A]);
    expect(plays('&harm over=&key step=4n [0,2,4] [[5,7,9] [2,4,6]]', '&x over=&harm step=8n 0', 4)).toEqual([C, C, A, E, C, C, A, E]);
  });

  it('a table of numbers turns the same way: 0@2 4 holds the root two beats', () => {
    expect(plays('&k over=&key step=4n 0@2 4', '&x over=&k step=4n 0', 6)).toEqual([0, 0, 4, 0, 0, 4].map((d) => degree(d)));
  });

  it('<a b> turns one a lap, as its braid plays it', () => {
    expect(plays('&harm over=&key step=4n [0,2,4] <[5,7,9] [3,5,7]>', '&x over=&harm step=4n 0', 4)).toEqual([C, A, C, degree(3)]);
  });

  it('a lap that opens on a rest keeps the entry before it in force: <0 ~> 4@2 holds 4 across the rest', () => {
    expect(plays('&k over=&key step=4n <0 ~> 4@2', '&x over=&k step=4n 0', 7)).toEqual([0, 4, 4, 4, 4, 4, 0].map((d) => degree(d)));
  });

  it('a table that steps once per entry turns as before: one a step, its cycle= its entries', () => {
    expect(plays('&harm over=&key step=4n [0,2,4] [5,7,9]', '&x over=&harm step=4n 0', 4)).toEqual([C, A, C, A]);
    expect(plays('&k over=&key step=4n stride=2 cycle=8 0 1 2 3', '&x over=&k step=4n 0', 5)).toEqual([0, 2, 7, 9, 0].map((d) => degree(d)));
  });

  it('it comes round after its braid’s own length: [0,4,7]@3 [2,5,9] after four steps', () => {
    const piece = (table: string) => `&bar step=1 0\n${table}\n&t over=&k step=&bar 0\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;
    expect(pieceTime(compileSource(piece('&k step=&bar [0,4,7]@3 [2,5,9]'))).cycle).toBe(4);
    expect(pieceTime(compileSource(piece('&k step=&bar [0,4,7]!2 [2,5,9]@3'))).cycle).toBe(5);
  });
});

describe('over= a braid of stacks reads the chord in force (#95, #125)', () => {
  // each chord's tones as degrees of C major: 3, 4 and 5 tones, stepped a beat each
  const chords = [
    [0, 2, 4],
    [1, 3, 5, 7],
    [4, 6, 8, 10, 12],
  ];
  const harm = `&harm over=&key step=4n ${chords.map((c) => `[${c.join(',')}]`).join(' ')}`;
  /** Index i (with its accidental) into the chord sounding: the chord's tone, a lap of the key's seven degrees per lap of the chord. */
  const tone = (chord: number[], i: number, alter = 0) => {
    const lap = Math.floor(i / chord.length);
    return degree(chord[i - lap * chord.length]! + 7 * lap + alter);
  };

  it('indices −5 to 9 play the chord sounding’s tones, and past its last tone the same chord a lap up, over 3, 4 and 5 tones', () => {
    for (let i = -5; i <= 9; i++) {
      // (one index read on every beat: a beat a chord, round twice)
      const want = [...chords, ...chords].map((c) => tone(c, i));
      expect(plays(harm, `&x over=&harm step=4n ${i}`, 6), `index ${i}`).toEqual(want);
    }
  });

  it('an accidental moves one degree of the key: 0# over the first chord is D, 3b over the second is G', () => {
    expect(plays(harm, '&x over=&harm step=4n 0# 3b', 2)).toEqual([tone(chords[0]!, 0, 1), tone(chords[1]!, 3, -1)]);
  });

  it('#95’s witness: 0 1 2 3 4 over Am7 plays A1 C2 E2 G2 and A2, not E7’s E2', () => {
    const r = compileSource(
      '&bar meter("4/4") step=120bpm\n&key scale(aeolian, A)\n&harm over=&key step=2n [0,2,4,6] [4,6#,8,10]\n&bass over=&harm step=16n 0 1 2 3 4 ~!11\n&bassV loop=C1\n&out map=midi ~ [&bass * &bassV]',
    );
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 0.6).map((e) => midi(e.freq))).toEqual([33, 36, 40, 43, 45]);
  });

  it('over=&harm[>>] reads the next chord, [<<] the one behind; past the last, the first a lap up', () => {
    expect(plays(harm, '&x over=&harm[>>] step=4n 0', 3)).toEqual([tone(chords[1]!, 0), tone(chords[2]!, 0), degree(7)]);
    expect(plays(harm, '&x over=&harm[<<] step=4n 0', 3)).toEqual([degree(4 - 7), tone(chords[0]!, 0), tone(chords[1]!, 0)]);
  });

  it('the turn by own steps holds a chord in force: [0,2,4]@2 [5,7,9] read 3 is the C a lap up both beats', () => {
    expect(plays('&harm over=&key step=4n [0,2,4]@2 [5,7,9]', '&x over=&harm step=4n 3', 3)).toEqual([degree(7), degree(7), degree(12)]);
  });

  it('a braid of stacks that doesn’t step is its first stack in force; a single stack reads as it always has', () => {
    expect(plays('&harm over=&key [0,2,4] [5,7,9]', '&x over=&harm step=4n 3 4', 2)).toEqual([degree(7), degree(9)]);
    expect(plays('&harm over=&key [0,2,4]', '&x over=&harm step=4n 3 4', 2)).toEqual([degree(7), degree(9)]);
  });

  it('a subsequence of stacks reads the stack sounding in it', () => {
    expect(plays('&harm over=&key step=4n [0,2,4] [[5,7,9] [2,4,6]]', '&x over=&harm step=8n 3', 2)).toEqual([7, 7, 12, 9].map((d) => degree(d)));
  });

  it('a braid mixing stacks and single numbers reads as before: its numbers in order, as turned', () => {
    // [0,2,4] 5 is the entries 0 2 4 5: index 3 is degree 5; turned, 5 7 9 11: index 3 is the chord's 4 a lap up
    expect(plays('&harm over=&key step=4n [0,2,4] 5', '&x over=&harm step=4n 3', 2)).toEqual([degree(5), degree(11)]);
  });
});
