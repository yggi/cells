import { type PieceFrontmatter } from '../piecefile';
import { type Suggestion } from './harness';
/** What a text's card says of the piece, and the text without it; null for a text whose card says nothing (or with no card). */
export declare function movedCard(text: string): {
    frontmatter: PieceFrontmatter;
    text: string;
} | null;
/** A card that says what the piece is: the piece as a file, its title, tags and tier in the frontmatter. */
export declare function card(source: string): Suggestion[];
