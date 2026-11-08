import type { Rewrite } from '../rewrite';
/** A fragment as the library gives it: its id and its text. */
export interface LibraryFragment {
    readonly id: string;
    readonly text: string;
}
/** Each fragment the piece writes lines of, word for word, its lines as one `from` line of it. */
export declare function libraryLines(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[];
/**
 * Each fragment cell the piece writes inline, word for word (`pitch=&(map=lin loop=5 0 .1 0 -.1 0)`), as the fragment's
 * cell by name (`pitch=&vibrato`) and a `from` line of it (#196): every place it is written, once; the line joins one of
 * that fragment already written, or goes after the piece's `from` lines (first, where it has none). Not where the piece
 * defines the name itself.
 */
export declare function libraryCells(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[];
