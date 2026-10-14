import { SHOWS } from './cell';
/** A show= value the language knows (a plugin's is the piece's own). */
export type CoreShow = (typeof SHOWS)[number];
/** What each show= value draws, in words: the reference's and the editor's. */
export declare const SHOW_MEANING: Readonly<Record<CoreShow, string>>;
