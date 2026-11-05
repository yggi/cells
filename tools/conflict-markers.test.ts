// Lifted from yggi/webmidi tools/conflict-markers.test.ts @ 06a4ea8.
// tools/conflict-markers.ts over its cases, then over every tracked text file.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { markers } from './conflict-markers.ts';

const root = join(import.meta.dirname, '..');

describe('conflict markers', () => {
  it.each([
    ['<<<<<<< HEAD', 1],
    ['a\n\n=======\nb', 3],
    ['>>>>>>> origin/main', 1],
    ['=======', 1],
  ])('is shown firing on each marker: %j', (text, line) => {
    expect(markers(text)).toEqual([line]);
  });

  it('finds the three markers of a whole conflict, its `=======` right under a line of text', () => {
    expect(markers('# Changelog\n<<<<<<< HEAD\n- ours\n=======\n- theirs\n>>>>>>> main\n')).toEqual([2, 4, 6]);
  });

  it('passes a setext heading underline, a longer run, and a marker that is not at the start of its line', () => {
    expect(markers('Title\n=======\n\ntext')).toEqual([]);
    expect(markers('a\n\n========\n<<<<<<<<\n')).toEqual([]);
    expect(markers('`<<<<<<< HEAD` in prose')).toEqual([]);
  });

  it('no tracked file has one', () => {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    const found = files.flatMap((file) => {
      const bytes = readFileSync(join(root, file));
      if (bytes.includes(0)) return []; // binary
      return markers(bytes.toString('utf8')).map((line) => `${file}:${line}`);
    });
    expect(found).toEqual([]);
  });
});
