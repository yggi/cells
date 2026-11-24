/**
 * A cell's name as a message for a person says it (#744): a name the text writes as it is, and a name the language makes
 * for a cell the text doesn't name as where it is written. A cell written in place, `&(…)`, is made `λ<line>_<column>`,
 * so it is "the cell at line 3, column 12"; a `scale(…)` written in place, `scale:λ…` (its key `key:λ…`), is "the scale
 * at line …"; a style's moving axis laid as a cell of its own, `λ<style>_<axis>`, is "&style's bite". A generated name is
 * the language's, never a person's to read (a frontend names it by where it is, as Cell studio's graph does).
 *
 * Pure.
 */
import { AXIS_NAMES } from './style';

/** A generated name written in place: `λ17_36`, the line and the column of the cell's `&`. */
const PLACED = /&?(scale:|key:)?λ(\d+)_(\d+)/g;
/** A style's moving axis laid as a cell: `λstyle_2`, the style's name and the axis's index. */
const AXIS = /&?λ([A-Za-z_][A-Za-z0-9_]*)_(\d+)/g;

/** A message with every generated name in it said as where its cell is written. */
export function spoken(message: string): string {
  if (!message.includes('λ')) return message;
  return message
    .replace(PLACED, (_, kind: string | undefined, line: string, col: string) => `the ${kind ? 'scale' : 'cell'} at line ${line}, column ${col}`)
    .replace(AXIS, (_, style: string, i: string) => `&${style}'s ${AXIS_NAMES[Number(i)] ?? `axis ${i}`}`);
}
