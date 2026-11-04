/**
 * The seed library (decision 047, point 7): the hand-made fragments cells ships, versioned with its releases, kept as
 * files in `fragments/` (one folder a group: `meters/`, `rhythms/`) and read from `seed.generated.ts`, which
 * `npm run fragments` writes from them. A file that doesn't read, or an id given twice, throws here, naming its path and
 * line, so a broken seed file fails every test that imports the repository.
 */
import { signatureOf } from '../engine/use';
import { readFragments, type LibraryFile } from './files';
import type { Fragment, WeightedPoint } from './fragments';
import { SEED_FILES } from './seed.generated';

function readSeed(): LibraryFile[] {
  const read = readFragments(SEED_FILES);
  if ('problems' in read) throw new Error(`The seed library doesn't read: ${read.problems.join('; ')}`);
  return read.files;
}

/** Every seed file read, in path order: its fragment, its metadata (`source: seed`, where it was lifted from) and its prose. */
export const SEED: readonly LibraryFile[] = readSeed();

/** How a `from` line takes a template with these arguments, and the id a query answers with: `diatonic(mode=aeolian)`. */
export const takenAs = (id: string, args: Readonly<Record<string, string>>): string =>
  `${id}(${Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')})`;

/**
 * A template with value arguments bound (#387): each argument's default line gone, its parameter out of the signature, its
 * value written where the parameter was read. `diatonic` with `mode=aeolian` is `&key from &tonic` and
 * `&key scale(aeolian, &tonic)`, the text the old `aeolian` was, so it plays (and hashes) as that did.
 */
export function boundText(text: string, args: Readonly<Record<string, string>>): string {
  const signature = signatureOf(text);
  if (!signature) throw new Error(`boundText: a template's arguments, but the text has no signature`);
  const bound = Object.keys(args).map((k) => `&${k}`);
  for (const p of bound) if (!signature.optional.includes(p)) throw new Error(`boundText: ${p} is none of the signature's optional parameters (${signature.optional.join(', ')})`);
  const optional = signature.optional.filter((p) => !bound.includes(p));
  const head = `${signature.names.join(', ')} from ${optional.length ? `(${optional.join(', ')}) ` : ''}${signature.main ?? ''}`.trimEnd();
  let wrote = false;
  return text
    .split('\n')
    .flatMap((line) => {
      if (/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(line) && !wrote && signatureOf(line)) {
        wrote = true;
        return [head];
      }
      if (bound.some((p) => new RegExp(`^\\s*${p}(?![A-Za-z0-9_])`).test(line))) return [];
      return [Object.entries(args).reduce((l, [k, v]) => l.replace(new RegExp(`&${k}(?![A-Za-z0-9_])`, 'g'), v), line)];
    })
    .join('\n');
}

/**
 * A seed file's fragments: the file's own, where it has points with no arguments, and one for each set of arguments its
 * points carry, the template with them bound, its id the way a `from` line takes it (`diatonic(mode=aeolian)`), in the
 * order the points first name them.
 */
export function fragmentsOf(file: LibraryFile): Fragment[] {
  const { fragment } = file;
  const plain = fragment.association.filter((wp) => !wp.args);
  const sets = new Map<string, { args: Readonly<Record<string, string>>; points: WeightedPoint[] }>();
  for (const wp of fragment.association) {
    if (!wp.args) continue;
    const id = takenAs(fragment.id, wp.args);
    const { args: _, ...point } = wp;
    sets.set(id, { args: wp.args, points: [...(sets.get(id)?.points ?? []), point] });
  }
  return [
    ...(plain.length ? [{ ...fragment, association: plain }] : []),
    ...[...sets].map(([id, { args, points }]) => ({ id, text: boundText(fragment.text, args), association: points })),
  ];
}

/** The fragments of one folder of the seed library, in file order (a template's sets of arguments each a fragment of its own). */
export const seedFragments = (folder: string): Fragment[] => SEED.filter((f) => f.path.startsWith(`${folder}/`)).flatMap(fragmentsOf);
