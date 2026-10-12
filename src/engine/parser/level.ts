/** A voice's hit fields, &bd:n:gain, as Strudel spells a sound's (braid.ts, and a groove's chord: mix.ts). */
import type { LineScanner } from './scanner';

/**
 * After a voice's name, its fields as Strudel's mini-notation writes a sound's (`s("bd:0:.3")`): `:n`, the hit's
 * number in its table, then `:gain`, its own gain (linear). The hit's gain, if one is written; none, undefined.
 */
export function parseFields(s: LineScanner): number | undefined {
  if (s.peek() !== ':') return undefined;
  s.i++;
  const at = s.i;
  const n = s.match(/[0-9]+/y);
  if (n === null) return s.fail('A hit is &bd:n:gain, its number first: &bd:0:.3', at, 1);
  if (parseInt(n, 10) !== 0) s.fail(`&bd:${n} would be a pitched hit, ${n} up its table: not yet (write &bd:0:gain)`, at, n.length);
  if (s.peek() !== ':') return undefined;
  s.i++;
  const g = s.i;
  const gain = s.match(/[0-9]*\.[0-9]+|[0-9]+/y);
  if (gain === null) return s.fail('A hit’s gain: a number, &bd:0:.3 (1 as it is)', g, 1);
  return parseFloat(gain);
}
