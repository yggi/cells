// Lifted from yggi/cell-studio src/audio/repeatable.test.ts @ e168c8d, for the language: the workbench keeps the same
// line for its layout and audio, and its tools/repeatable.mjs checks two renders end to end.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A piece sounds the same every time (#37 in Cell studio): none of the language's code may draw on chance of its own.
 * Chance in a piece comes from the cell's seed (`realize.ts` `chanceOf`, keyed on the seed, the cell, the lap and the step).
 */
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? sources(p) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [p] : [];
  });

/** What is random behind our back. */
const CHANCE = [/\bMath\.random\b/, /\bcrypto\.getRandomValues\b/];

/** The lines of a file's code (comments, which may name them to say why not, left out) that draw on chance. */
export function chanceIn(text: string, file = ''): string[] {
  const found: string[] = [];
  text.split('\n').forEach((line, i) => {
    const code = line
      .replace(/^\s*(\/?\*+).*$/, '')
      .replace(/\/\/.*$/, '')
      .replace(/\/\*.*?\*\//g, '');
    if (CHANCE.some((re) => re.test(code))) found.push(`${file}:${i + 1}: ${line.trim()}`);
  });
  return found;
}

describe('none of the language draws on chance of its own', () => {
  for (const dir of ['src/engine', 'src/theory'])
    it(`${dir} draws on no chance (use the cell's seed: realize.ts chanceOf)`, () => {
      expect(sources(dir).flatMap((f) => chanceIn(readFileSync(f, 'utf8'), f))).toEqual([]);
    });
  it('a line that draws on chance is found, one that only names it in a comment is not', () => {
    expect(chanceIn('const x = Math.random();\n// not Math.random: the seed\n', 'f')).toEqual(['f:1: const x = Math.random();']);
  });
});
