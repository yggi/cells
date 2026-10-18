/**
 * The seed library (decision 047, point 7): the hand-made fragments cells ships, versioned with its releases, kept as
 * files in `fragments/` (one folder a group: `meters/`, `rhythms/`) and read from `seed.generated.ts`, which
 * `npm run fragments` writes from them. A file that doesn't read, or an id given twice, throws here, naming its path and
 * line, so a broken seed file fails every test that imports the repository.
 */
import { type LibraryFile } from './files';
import type { Fragment } from './fragments';
/** Every seed file read, in path order: its fragment, its metadata (`source: seed`, where it was lifted from) and its prose. */
export declare const SEED: readonly LibraryFile[];
/** The fragments of one folder of the seed library, in file order. */
export declare const seedFragments: (folder: string) => Fragment[];
