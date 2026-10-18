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
 * The frontmatter says what the piece is: `title` (a string), `tags` (a list of strings: genre:jazz, artist:Bach, a
 * topic) and `tier` (its tier of the tutorial, a whole number 1 to 9999), each optional here (the examples' checks ask
 * for a title and tags); any other key is kept with its value, in its order, as a fragment's metadata is. The block is
 * the piece's text, what compiles; its card's description stays in it, as the label of its first note (`&piece`), since
 * the graph shows it. Nothing comes before the block (no preface: what would go there goes in the frontmatter or the
 * prose, as in a fragment file); the prose is everything after it. `writePiece` writes one blank line before the block
 * and before the prose, and ends the file with a newline, so a file written that way reads and writes back byte for byte.
 */
import { readYaml, writeYaml, yamlValue, type YamlNode, type YamlProblem, type YamlValue } from '../repository/yaml';

/** The frontmatter, every key in the order the file gives it. */
export type PieceFrontmatter = { readonly [key: string]: YamlValue };

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

const FENCE = /^```cells\s*$/;

/** Is this a file (frontmatter first) rather than a bare cells text? A cells text never starts with `---`. */
export const isPieceFile = (source: string): boolean => /^---\r?\n/.test(source);

/** What is wrong with the keys the frontmatter gives a meaning: title, tags, tier. */
function keyProblems(root: YamlNode & { kind: 'map' }): YamlProblem[] {
  const problems: YamlProblem[] = [];
  for (const { key, line, value } of root.entries) {
    const v = yamlValue(value);
    if (key === 'title' && (typeof v !== 'string' || !v.trim())) problems.push({ line, message: `the title is ${JSON.stringify(v)}, not a text: title: "A name"` });
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

  const problems = keyProblems(root);
  const fences = lines.flatMap((l, i) => (i > close && FENCE.test(l) ? [i] : []));
  const open = fences[0];
  if (open === undefined) problems.push({ line: close + 1, message: 'no ```cells block after the frontmatter' });
  if (fences.length > 1) problems.push({ line: fences[1]! + 1, message: `a second \`\`\`cells block (the first is at line ${open! + 1}): a piece file holds one` });
  const end = open === undefined ? -1 : lines.indexOf('```', open + 1);
  if (open !== undefined && end < 0) problems.push({ line: open + 1, message: 'the ```cells block is never closed (a line ```)' });
  const before = open === undefined ? -1 : lines.slice(close + 1, open).findIndex((l) => l.trim());
  if (before >= 0) problems.push({ line: close + 2 + before, message: 'prose before the ```cells block: the block comes first, the prose after it' });
  if (problems.length) return { problems: problems.sort((a, b) => a.line - b.line) };

  const prose = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\s*\n/, '')
    .trimEnd();
  return { frontmatter: yamlValue(root) as PieceFrontmatter, text: lines.slice(open! + 1, end).join('\n'), prose };
}

/** A piece file's text: the frontmatter, the cells block, the prose. */
export function writePiece({ frontmatter, text, prose }: PieceFile): string {
  return `---\n${writeYaml(frontmatter)}---\n\n\`\`\`cells\n${text}\n\`\`\`\n${prose ? `\n${prose}\n` : ''}`;
}
