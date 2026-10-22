/**
 * A fragment as a file (decision 047, #143): Markdown, with YAML frontmatter (`yaml.ts`, the subset parsed here), then
 * ```` ```cells ```` blocks among free prose; its text is the join of the blocks (decision 051, `engine/literate.ts`).
 *
 * ```
 * ---
 * id: 4/4 swung on 8n
 * association:
 *   - point:
 *       sync: 0.35
 *       harm: 1
 *       artic: 0.3
 *       energy: 0.6
 *     weight: 1
 *     facet: meter
 * source: seed
 * ---
 *
 * ```cells
 * &bar meter("4/4") swing=8n:2/3
 * ```
 *
 * Jambot's swing 1: the triplet swing, on the eighths.
 * ```
 *
 * The frontmatter holds the index entry, `id` and `association` (each point's `point`, `weight` and optional `facet`),
 * and any other key is metadata (`source`, `tags`, `created`, `heard`, or whatever a frontend or a person adds), kept with
 * its value in its order. The blocks' lines are the fragment's text; `prose` is what follows the last block. A reader
 * takes blank lines around them as they come; `writeFragment` of a file that was read keeps the prose between the blocks
 * byte for byte, and one made new has a single block with one blank line before it and before the prose, and ends the
 * file with a newline, so a file written that way reads and writes back byte for byte.
 */
import type { Layout } from '../engine/literate';
import { type Fragment } from './fragments';
import { type YamlProblem, type YamlValue } from './yaml';
/** A fragment's metadata: every frontmatter key but `id` and `association`, in the order the file gives them. */
export type Meta = {
    readonly [key: string]: YamlValue;
};
/** What a fragment file holds. */
export interface FragmentFile {
    readonly fragment: Fragment;
    readonly meta: Meta;
    /** The Markdown after the last cells block, without the blank lines around it; empty for none. */
    readonly prose: string;
    /** The blocks and the prose between them, as the file has them (a file that was read); a file made new has none. */
    readonly layout?: Layout;
}
/** What is wrong with a file, each problem with its line. */
export interface FragmentFileProblems {
    readonly problems: readonly YamlProblem[];
}
/** A fragment file read: its fragment, metadata and prose, or what is wrong with it, each problem naming its line. */
export declare function readFragment(markdown: string): FragmentFile | FragmentFileProblems;
/** A fragment file's text: frontmatter (the entry, then the metadata), the cells block, the prose. */
export declare function writeFragment({ fragment, meta, prose, layout }: FragmentFile): string;
/** A fragment file read from a library of files, with the path it was read from. */
export interface LibraryFile extends FragmentFile {
    readonly path: string;
}
/**
 * A library of fragment files, by path, read in the order given: each file read, or every problem named with its path
 * and line, an id given twice among them too.
 */
export declare function readFragments(files: Readonly<Record<string, string>>): {
    files: LibraryFile[];
} | {
    problems: string[];
};
