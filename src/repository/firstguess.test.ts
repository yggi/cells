import { describe, expect, it } from 'vitest';
import { firstGuess, GUESS_K, GUESSED, guessPlace, PART_OF, readFacet, readFragment, readingDistance, type Read } from './firstguess';
import { LIBRARY, resolveSeed } from './library';

const byId = (id: string) => LIBRARY.find((f) => f.id === id)!;
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const off = (v: number, placed: readonly Readonly<Record<string, number>>[], axis: string) => Math.min(...placed.map((p) => Math.abs(v - p[axis]!)));

describe('a library fragment read from what it plays (#681)', () => {
  it('reads a clave’s syncopation, which the onsets on the grid alone read as none', () => {
    for (const id of ['son_clave_3_2', 'son_clave_2_3', 'rumba_clave_3_2', 'cinquillo'])
      expect(readFragment(byId(id).text, 'rhythm', resolveSeed)!.point.sync, id).toBeGreaterThan(0);
  });

  it('reads a beat as drums, with no harm and no mood, and a harmony’s chords as its harm', () => {
    expect(Object.keys(readFragment(byId('funk_drums').text, 'rhythm', resolveSeed)!.point)).toEqual(['sync']);
    expect(readFragment(byId('axis_progression').text, 'harmony', resolveSeed)!.point.harm).toBeGreaterThan(0);
  });

  it('reads nothing of a fragment in another meter, which the host’s 4/4 would misread: a waltz’s beat, an aksak’s, a motif in 6/8', () => {
    for (const [id, facet] of [
      ['waltz_drums', 'rhythm'],
      ['aksak_drums', 'rhythm'],
      ['twelve_eight_drums', 'rhythm'],
      ['waltz_bass', 'bass'],
      ['rocking', 'motif'],
    ] as const)
      expect(readFragment(byId(id).text, facet, resolveSeed), id).toBeNull();
  });

  it('reads nothing of a facet that plays no part: a meter, a mode, an instrument', () => {
    expect(Object.keys(PART_OF)).toEqual(['rhythm', 'bass', 'harmony', 'stab', 'motif']);
    expect(readFragment(byId('meter').text, 'meter', resolveSeed)).toBeNull();
    expect(readFragment(byId('tb303').text, 'instrument', resolveSeed)).toBeNull();
  });
});

describe('a first guess, from the readings nearest it', () => {
  it('compares readings over the features both have, and none as infinitely far', () => {
    const r = (point: Record<string, number>, intensity = 0) => ({ point, confidence: {}, intensity });
    expect(readingDistance(r({ sync: 0.2 }, 0.5), r({ sync: 0.2, harm: 1 }, 0.5))).toBe(0);
    expect(readingDistance(r({ sync: 0.2 }, 0.5), r({ sync: 0.6 }, 0.5))).toBeCloseTo(Math.sqrt(0.16 / 2), 12);
  });

  it('is the mean of the placed points of the GUESS_K nearest, nearest first', () => {
    const at = (id: string, sync: number, placed: number): Read => ({ id, reading: { point: { sync }, confidence: {}, intensity: 0 }, placed: [{ sync: placed }] });
    const among = [at('a', 0.1, 0.1), at('b', 0.2, 0.3), at('c', 0.3, 0.5), at('d', 0.9, 1)];
    const g = firstGuess({ point: { sync: 0.18 }, confidence: {}, intensity: 0 }, among)!;
    expect(GUESS_K).toBe(2);
    expect(g.from.map((f) => f.id)).toEqual(['b', 'a']);
    expect(g.point.sync).toBeCloseTo(0.2, 12);
    expect(firstGuess({ point: { sync: 0.18 }, confidence: {}, intensity: 0 }, among, 3)!.point.sync).toBeCloseTo(0.3, 12);
  });

  // The bound (#681): each fragment guessed from the others comes nearer its placement than the others' mean does, by a
  // fifth or more, and nearer than its reading itself, on each axis GUESSED names (choose the margin: a fifth).
  it.each(Object.entries(GUESSED).flatMap(([facet, axes]) => axes.map((axis) => [facet, axis] as const)))(
    'guesses a %s’s %s better than the others’ mean and the reading itself, leaving each one out',
    (facet, axis) => {
      const read = readFacet(LIBRARY, facet, resolveSeed);
      expect(read.length).toBeGreaterThan(GUESS_K);
      const guess: number[] = [];
      const direct: number[] = [];
      const others: number[] = [];
      for (const r of read) {
        const rest = read.filter((o) => o.id !== r.id);
        guess.push(off(firstGuess(r.reading, rest)!.point[axis]!, r.placed, axis));
        direct.push(off((r.reading.point as Readonly<Record<string, number>>)[axis]!, r.placed, axis));
        others.push(off(mean(rest.flatMap((o) => o.placed.map((p) => p[axis]!))), r.placed, axis));
      }
      expect(mean(guess)).toBeLessThan(0.8 * mean(others));
      expect(mean(guess)).toBeLessThan(mean(direct));
    },
  );

  it('places only the axes its facet’s notes carry, and nothing for a facet that carries none', () => {
    expect(GUESSED).toEqual({ rhythm: ['sync'], harmony: ['harm'] });
    const g = guessPlace(
      byId('son_clave_3_2').text,
      'rhythm',
      LIBRARY.filter((f) => f.id !== 'son_clave_3_2'),
      resolveSeed,
    )!;
    expect(Object.keys(g.point)).toEqual(['sync']);
    expect(g.from).toHaveLength(GUESS_K);
    expect(guessPlace(byId('walking_bass').text, 'bass', LIBRARY, resolveSeed)).toBeNull();
  });
});
