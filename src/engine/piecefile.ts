/**
 * A piece as a file (decision 047, #146): the same kind of file as a fragment (`repository/files.ts`), Markdown with YAML
 * frontmatter (`repository/yaml.ts`, the subset parsed in cells), then ```` ```cells ```` blocks among free prose. The
 * examples (`examples/*.md`) are such files. The piece is the join of its blocks, and the rest is prose (decision 051:
 * literate cells, `literate.ts`).
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
 * for a title and tags); any other key is kept with its value, in its order, as a fragment's metadata is. The blocks,
 * joined, are the piece's text, what compiles; a card's description may stay in it, as the label of its first note
 * (`&piece`), since the graph shows it, and the frontmatter's `description` wins where both say one (a text with no
 * card, as the MIDI folder writes, has only that). The prose is everything outside the blocks; `prose` here is what
 * follows the last. `writePiece` of a file that was read puts its text back in the blocks it came from and keeps the
 * rest byte for byte (`rewrite`, `literate.ts`); a file made new has one block, one blank line before it and before the
 * prose, and ends with a newline, so a file written that way reads and writes back byte for byte.
 */
import { readBlocks, rewrite, writeBody, type CodeLine, type Layout } from './literate';
import { readYaml, writeYaml, yamlValue, type YamlNode, type YamlProblem, type YamlValue } from '../repository/yaml';

/** The frontmatter, every key in the order the file gives it. */
export type PieceFrontmatter = { readonly [key: string]: YamlValue };

/** What a piece file holds. */
export interface PieceFile {
  readonly frontmatter: PieceFrontmatter;
  /** The cells text: the blocks joined, the piece, what compiles. */
  readonly text: string;
  /** The Markdown after the last block, without the blank lines around it; empty for none. */
  readonly prose: string;
  /** Where each line of `text` is in the file (a file that was read; none for one made new). */
  readonly map?: readonly CodeLine[];
  /** The blocks and the prose between them, as the file has them (a file that was read). */
  readonly layout?: Layout;
}

/** What is wrong with a piece file, each problem with its line. */
export interface PieceFileProblems {
  readonly problems: readonly YamlProblem[];
}

/** Is this a file (frontmatter first) rather than a bare cells text? A cells text never starts with `---`. */
export const isPieceFile = (source: string): boolean => /^---\r?\n/.test(source);

/** What is wrong with the keys the frontmatter gives a meaning: title, tags, tier. */
function keyProblems(root: YamlNode & { kind: 'map' }): YamlProblem[] {
  const problems: YamlProblem[] = [];
  for (const { key, line, value } of root.entries) {
    const v = yamlValue(value);
    if (key === 'title' && (typeof v !== 'string' || !v.trim())) problems.push({ line, message: `the title is ${JSON.stringify(v)}, not a text: title: "A name"` });
    if (key === 'description' && typeof v !== 'string') problems.push({ line, message: `the description is ${JSON.stringify(v)}, not a text: description: "What it is"` });
    if (key === 'tags' && !(Array.isArray(v) && v.every((t) => typeof t === 'string' && t.trim())))
      problems.push({ line, message: `the tags are ${JSON.stringify(v)}, not a list of names: tags: [genre:jazz, rhythm]` });
    if (key === 'tier' && !(typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 9999))
      problems.push({ line, message: `the tier is ${JSON.stringify(v)}: a tier of the tutorial is a whole number, 1 to 9999` });
  }
  return problems;
}

/** A piece file read: its frontmatter, its text and its prose, or what is wrong with it, each problem naming its line. */
export function readPiece(markdown: string): PieceFile | PieceFileProblems {
  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== '---') return { problems: [{ line: 1, message: 'no frontmatter: a piece file starts with a line `---`' }] };
  const close = lines.indexOf('---', 1);
  if (close < 0) return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
  const yaml = readYaml(lines.slice(1, close).join('\n'), 2);
  if ('problems' in yaml) return yaml;
  const root = yaml.node;
  if (root.kind !== 'map') return { problems: [{ line: root.line, message: 'the frontmatter is a map (`title: …`, `tags: […]`)' }] };

  const body = readBlocks(lines, close + 1);
  const problems = [...keyProblems(root), ...('problems' in body ? body.problems : [])];
  if ('problems' in body || problems.length) return { problems: problems.sort((a, b) => a.line - b.line) };
  return { frontmatter: yamlValue(root) as PieceFrontmatter, text: body.text, prose: body.prose, map: body.map, layout: body.layout };
}

/** A piece file's text: the frontmatter, the cells blocks, the prose. */
export function writePiece({ frontmatter, text, prose, layout }: PieceFile): string {
  const body: Layout = layout ? rewrite(layout, text) : { blocks: [[text]], gaps: [['', '```cells'], ['```']] };
  return `---\n${writeYaml(frontmatter)}---\n${writeBody(body, prose)}`;
}
