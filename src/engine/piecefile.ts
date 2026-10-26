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
 * description: "Twinkle Twinkle from three motifs, one of them read a step up the scale, in solfège."
 * ---
 *
 * ```cells
 * &bar scan(1 1 1 1) step=96bpm
 * …
 * ```
 * ```
 *
 * The frontmatter says what the piece is: `title` (a string), `description` (a string: what the piece is, in a
 * sentence), `tags` (a list of strings: genre:jazz, artist:Bach, a topic) and `tier` (its tier of the tutorial, a whole
 * number 1 to 9999), each optional here (the examples' checks ask for a title, a description and tags); any other key is
 * kept with its value, in its order, as a fragment's metadata is. The blocks, joined, are the piece's text, what
 * compiles, with no card (#196); a text written before the description moved here may still hold one, the note
 * `&piece`, whose label `pieceMeta` reads where the frontmatter has no `description` (Shorten's `card` moves it). The
 * prose is everything outside the blocks; `prose` here is what follows the last. `writePiece` of a file that was read
 * puts its text back in the blocks it came from and keeps the rest byte for byte (`rewrite`, `literate.ts`); a file made
 * new has one block, one blank line before it and before the prose, and ends with a newline, so a file written that way
 * reads and writes back byte for byte. A file of cells blocks with no frontmatter is a piece too (#212): its frontmatter
 * is empty, its blocks the code, the rest prose, and it is written back without one.
 *
 * **The lockfile** (decision 054): `uses`, a list of `id` and `hash`, what each of the text's `use` lines resolved to when
 * it was saved (`lockfileOf` reads it for `compileSource`'s `locked`, `withLockfile` records a compile's). `writePiece` drops an
 * entry no `use` line names, and the key with the last one; a file with no frontmatter has no lockfile.
 *
 * ```
 * uses:
 *   - id: gm kit
 *     hash: e1:6de2201770fbb2d7
 * ```
 */
import { readBlocks, rewrite, writeBody, type CodeLine, type Layout } from './literate';
import { readYaml, writeYaml, yamlValue, type YamlNode, type YamlProblem, type YamlValue } from '../repository/yaml';
import { readUse } from './parser/use';
import { splitComment } from './edit';
import type { Locked, Used } from './program';

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
  /** The file has no frontmatter, only cells blocks among prose (#212): written back without one. */
  readonly bare?: true;
}

/** What is wrong with a piece file, each problem with its line. */
export interface PieceFileProblems {
  readonly problems: readonly YamlProblem[];
}

/** A line opening a cells block: three backticks or more, then `cells`. */
const CELLS_FENCE = /^`{3,}\s*cells\s*$/m;

/**
 * Is this a file (frontmatter first, or cells blocks among prose: #212) rather than a bare cells text? A cells text
 * never starts with `---`, nor holds a line of backticks.
 */
export const isPieceFile = (source: string): boolean => /^---\r?\n/.test(source) || CELLS_FENCE.test(source);

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
    if (key === 'uses' && !(Array.isArray(v) && v.every(isLocked)))
      problems.push({ line, message: `the uses are ${JSON.stringify(v)}, not a lockfile: uses: a list of - id: gm kit, hash: e1:…` });
  }
  return problems;
}

/** A piece file read: its frontmatter, its text and its prose, or what is wrong with it, each problem naming its line. */
export function readPiece(markdown: string): PieceFile | PieceFileProblems {
  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== '---') {
    // (no frontmatter, but cells blocks: a literate piece with an empty one, #212)
    if (!CELLS_FENCE.test(markdown)) return { problems: [{ line: 1, message: 'no frontmatter: a piece file starts with a line `---`, or holds a ```cells block' }] };
    const body = readBlocks(lines, 0);
    if ('problems' in body) return body;
    return { frontmatter: {}, text: body.text, prose: body.prose, map: body.map, layout: body.layout, bare: true };
  }
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

/** Is this a lockfile's entry: an id and a hash, both texts, nothing else? */
function isLocked(v: YamlValue): v is { readonly id: string; readonly hash: string } {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const m = v as { readonly [key: string]: YamlValue };
  return Object.keys(m).sort().join() === 'hash,id' && typeof m.id === 'string' && typeof m.hash === 'string';
}

/** A lockfile as the frontmatter holds it. */
const asYaml = (entries: readonly Locked[]): YamlValue => entries.map(({ id, hash }) => ({ id, hash }));

/** A piece file's lockfile (decision 054): what each `use` resolved to when it was saved, for `compileSource`'s `locked`. */
export const lockfileOf = ({ frontmatter }: Pick<PieceFile, 'frontmatter'>): Locked[] =>
  Array.isArray(frontmatter.uses) ? frontmatter.uses.filter(isLocked).map(({ id, hash }) => ({ id, hash })) : [];

/**
 * A piece file with its lockfile recording what a compile's `use` lines resolved to (`CompileResult.uses`): a `use` that
 * didn't resolve keeps the entry it had. What `writePiece` then writes; a frontend whose person didn't keep a changed
 * version (the compile warned) leaves the entry as it was.
 */
export function withLockfile(file: PieceFile, uses: readonly Used[]): PieceFile {
  const had = lockfileOf(file);
  const entries = uses.flatMap((u) => (u.hash ? [{ id: u.id, hash: u.hash }] : had.filter((k) => k.id === u.id)));
  const once = entries.filter((k, i) => entries.findIndex((e) => e.id === k.id) === i);
  return { ...file, frontmatter: { ...file.frontmatter, uses: asYaml(once) } };
}

/** The ids a text's `use` lines name. */
const usedIds = (text: string): Set<string> => new Set(text.split('\n').flatMap((raw) => readUse(splitComment(raw)[0])?.id ?? []));

/** The frontmatter with its lockfile's entries no `use` line names dropped, and the key gone with the last one. */
function pruned(frontmatter: PieceFrontmatter, text: string): PieceFrontmatter {
  if (!('uses' in frontmatter) || !Array.isArray(frontmatter.uses)) return frontmatter;
  const named = usedIds(text);
  const kept = lockfileOf({ frontmatter }).filter((k) => named.has(k.id));
  return Object.fromEntries(Object.entries(frontmatter).flatMap(([k, v]) => (k !== 'uses' ? [[k, v]] : kept.length ? [[k, asYaml(kept)]] : [])));
}

/** A piece file's text: the frontmatter (its lockfile pruned to the `use` lines the text has), the cells blocks, the prose. */
export function writePiece(file: PieceFile): string {
  const { text, prose, layout, bare } = file;
  const frontmatter = pruned(file.frontmatter, text);
  const body: Layout = layout ? rewrite(layout, text) : { blocks: [[text]], gaps: [['', '```cells'], ['```']] };
  // (a file read without frontmatter is written back without one, while it still has none to give: #212)
  if (bare && layout && !Object.keys(frontmatter).length) {
    // (with no frontmatter above it, no blank line before a first fence that has no prose before it either)
    const first = body.gaps[0]!;
    const out = writeBody(body, prose);
    return first.every((l, j) => !l.trim() || j === first.length - 1) ? out.slice(1) : out;
  }
  return `---\n${writeYaml(frontmatter)}---\n${writeBody(body, prose)}`;
}
