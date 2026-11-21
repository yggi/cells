/**
 * What an example says of its own place (#543, decision 089): a `* from style=&name` line in its text, which compiles to
 * nothing, so no piece sounds different for it. A style is optional (decision 090): an example that is no style's idiom
 * says none, and the teaching pieces don't claim one.
 *
 * The line says where a piece is found, never what it is made of: nothing reads it back to place a style (decision 094
 * keeps a reading apart from a placement), so a style, an example that is an instance of it, and the line that says so
 * are not a loop.
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLES as EXAMPLE_FILES } from '../engine/examples';
import { readPiece } from '../engine/piecefile';
import { placeOf } from './declarations';
import { styleNamesIn } from './files';
import { SEED_FILES } from './seed.generated';

const EXAMPLES: Readonly<Record<string, { readonly source: string }>> = EXAMPLE_FILES;
const styles = styleNamesIn(SEED_FILES);
const textOf = (source: string) => {
  const file = readPiece(source);
  return 'problems' in file ? source : file.text;
};

/** The examples that are one style's idiom, placed by name (the owner, 2026-11-20: place the clear ones). */
const PLACED: Readonly<Record<string, string>> = {
  acid: 'acid',
  bossa: 'bossaNova',
  electroswing: 'electroSwing',
  funk: 'funk',
  jazz: 'swingJazz',
  kinderlied: 'kinderlied',
  korobeiniki: 'chiptune',
  pop: 'synthPop',
  sailor: 'seaShanty',
  spooky: 'spooky',
  twelve: 'bluesShuffle',
  waltz: 'waltz',
};

describe('an example places itself by a `* from style=` line', () => {
  it('names a style of `styles`, and reads without a problem', () => {
    for (const key of Object.keys(PLACED)) {
      const placed = placeOf(textOf(EXAMPLES[key]!.source), { styles });
      expect(placed, key).not.toBeNull();
      expect(placed!.problems, key).toEqual([]);
      expect(placed!.association.length, key).toBe(1);
      expect(placed!.association[0]!.point, key).toEqual(styles.get(PLACED[key]!));
    }
  });

  it('is the only example that says one: the others have no style, as 090 allows', () => {
    const says = Object.keys(EXAMPLES).filter((key) => placeOf(textOf(EXAMPLES[key]!.source), { styles }) !== null);
    expect(says.sort()).toEqual(Object.keys(PLACED).sort());
  });

  it('is no style at all where a piece writes none, and ignores its parts’ signatures', () => {
    expect(placeOf('&a 0 2 4\n', { styles })).toBeNull();
    expect(placeOf('&twinkle from &key\n&twinkle over=&key 0 1\n', { styles })).toBeNull();
    expect(placeOf('* from style=&nowhere\n&a 0\n', { styles })!.problems[0]).toMatch(/no style of that name/);
  });
});
