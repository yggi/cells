import { describe, expect, it } from 'vitest';
import { fold, printFolded, type Line } from '../../src/engine/fold';
import { isArithmetic, pathCost, pathsOf } from './higher';

/** A melody a note a step, transposed by each of `bases` in turn: a canon per tonos' plan (the whole a tone higher each
 * time), here a line alone. */
function perTonos(phrase: readonly number[], bases: readonly number[]): Line {
  const pitches = bases.flatMap((b) => phrase.map((p) => p + b));
  return { name: 'canon', chords: pitches.map((p, i) => ({ at: i, dur: 1, values: [String(p)] })), length: pitches.length };
}

describe('higher-order repetition (the disassembler bench)', () => {
  it('finds the path of transpositions a canon per tonos leaves: one cell, a tone higher each time', () => {
    const phrase = [0, 3, 7, 8, 7, 5, 3, 2, 0, -1, 0, 2, 3, 5, 7, 12, 11, 7, 8, 5];
    const { defs, lines } = printFolded(fold([perTonos(phrase, [0, 2, 4, 6, 8, 10])]));
    const source = [...defs, `&canon step=&tempo ${lines.get('canon')}`].join('\n');
    const paths = pathsOf(source);
    expect(paths).toHaveLength(1);
    // (pairs folds it a level up, as Re-Pair's symbols are binary: two rounds a tone apart are one cell, `&m1 &m2 5
    // &m2^$2 7`, and that cell is spliced at 0, 4 and 8)
    expect(defs[0]).toMatch(/^&m1 &m2 5 &m2\^\$2 7$/);
    expect(paths[0]!.bases).toEqual([0, 4, 8]);
    expect(isArithmetic(paths[0]!)).toBe(true);
    // (and said as a path it would cost what the three splices do: Re-Pair's own hierarchy has already folded the
    // path's regularity; a caret that reads a cell, `&m^&path`, wins nothing here, docs/notes/disassembler.md)
    expect(pathCost(paths[0]!)).toBe(paths[0]!.chars);
  });
  it('reads runs, held splices and splices at another speed as a braid writes them', () => {
    const source = '&a step=&tempo &m1 &m1^$5!2 &m1^$7 0 &m2@2 &m2^$2@2 &m2^$4@2 &m3^1@2';
    expect(pathsOf(source).map((p) => [p.cell, p.bases])).toEqual([
      ['m1', [0, 5, 5, 7]],
      ['m2', [0, 2, 4]],
    ]);
  });
});
