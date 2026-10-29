import type { Rewrite } from '../rewrite';
/** A fragment as the library gives it: its id and its text. */
export interface LibraryFragment {
    readonly id: string;
    readonly text: string;
}
/** Each fragment the piece writes lines of, word for word, its lines as one `use` of it. */
export declare function libraryLines(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[];
