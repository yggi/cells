import type { CompileOptions } from '../program';
import type { Hint } from '../fold/hints';
import { type Suggestion } from './harness';
export type { Suggestion } from './harness';
/**
 * What Shorten reads besides the text: the compile's options, and hints (decision 049, #157): what Fold found in the
 * notes (`hints(lines)`, in steps, over a span heard or a MIDI file), each a claim of where to look. A hint is placed on
 * the lines as written and weighed as the text's own repeats are; one that doesn't land, or is wrong, costs no notes.
 */
export interface ShortenOptions extends CompileOptions {
    readonly hints?: readonly Hint[];
}
/**
 * Everything that could be written shorter, the largest saving first. A piece's `from` lines read through `options`
 * (decision 054, #241): what is offered is what the piece written out would be offered, less any rewrite of a used line
 * (one the piece would then define over its fragment's).
 */
export declare function shorten(source: string, options?: ShortenOptions): Suggestion[];
/**
 * Shorten again and again — the best each time — until nothing more pays (#157): the rewrite that saves the most
 * structure, or, where none saves any, a respelling that saves characters and adds no structure. Each step makes the
 * structure smaller, or the characters at the same structure, so it ends.
 */
export declare function shortenAll(source: string, rounds?: number, options?: ShortenOptions): {
    source: string;
    steps: string[];
};
