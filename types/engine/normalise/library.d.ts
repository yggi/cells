import type { Rewrite } from '../rewrite';
import type { Resolve } from '../program';
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
 * that fragment already written, or goes before the first line that reads the cell. Not where the piece defines the
 * name itself, and not in a line that is a fragment's own, word for word (`libraryLines` takes that line whole, #729).
 */
export declare function libraryCells(source: string, library: readonly LibraryFragment[] | undefined): Rewrite<'library'>[];
/**
 * An argument that names a cell the piece takes from the library by that name, `from funk_drums(bd=&bd)` under
 * `&bd from gm_kit`, is left out where the line plays the same without it (#729): the template's own default is that
 * cell. Migrate writes such an argument where the piece wrote the cell itself (`migrate/arguments.ts`); once the cell is
 * the library's, the line reads as it would had the library been taken first. Each only where it sounds identical
 * (S1, `rewriteAll`); an argument the piece's own line fills stays.
 */
export declare function takenArguments(source: string): Rewrite<'library'>[];
/**
 * A line that is a template's head line with its parameters filled in, as a `from` line of the template with those
 * arguments (#524): `&bar meter("7/8") step=&tempo swing=8n:2/3` is `&bar from meter(grouping=meter("7/8"), swing=8n:2/3)
 * &tempo`, `&key scale(minor, &tonic)` is `&key from diatonic(mode=minor) &tonic`. The line's attributes are the
 * template's, by key, each binding the parameter the template writes there (`base=&p` binds the line's own braid, as a
 * copy of &p is &p's braid); its braid matches the template's, a parameter where the template has one; a parameter it
 * doesn't write is the default, and an argument equal to its default is left out. A line with anything the template
 * doesn't write (`motor=`, `label=`, `over=`) stays as it is. Each only where it sounds identical (S1, `rewriteAll`).
 */
export declare function libraryTemplates(source: string, library: readonly LibraryFragment[] | undefined, resolve?: Resolve): Rewrite<'library'>[];
