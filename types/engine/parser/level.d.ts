/** A voice's hit fields, &bd:n:gain, as Strudel spells a sound's (braid.ts, and a groove's chord: mix.ts). */
import type { LineScanner } from './scanner';
/**
 * After a voice's name, its fields as Strudel's mini-notation writes a sound's (`s("bd:0:.3")`): `:n`, the hit's
 * number in its table, then `:gain`, its own gain (linear). The hit's gain, if one is written; none, undefined.
 */
export declare function parseFields(s: LineScanner): number | undefined;
/** After a number, its own gain (`2:.4`, decision 058's drums: a kit member's hit by its number): linear, 1 as it is. */
export declare function parseGain(s: LineScanner): number;
