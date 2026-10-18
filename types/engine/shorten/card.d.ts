import { type PieceFrontmatter } from '../piecefile';
import type { ShortenRewrite } from './harness';
/** What a text's card says of the piece, and the text without it; null for a text with no card, or a file. */
export declare function movedCard(text: string): {
    frontmatter: PieceFrontmatter;
    text: string;
} | null;
/** A card that says what the piece is: the piece as a file, its title, tags, tier and description in the frontmatter. */
export declare function card(source: string): ShortenRewrite[];
