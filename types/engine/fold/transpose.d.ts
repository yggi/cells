/**
 * The disentangler (docs/notes/fold.md): a line's chords and rests as tokens, each written relative to its own lowest
 * pitch (its base) — a shift with carry, so that a figure and the same a fifth up are one key at two bases, and
 * neighbours across a block's edge compare as shapes. And back: a token as text, at a base.
 */
import type { Line, Tok } from './ir';
/** A line as tokens: its chords, the rests between them, and the rest to its end. */
export declare function tokensOf(line: Line): Tok[];
/** An element k times as long: its length (and a rest's) times k. */
export declare const scaled: (key: string, k: number) => string;
/** Is this key an element's (a chord, drums, a rest), not a symbol's? */
export declare const isElement: (key: string) => boolean;
/** Is this key a figuration's (`figure.ts`)? */
export declare const isLook: (key: string) => boolean;
/** An element as braid text at a base pitch: `4`, `[0,4,7]@2`, `~@3`, `[&bd,&hh]`. */
export declare function elementText(key: string, base: number | null): string;
