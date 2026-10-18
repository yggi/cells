/**
 * A piece as a file (decision 047, #146): the same kind of file as a fragment (`repository/files.ts`), Markdown with YAML
 * frontmatter (`repository/yaml.ts`, the subset parsed in cells), then one ```` ```cells ```` block, then free prose. The
 * examples (`examples/*.md`) are such files.
 *
 * ```
 * ---
 * title: "Motifs and reuse: Twinkle Twinkle"
 * tags: [tutorial, genre:classical, genre:folk, diatonic, motifs]
 * tier: 3
 * ---
 *
 * ```cells
 * &piece label="Twinkle Twinkle from three motifs, one of them read a step up the scale, in solfège." about=&mix
 * &bar scan(1 1 1 1) step=96bpm
 * …
 * ```
 * ```
 *
 * The frontmatter says what the piece is: `title` (a string), `description` (a string: what the card's label said), `tags` (a list of strings: genre:jazz, artist:Bach, a
 * topic) and `tier` (its tier of the tutorial, a whole number 1 to 9999), each optional here (the examples' checks ask
 * for a title and tags); any other key is kept with its value, in its order, as a fragment's metadata is. The block is
 * the piece's text, what compiles; a card's description may stay in it, as the label of its first note (`&piece`), since
 * the graph shows it, and the frontmatter's `description` wins where both say one (a text with no card, as the MIDI folder writes, has only that). Nothing comes before the block (no preface: what would go there goes in the frontmatter or the
 * prose, as in a fragment file); the prose is everything after it. `writePiece` writes one blank line before the block
 * and before the prose, and ends the file with a newline, so a file written that way reads and writes back byte for byte.
 */
import { type YamlProblem, type YamlValue } from '../repository/yaml';
/** The frontmatter, every key in the order the file gives it. */
export type PieceFrontmatter = {
    readonly [key: string]: YamlValue;
};
/** What a piece file holds. */
export interface PieceFile {
    readonly frontmatter: PieceFrontmatter;
    /** The cells text in the block: the piece, what compiles. */
    readonly text: string;
    /** The Markdown after the block, without the blank lines around it; empty for none. */
    readonly prose: string;
}
/** What is wrong with a piece file, each problem with its line. */
export interface PieceFileProblems {
    readonly problems: readonly YamlProblem[];
}
/** Is this a file (frontmatter first) rather than a bare cells text? A cells text never starts with `---`. */
export declare const isPieceFile: (source: string) => boolean;
/** A piece file read: its frontmatter, its text and its prose, or what is wrong with it, each problem naming its line. */
export declare function readPiece(markdown: string): PieceFile | PieceFileProblems;
/** A piece file's text: the frontmatter, the cells block, the prose. */
export declare function writePiece({ frontmatter, text, prose }: PieceFile): string;
