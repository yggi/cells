import { type LibraryFile } from './files';
import type { Fragment } from './fragments';
/** Every seed file read, in path order: its fragment, its metadata (`source: seed`, where it was lifted from) and its prose. */
export declare const SEED: readonly LibraryFile[];
/** How a `from` line takes a template with these arguments, and the id a query answers with: `diatonic(mode=aeolian)`. */
export declare const takenAs: (id: string, args: Readonly<Record<string, string>>) => string;
/**
 * A template with value arguments bound (#387): each argument's default line gone, its parameter out of the signature, its
 * value written where the parameter was read. `diatonic` with `mode=aeolian` is `&key from &tonic` and
 * `&key scale(aeolian, &tonic)`, the text the old `aeolian` was, so it plays (and hashes) as that did.
 */
export declare function boundText(text: string, args: Readonly<Record<string, string>>): string;
/**
 * A seed file's fragments: the file's own, where it has points with no arguments, and one for each set of arguments its
 * points carry, the template with them bound, its id the way a `from` line takes it (`diatonic(mode=aeolian)`), in the
 * order the points first name them.
 */
export declare function fragmentsOf(file: LibraryFile): Fragment[];
/** The fragments of one folder of the seed library, in file order (a template's sets of arguments each a fragment of its own). */
export declare const seedFragments: (folder: string) => Fragment[];
