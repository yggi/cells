import type { CompileOptions } from '../program';
import { type Suggestion } from './harness';
export type { Suggestion } from './harness';
/**
 * Everything that could be written shorter, the largest saving first. A piece's `use` lines read through `options`
 * (decision 054, #241): what is offered is what the piece written out would be offered, less any rewrite of a used line
 * (one the piece would then define over its fragment's).
 */
export declare function shorten(source: string, options?: CompileOptions): Suggestion[];
/** Shorten again and again — the best each time — until nothing more pays. */
export declare function shortenAll(source: string, rounds?: number, options?: CompileOptions): {
    source: string;
    steps: string[];
};
