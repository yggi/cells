/**
 * The seed library (decision 047, point 7): the hand-made fragments cells ships, versioned with its releases, kept as
 * files in `fragments/` (one folder a group: `meters/`, `rhythms/`) and read from `seed.generated.ts`, which
 * `npm run fragments` writes from them. A file that doesn't read, or an id given twice, throws here, naming its path and
 * line, so a broken seed file fails every test that imports the repository.
 */
import { readFragments, type LibraryFile } from './files';
import type { Fragment } from './fragments';
import { SEED_FILES } from './seed.generated';

function readSeed(): LibraryFile[] {
  const read = readFragments(SEED_FILES);
  if ('problems' in read) throw new Error(`The seed library doesn't read: ${read.problems.join('; ')}`);
  return read.files;
}

/** Every seed file read, in path order: its fragment, its metadata (`source: seed`, where it was lifted from) and its prose. */
export const SEED: readonly LibraryFile[] = readSeed();

/** The fragments of one folder of the seed library, in file order. */
export const seedFragments = (folder: string): Fragment[] => SEED.filter((f) => f.path.startsWith(`${folder}/`)).map((f) => f.fragment);
