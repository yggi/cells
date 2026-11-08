// A key's grades (#508, decision 072): Lerdahl's basic space as a chain of even selections, read from the key a text
// writes. Lerdahl, Tonal Pitch Space (2001), ch. 2, table 2.1: C major's tonic, five levels, written out here as he
// lists them (not computed), so a wrong chain fails against the book.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { gradeOf, gradesOf, gradeText } from './grade';

const key = (text: string, name = 'key') => {
  const r = compileSource(text);
  expect(r.ok, text).toBe(true);
  return gradesOf(r, name)!;
};
/** The pitch classes at each of Lerdahl's levels, coarsest first: a, the root; b, root and fifth; c, the triad; d, the scale; e, the chromatic. */
const levels = (grades: readonly number[]) => [0, 1, 2, 3, 4].map((g) => grades.flatMap((x, pc) => (x <= g ? [pc] : [])));

describe('a key’s basic space (Lerdahl 2001, table 2.1)', () => {
  it('C major’s tonic: C; C G; C E G; the diatonic seven; the twelve', () => {
    const c = key('&key scale(major, C)');
    expect(levels(c)).toEqual([[0], [0, 7], [0, 4, 7], [0, 2, 4, 5, 7, 9, 11], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]);
    expect(gradeText(c)).toBe('*,.,-.,+,.,.');
  });

  it('the seven modes, each on its tonic’s triad: the root, its fifth and its third, the mode’s scale', () => {
    // (the tonic's triad, written: [root, third, fifth] above the tonic, and the scale's steps)
    const MODES: Record<string, { triad: [number, number, number]; scale: number[] }> = {
      ionian: { triad: [0, 4, 7], scale: [0, 2, 4, 5, 7, 9, 11] },
      dorian: { triad: [0, 3, 7], scale: [0, 2, 3, 5, 7, 9, 10] },
      phrygian: { triad: [0, 3, 7], scale: [0, 1, 3, 5, 7, 8, 10] },
      lydian: { triad: [0, 4, 7], scale: [0, 2, 4, 6, 7, 9, 11] },
      mixolydian: { triad: [0, 4, 7], scale: [0, 2, 4, 5, 7, 9, 10] },
      aeolian: { triad: [0, 3, 7], scale: [0, 2, 3, 5, 7, 8, 10] },
      locrian: { triad: [0, 3, 6], scale: [0, 1, 3, 5, 6, 8, 10] },
    };
    for (const [mode, { triad, scale }] of Object.entries(MODES))
      for (const tonic of [0, 2, 7]) {
        const at = (xs: readonly number[]) => xs.map((x) => (x + tonic) % 12).sort((a, b) => a - b);
        const grades = key(`&key scale(${mode}, ${tonic})`);
        expect(levels(grades).slice(0, 4), `${mode} on ${tonic}`).toEqual([at([0]), at([triad[0], triad[2]]), at(triad), at(scale)]);
      }
  });

  it('the triad on each degree of C major: I ii iii IV V vi vii°, each its root, fifth and third', () => {
    const r = compileSource('&key scale(major, C)');
    const roots = [0, 2, 4, 5, 7, 9, 11];
    const thirds = [4, 5, 7, 9, 11, 0, 2];
    const fifths = [7, 9, 11, 0, 2, 4, 5];
    for (let d = 0; d < 7; d++) {
      const g = gradesOf(r, 'key', d)!;
      expect([g[roots[d]!], g[fifths[d]!], g[thirds[d]!]], `degree ${d}`).toEqual([0, 1, 2]);
      expect(g.filter((x) => x <= 3)).toHaveLength(7);
    }
  });

  it('a key that is not seven notes takes the chain as it is: its triad the three of its degrees as even as three go (#508, (a))', () => {
    // (a pentatonic's a sus2, a blues scale's a sus4, the whole tone's the augmented triad: not Lerdahl's, the chain's)
    expect(levels(key('&key scale(pentatonic, C)')).slice(0, 3)).toEqual([[0], [0, 7], [0, 2, 7]]);
    expect(levels(key('&key scale(blues, C)')).slice(0, 3)).toEqual([[0], [0, 7], [0, 5, 7]]);
    expect(levels(key('&key scale(wholetone, C)')).slice(0, 3)).toEqual([[0], [0, 8], [0, 4, 8]]);
  });

  it('reads the key as written: its tonic from a cell, its mode from a cell, a scan over a turned twelve, shift= walking its modes', () => {
    expect(gradeText(key('&key scale(&mode, &tonic)\n&mode dorian\n&tonic D'))).toBe('.,*,.-,.,+,.');
    expect(gradeText(key('&key scan(2 2 1 2 2 2 1)'))).toBe('*,.,-.,+,.,.');
    // (shift=2 walks C major two degrees: its first degree E, the phrygian on E)
    expect(gradeText(key('&key scale(major, C) shift=2'))).toBe('.,.,*.,-,.,+');
    const r = compileSource('&key scale(minor, A)');
    expect([gradeOf(r, 'key', 9), gradeOf(r, 'key', 21 - 12), gradeOf(r, 'key', 4), gradeOf(r, 'key', 0), gradeOf(r, 'key', 11), gradeOf(r, 'key', 1)]).toEqual([0, 0, 1, 2, 3, 4]);
    expect(gradesOf(compileSource('&m 0 1'), 'm')).toBeNull();
  });
});

// (the chain is playable as it is: the triad a table over the key turned to its degree, root and fifth a table over the
// triad; the pitches each plays are the key's at that grade or coarser, no new form)
describe('the chain as tables over the key: the same pitches as the grades', () => {
  const H = '&bar meter("4/4") step=60bpm\n&key scale(major, D)\n&v s=sine loop=C4\n';
  const played = (lines: string, n: number) => {
    const r = compileSource(`${H}${lines}\n&out map=sample [&t * &v]`);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const pcs = eventsBetween(plan(r, codeShifts(r)), 0, n - 1e-9).map((e) => Math.round(12 * Math.log2(e.freq / 261.6256) + 120) % 12);
    return { pcs: [...new Set(pcs)].sort((a, b) => a - b), grades: gradesOf(r, 'key')!, r };
  };
  it.each([0, 1, 2, 3, 4, 5, 6])('degree %i: even(3, 7) over the key turned to it is its triad, even(2, 3, 1) over that its root and fifth', (d) => {
    const triad = played(`&triad over=&key[>>${d}] even(3, 7)\n&t over=&triad step=4n 0 1 2`, 3);
    const power = played(`&triad over=&key[>>${d}] even(3, 7)\n&power over=&triad even(2, 3, 1)\n&t over=&power step=4n 0 1`, 2);
    const at = (g: number) => gradesOf(triad.r, 'key', d)!.flatMap((x, pc) => (x <= g ? [pc] : []));
    expect(triad.pcs).toEqual(at(2));
    expect(power.pcs).toEqual(at(1));
  });
});

// #508's measured example: the diatonic circle (examples/circle.md), its chords one triad turned through the key, sounds
// as the sequence written out as degree lists does, and is the smaller text by decision 049's measure.
describe('a grade in place of a written list of chord tones (examples/circle.md)', () => {
  const ROOTS = [0, 3, 6, 2, 5, 1, 4];
  const listed = (head: string) =>
    [
      head,
      `&pad over=&key step=1m ${ROOTS.map((r) => `[${r},${r + 2},${r + 4}]`).join(' ')}`,
      `&arp over=&key step=8n ${ROOTS.map((r) => [0, 2, 4, 7, 4, 2, 0, 2].map((d) => r + d).join(' ')).join(' ')}`,
      `&bass over=&key step=4n ${ROOTS.map((r) => [-7, -3, -7, -3].map((d) => r + d).join(' ')).join(' ')}`,
    ].join('\n');
  it('sounds as the sequence written out (S1), and is the smaller text', async () => {
    const { EXAMPLES } = await import('./examples');
    const { soundsIdentical } = await import('./sameness');
    const { structureOf } = await import('./measure');
    const { resolveSeed } = await import('../repository/library');
    const source = EXAMPLES.circle.source;
    // (its chain and its parts out, and the two notes on the chain's cells; the parts written as degree lists in their place)
    const body = source.replace(/^&(degrees|triad|power|pad|arp|bass|triadNote|powerNote)\b[^\n]*\n/gm, '');
    const written = body.replace('&tonic C\n', `&tonic C\n${listed('')}\n`);
    const options = { resolve: resolveSeed };
    expect(soundsIdentical(source, written, undefined, options)).toBe(true);
    expect(structureOf(source, options).total).toBeLessThan(structureOf(written, options).total);
  });
});
