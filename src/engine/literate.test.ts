// Literate cells (#195, decision 051): a file's code is the join of its cells blocks and the rest is prose. A file of three
// blocks with prose between them compiles as their join, and a diagnostic points at the right block's line; Normalise over
// it changes only code lines; a raw text and the same text in one fence read the same; every example and fragment reads as
// before.
import { describe, expect, it } from 'vitest';
import { normaliseFile } from '../../tools/normalise';
import { fileLine, readBlocks, readLiterate, rewrite, writeBody, type Literate } from './literate';
import { parse } from './parser';
import { readPiece, writePiece } from './piecefile';
import { PRESETS } from './presets';
import { SEED_FILES } from '../repository/seed.generated';
import { readFragment, writeFragment } from '../repository/files';

/** Three blocks, prose between them (a heading, a paragraph, a fence of another language), a typo in the second. */
const LITERATE =
  [
    '---', //  1
    'title: In three parts', //  2
    'tags: [tutorial]', //  3
    '---', //  4
    '', //  5
    '# The tune', //  6
    '', //  7
    '```cells', //  8
    'use &bar from "4/4"', //  9
    '&tune over=scale(major) step=4n 0 2 4 2', // 10
    '```', // 11
    '', // 12
    'Why cutoff=800 is here:', // 13
    '', // 14
    '```text', // 15
    '```cells', // 16
    '&not code', // 17
    '```', // 18
    '', // 19
    '```cells', // 20
    '&lead s=saw loop=C4 cutoff=800', // 21
    '&oops @@', // 22
    '```', // 23
    '', // 24
    '## The mix', // 25
    '', // 26
    '```cells', // 27
    '&mix [&tune * &lead]', // 28
    '&tempo step=120bpm', // 29
    '```', // 30
    '', // 31
    'The end.', // 32
  ].join('\n') + '\n';

const read = (markdown: string): Literate => {
  const r = readLiterate(markdown);
  if ('problems' in r) throw new Error(JSON.stringify(r.problems));
  return r;
};

describe('literate cells: the code is the join of the blocks', () => {
  it('a file of three blocks with prose between them compiles as their join, and a diagnostic points at the right line', () => {
    const file = read(LITERATE);
    expect(file.text.split('\n')).toEqual([
      'use &bar from "4/4"',
      '&tune over=scale(major) step=4n 0 2 4 2',
      '&lead s=saw loop=C4 cutoff=800',
      '&oops @@',
      '&mix [&tune * &lead]',
      '&tempo step=120bpm',
    ]);
    // (a fence of another language is prose, even with a cells fence inside it)
    expect(file.text).not.toContain('not code');
    expect(file.prose).toBe('The end.');
    const error = parse(file.text).diagnostics.find((d) => d.severity === 'error')!;
    expect(error.span!.line).toBe(4);
    expect(file.map[error.span!.line - 1]).toEqual({ block: 1, line: 22 });
    expect(fileLine(file.map, error.span!.line)).toBe(22);
    expect(file.map.map((m) => m.block)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('a piece file reads as the join, and writes back byte for byte, prose between the blocks and all', () => {
    const piece = readPiece(LITERATE);
    if ('problems' in piece) throw new Error(JSON.stringify(piece.problems));
    expect(piece.text).toBe(read(LITERATE).text);
    expect(writePiece(piece)).toBe(LITERATE);
  });

  it('a line two blocks both give is two lines: the join is concatenation, not a union', () => {
    expect(read('```cells\n&a 0\n```\n\n```cells\n&a 0\n```\n').text).toBe('&a 0\n&a 0');
  });

  it('a raw text and the same text in one fence read the same', () => {
    const raw = '&bar scan(1 1 1 1) step=120bpm\n&tune step=4n 0 2 4 2';
    const raws = read(raw);
    expect(raws.raw).toBe(true);
    expect(raws.text).toBe(raw);
    const fenced = read('```cells\n' + raw + '\n```\n');
    expect(fenced.raw).toBe(false);
    expect(fenced.text).toBe(raw);
    expect(parse(fenced.text)).toEqual(parse(raws.text));
  });

  it('a file with frontmatter and no cells block is a piece with no code: a problem, not a crash', () => {
    for (const bad of ['---\ntitle: x\n---\n\nJust prose.\n', '---\ntitle: x\n---\n\n```text\nnope\n```\n']) {
      expect(readLiterate(bad)).toEqual({ problems: [{ line: 3, message: expect.stringMatching(/no ```cells block/) }] });
      expect(readPiece(bad)).toEqual({ problems: [{ line: 3, message: expect.stringMatching(/no ```cells block/) }] });
    }
    expect(readLiterate('---\ntitle: x\n---\n\n```cells\n&a 0\n')).toEqual({ problems: [{ line: 5, message: expect.stringMatching(/never closed/) }] });
  });
});

describe('Normalise over a literate file', () => {
  it('changes only code lines and leaves the prose byte-identical, each line in the block it was in', () => {
    const file = LITERATE.replace('&oops @@\n', '');
    const { text, steps } = normaliseFile('x.md', file);
    expect(steps.length).toBeGreaterThan(0);
    expect(text).toBe(file.replace('loop=C4 cutoff=800', 'loop=C4 lpf=800'));
    const before = file.split('\n');
    const after = text.split('\n');
    expect(after).toHaveLength(before.length);
    const changed = before.flatMap((l, i) => (l === after[i] ? [] : [i + 1]));
    expect(changed).toEqual([21]);
  });

  it('a file that is normal is left as it is', () => {
    const normal = LITERATE.replace('cutoff=800\n&oops @@', 'lpf=800');
    expect(normaliseFile('x.md', normal)).toEqual({ text: normal, steps: [] });
  });
});

describe('putting a rewritten code back', () => {
  const layout = (readBlocks(['```cells', 'a', 'b', '```', 'prose', '```cells', 'c', '```', '```cells', 'd', 'e', '```'], 0) as Literate).layout;
  const blocks = (text: string) => rewrite(layout, text).blocks;

  it('a line kept stays in its block, a line removed is gone, a block left empty keeps its fences', () => {
    expect(rewrite(layout, 'a\nb\nc\nd\ne')).toBe(layout);
    expect(blocks('a\nc\nd\ne')).toEqual([['a'], ['c'], ['d', 'e']]);
    expect(blocks('a\nb\nd\ne')).toEqual([['a', 'b'], [], ['d', 'e']]);
    expect(blocks('')).toEqual([[], [], []]);
  });

  it('a line added goes into the block of the line before it, the first block when it opens the code', () => {
    expect(blocks('x\na\nb\nc\nd\ne')).toEqual([['x', 'a', 'b'], ['c'], ['d', 'e']]);
    expect(blocks('a\nb\nx\nc\nd\ne')).toEqual([['a', 'b', 'x'], ['c'], ['d', 'e']]);
    expect(blocks('a\nb\nc\nx\nd\ne')).toEqual([
      ['a', 'b'],
      ['c', 'x'],
      ['d', 'e'],
    ]);
    expect(blocks('a\nb\nc\nd\ne\nx')).toEqual([['a', 'b'], ['c'], ['d', 'e', 'x']]);
  });

  it('a changed line is one removed and one added: it stays in the block of the line before it, or its own', () => {
    expect(blocks('a\nB\nc\nd\ne')).toEqual([['a', 'B'], ['c'], ['d', 'e']]);
    expect(blocks('a\nb\nC\nd\ne')).toEqual([['a', 'b'], ['C'], ['d', 'e']]);
  });

  it('a layout of one block takes the code whole, and the prose is written once', () => {
    const one = (readBlocks(['```cells', 'a', '```'], 0) as Literate).layout;
    expect(rewrite(one, 'x\ny').blocks).toEqual([['x', 'y']]);
    expect(writeBody(rewrite(one, 'x\ny'), 'Prose.')).toBe('\n```cells\nx\ny\n```\n\nProse.\n');
  });
});

/** The examples written as literate cells (decision 051): prose between their blocks. */
const LITERATE_EXAMPLES = new Set(['electroswing', 'spooky']);

describe('every example and fragment reads as before', () => {
  it('an example is its blocks joined, its prose between and after them; all but the literate ones are one block', () => {
    for (const [key, { file, source }] of Object.entries(PRESETS)) {
      const read_ = read(file);
      expect(read_.text, key).toBe(source);
      if (!LITERATE_EXAMPLES.has(key)) expect(read_.layout.blocks, key).toHaveLength(1);
    }
    for (const key of LITERATE_EXAMPLES) expect(read(PRESETS[key as keyof typeof PRESETS].file).layout.blocks.length, key).toBeGreaterThan(1);
  });

  it('a fragment file reads and writes as before', () => {
    for (const [path, markdown] of Object.entries(SEED_FILES)) {
      const file = readFragment(markdown);
      if ('problems' in file) throw new Error(path);
      expect(file.fragment.text, path).toBe(read(markdown).text);
      expect(writeFragment(file), path).toBe(markdown);
    }
  });
});
