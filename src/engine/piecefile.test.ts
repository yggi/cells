// A piece as a file (#146, decision 047): every example writes back byte for byte, a fragment's file reads as a piece
// file too (the same kind of file), unknown keys keep their order, a malformed file names its problem and its line, and
// pieceMeta reads a file's card from its frontmatter (and from the note &piece a text written before #196 keeps).
import { describe, expect, it } from 'vitest';
import { isPieceFile, readPiece, writePiece, type PieceFile } from './piecefile';
import { pieceMeta } from './parser';
import { PRESETS } from './presets';
import { SEED_FILES } from '../repository/seed.generated';

const read = (markdown: string): PieceFile => {
  const r = readPiece(markdown);
  if ('problems' in r) throw new Error(JSON.stringify(r.problems));
  return r;
};
const problems = (markdown: string) => {
  const r = readPiece(markdown);
  return 'problems' in r ? r.problems : [];
};

/** A well-formed file, a line each, to break one line of. */
const GOOD = [
  '---', //  1
  'title: "Steps: a tune on one line"', //  2
  'tags: [tutorial, rhythm]', //  3
  'tier: 1', //  4
  'heard: "2026-10-18T21:00:00Z"', //  5
  '---', //  6
  '', //  7
  '```cells', //  8
  '&piece label="Numbers, rests, holds." about=&out', //  9
  '&tune step=4 0 2 ~ 4@2', // 10
  '&v s=sine loop=C4', // 11
  '&out map=sample [&tune * &v]', // 12
  '```', // 13
  '', // 14
  'Some prose.', // 15
];
const good = GOOD.join('\n') + '\n';
const withLine = (n: number, line: string) => GOOD.map((l, i) => (i === n - 1 ? line : l)).join('\n');

describe('a piece file', () => {
  it('reads: its frontmatter in order, its text, its prose; and writes back byte for byte', () => {
    const file = read(good);
    expect(file.frontmatter).toEqual({ title: 'Steps: a tune on one line', tags: ['tutorial', 'rhythm'], tier: 1, heard: '2026-10-18T21:00:00Z' });
    expect(Object.keys(file.frontmatter)).toEqual(['title', 'tags', 'tier', 'heard']);
    expect(file.text).toBe(GOOD.slice(8, 12).join('\n'));
    expect(file.prose).toBe('Some prose.');
    expect(writePiece(file)).toBe(good);
    expect(writePiece({ ...file, prose: '' })).toBe(GOOD.slice(0, 13).join('\n') + '\n');
  });

  it('every example writes back byte for byte', () => {
    for (const [key, { file }] of Object.entries(PRESETS)) expect(writePiece(read(file)), key).toBe(file);
  });

  it("is the same kind of file as a fragment's: every seed fragment reads as one, its id and association kept as keys", () => {
    for (const [path, markdown] of Object.entries(SEED_FILES)) {
      const file = read(markdown);
      expect(Object.keys(file.frontmatter).slice(0, 2), path).toEqual(['id', 'association']);
      expect(writePiece(file), path).toBe(markdown);
    }
  });

  it('is told from a text by its first line', () => {
    expect(isPieceFile(good)).toBe(true);
    expect(isPieceFile(PRESETS.steps.source)).toBe(false);
    expect(isPieceFile('--- not frontmatter')).toBe(false);
  });

  it('names what is wrong, with its line', () => {
    expect(problems('&tune step=4 0')).toEqual([{ line: 1, message: expect.stringMatching(/no frontmatter/) }]);
    expect(problems('---\ntitle: x\n')).toEqual([{ line: 1, message: expect.stringMatching(/never closed/) }]);
    expect(problems(withLine(2, 'title: [a, b]'))).toEqual([{ line: 2, message: expect.stringMatching(/the title is \["a","b"\], not a text/) }]);
    expect(problems(withLine(3, 'tags: tutorial, rhythm'))).toEqual([{ line: 3, message: expect.stringMatching(/not a list of names: tags: \[genre:jazz, rhythm\]/) }]);
    expect(problems(withLine(2, 'description: [a]'))).toEqual([{ line: 2, message: expect.stringMatching(/the description is \["a"\], not a text/) }]);
    expect(problems(withLine(4, 'tier: 1.5'))).toEqual([{ line: 4, message: expect.stringMatching(/whole number, 1 to 9999/) }]);
    expect(problems(withLine(4, 'tier: 0'))).toEqual([{ line: 4, message: expect.stringMatching(/whole number, 1 to 9999/) }]);
    expect(problems(withLine(7, 'A preface.'))).toEqual([{ line: 7, message: expect.stringMatching(/prose before the ```cells block/) }]);
    expect(problems(withLine(8, '```js'))).toEqual([{ line: 6, message: expect.stringMatching(/no ```cells block/) }]);
    expect(problems(withLine(13, 'more'))).toEqual([{ line: 8, message: expect.stringMatching(/never closed/) }]);
    expect(problems(withLine(15, '```cells'))).toEqual([{ line: 15, message: expect.stringMatching(/a second ```cells block \(the first is at line 8\)/) }]);
    // (the YAML subset's own refusals, with their lines)
    expect(problems(withLine(5, 'heard: *a'))).toEqual([{ line: 5, message: expect.stringMatching(/alias/) }]);
  });
});

describe("pieceMeta: a piece's card", () => {
  it('from a file: the frontmatter, and the label of a card its text still has', () => {
    expect(pieceMeta(good)).toEqual({ title: 'Steps: a tune on one line', description: 'Numbers, rests, holds.', tags: ['tutorial', 'rhythm'], tier: 1, cell: 'piece' });
    // (the frontmatter's description wins; a file with no card and none has no description, whatever its notes say;
    // one with no title has no card)
    expect(pieceMeta(withLine(5, 'description: "Said here."'))).toMatchObject({ description: 'Said here.', cell: 'piece' });
    expect(pieceMeta(withLine(9, '&bar scan(1 1 1 1) step=90bpm'))).toMatchObject({ description: '', cell: null });
    expect(pieceMeta(withLine(9, '&stepsNote label="A note, not the card." about=&tune'))).toMatchObject({ description: '', cell: null });
    expect(pieceMeta(withLine(2, 'name: x'))).toBeNull();
    expect(pieceMeta(withLine(4, 'tier: x'))).toBeNull();
  });

  it('reads a file the same as the text written the old way', () => {
    const old = '&piece title="Steps: a tune on one line" tags="tutorial, rhythm" tier=1 label="Numbers, rests, holds." about=&out\n&tune step=4 0 2 ~ 4@2';
    expect(pieceMeta(good)).toEqual(pieceMeta(old));
  });
});
