/**
 * The parts an example gives (decision 082) are placed on their signature lines (decision 089), no longer in the
 * document's frontmatter: Kinderlieder's six tunes, each a motif at its point, read as the frontmatter's were (#703).
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../engine/examples';
import { readPiece } from '../engine/piecefile';
import { PARTS } from './library';

/** Each part's `bite`: the only axis the six differ on (the others are `sync .1 harm .12 mood .95`). */
const BITE: Readonly<Record<string, number>> = { twinkle: 0.5, wonder: 0.4, haenschen: 0.65, hinein: 0.6, heim: 0.55, weinet: 0.7 };

describe("Kinderlieder's parts", () => {
  it('are six motifs, each at the point its signature line declares, in the file’s order', () => {
    expect(PARTS.map((p) => p.id)).toEqual(Object.keys(BITE).map((head) => `kinderlied/${head}`));
    for (const part of PARTS)
      expect(part.association, part.id).toEqual([{ point: { sync: 0.1, harm: 0.12, bite: BITE[part.id.split('/')[1]!], mood: 0.95 }, weight: 1, facet: 'motif' }]);
  });

  it('keep no association in the frontmatter', () => {
    const file = readPiece(EXAMPLES.kinderlied.file);
    expect('problems' in file ? null : file.frontmatter.parts).toBeUndefined();
  });
});
