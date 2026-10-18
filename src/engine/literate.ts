/**
 * Literate cells (decision 051, #195): a Markdown file's cells code is the join of all its ```` ```cells ```` blocks, in
 * file order, and everything else (headings, paragraphs, fences of other languages) is prose. This is the one reader of
 * that form; a piece file (`piecefile.ts`), a fragment file (`repository/files.ts`), Normalise and `npm run structure`
 * each take their code from it.
 *
 * The code is the blocks' lines concatenated with a newline: a line two blocks both give is two lines (the union of
 * lines is for combining fragments, decision 047). `map` says, for each code line, the block it came from and its line in
 * the file, so a diagnostic of the code (its line) is a position in the file (`fileLine`). `layout` is everything the
 * code is not, kept byte for byte, so `rewrite` can put a changed code back into the blocks it came from.
 */
import type { YamlProblem } from '../repository/yaml';

/** Where a line of the code is in the file. */
export interface CodeLine {
  /** The block it is in, counted from 0. */
  readonly block: number;
  /** Its line in the file, counted from 1. */
  readonly line: number;
}

/** What the code is not: the blocks' lines, and the file's lines between them, kept as they are. */
export interface Layout {
  /** Each block's lines (the code, without its fences). */
  readonly blocks: readonly (readonly string[])[];
  /**
   * The file's lines around the blocks, one more than there are blocks: `gaps[0]` is everything before the first block's
   * first line (after the frontmatter, up to and with the opening fence), `gaps[k]` what lies between block k-1 and block k
   * (the closing fence, prose, the next opening fence), `gaps[n]` the closing fence of the last. Empty for a raw text.
   */
  readonly gaps: readonly (readonly string[])[];
}

/** A file's code. */
export interface Literate {
  /** The code: the blocks joined with a newline. */
  readonly text: string;
  readonly map: readonly CodeLine[];
  readonly layout: Layout;
  /** The Markdown after the last block, without the blank lines around it; empty for none. */
  readonly prose: string;
  /** The file's lines before the body (the frontmatter, fences and all), as the file has them; empty for none. */
  readonly head: readonly string[];
  /** The file's lines after the last block's closing fence, as the file has them (the prose and its blank lines). */
  readonly tail: readonly string[];
  /** No fence anywhere and no frontmatter: the whole file is the code (a `.cells` text, pasted text). */
  readonly raw: boolean;
}

export interface LiterateProblems {
  readonly problems: readonly YamlProblem[];
}

/** An opening fence: three backticks or more, then its language. */
const OPEN = /^(`{3,})([^`]*)$/;

/**
 * The cells blocks among a file's lines, from the line `from` (0-based, after the frontmatter): or a problem naming its
 * line. A fence of another language is prose, and a ```` ```cells ```` line inside it is no block.
 */
export function readBlocks(lines: readonly string[], from: number): Literate | LiterateProblems {
  const blocks: string[][] = [];
  const gaps: string[][] = [];
  const map: CodeLine[] = [];
  let gap: string[] = [];
  let i = from;
  while (i < lines.length) {
    const line = lines[i]!;
    const fence = OPEN.exec(line);
    // (a closing fence is a line of at least as many backticks, and nothing else)
    const close = fence ? lines.findIndex((l, j) => j > i && /^`{3,}\s*$/.test(l) && l.trim().length >= fence[1]!.length) : -1;
    if (fence && fence[2]!.trim() === 'cells') {
      if (close < 0) return { problems: [{ line: i + 1, message: 'the ```cells block is never closed (a line ```)' }] };
      gap.push(line);
      gaps.push(gap);
      gap = [];
      const code = lines.slice(i + 1, close);
      code.forEach((_, k) => map.push({ block: blocks.length, line: i + 2 + k }));
      blocks.push(code);
      gap.push(lines[close]!);
      i = close + 1;
    } else if (fence) {
      // (prose: a fence of another language, to its end, or to the end of the file)
      const end = close < 0 ? lines.length - 1 : close;
      gap.push(...lines.slice(i, end + 1));
      i = end + 1;
    } else {
      gap.push(line);
      i++;
    }
  }
  if (!blocks.length) return { problems: [{ line: Math.max(from, 1), message: 'no ```cells block after the frontmatter' }] };
  // (what follows the last closing fence is the prose; the fence itself stays in the layout)
  const tail = gap.slice(1);
  gaps.push(gap.slice(0, 1));
  const prose = tail
    .join('\n')
    .replace(/^\s*\n/, '')
    .trimEnd();
  return { text: blocks.flat().join('\n'), map, layout: { blocks, gaps }, head: lines.slice(0, from), tail, prose, raw: false };
}

/**
 * A Markdown file's code: after its frontmatter if it has one (a line `---` first, to the next), from the cells blocks;
 * with no frontmatter and no fence, all of it. The frontmatter is not read here (`readYaml`), only skipped.
 */
export function readLiterate(source: string): Literate | LiterateProblems {
  const lines = source.split(/\r?\n/);
  let from = 0;
  if (lines[0] === '---') {
    const close = lines.indexOf('---', 1);
    if (close < 0) return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
    from = close + 1;
  }
  const read = readBlocks(lines, from);
  if ('problems' in read && from === 0 && !lines.some((l) => OPEN.test(l))) {
    return { text: source, map: lines.map((_, k) => ({ block: 0, line: k + 1 })), layout: { blocks: [lines], gaps: [] }, head: [], tail: [], prose: '', raw: true };
  }
  return read;
}

/** A line of the code, as a line of the file; a line past the code is left as it is. */
export const fileLine = (map: readonly CodeLine[], line: number): number => map[line - 1]?.line ?? line;

/** For each line of `b`, the line of `a` it keeps (a longest common subsequence), or -1 for a line that is new. */
function align(a: readonly string[], b: readonly string[]): number[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const kept = b.map(() => -1);
  for (let k = 0; k < head; k++) kept[k] = k;
  for (let k = 0; k < tail; k++) kept[b.length - 1 - k] = a.length - 1 - k;
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  // (a middle too long for the table is one change: none of its lines is kept)
  if (n === 0 || m === 0 || n * m > MAX_TABLE) return kept;
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let x = n - 1; x >= 0; x--)
    for (let y = m - 1; y >= 0; y--) lcs[x * w + y] = a[head + x] === b[head + y] ? lcs[(x + 1) * w + y + 1]! + 1 : Math.max(lcs[(x + 1) * w + y]!, lcs[x * w + y + 1]!);
  for (let x = 0, y = 0; x < n && y < m;) {
    if (a[head + x] === b[head + y]) kept[head + y++] = head + x++;
    else if (lcs[(x + 1) * w + y]! >= lcs[x * w + y + 1]!) x++;
    else y++;
  }
  return kept;
}

/** The longest middle of a rewrite aligned line by line: 2,000 × 2,000 lines. */
export const MAX_TABLE = 4_000_000;

/**
 * The layout with this code put back in: each line a rewrite keeps stays in the block it was in, a line it removes is gone
 * (a block left empty keeps its fences). A line it adds goes into the block it is nearest to: where lines were removed, the
 * block of the first of them (a line changed stays where it was); between two lines kept, the block of the one before (the
 * earlier block where they lie in two); and the first block when it opens the code. The prose and the fences
 * are never touched. A layout of one block takes the code whole.
 */
export function rewrite(layout: Layout, text: string): Layout {
  const old = layout.blocks.flat();
  if (text === old.join('\n')) return layout;
  const lines = text === '' ? [] : text.split('\n');
  if (layout.blocks.length <= 1) return { ...layout, blocks: [lines] };
  const blockOf = layout.blocks.flatMap((b, k) => b.map(() => k));
  const kept = align(old, lines);
  // (for each line, the old lines kept before it and after it: what lies between them was removed)
  const before: number[] = [];
  let last = -1;
  kept.forEach((j, k) => (before[k] = j >= 0 ? (last = j) : last));
  const after: number[] = [];
  let next = old.length;
  for (let k = kept.length - 1; k >= 0; k--) after[k] = kept[k]! >= 0 ? (next = kept[k]!) : next;
  const blocks: string[][] = layout.blocks.map(() => []);
  lines.forEach((line, k) => {
    // (kept: its own block; added where lines were removed: the first removed line's; added between kept lines: the line before's)
    const from = kept[k]! >= 0 ? kept[k]! : after[k]! - before[k]! > 1 ? before[k]! + 1 : before[k]!;
    blocks[from < 0 ? 0 : blockOf[from]!]!.push(line);
  });
  return { ...layout, blocks };
}

/**
 * The body of a file the writers make: the layout's gaps and blocks in order, then the prose. Blank lines before the first
 * block and around the prose are written as one, as they have always been; prose before or between blocks is kept as it is.
 */
export function writeBody(layout: Layout, prose: string): string {
  const out: string[] = [];
  layout.gaps.forEach((gap, k) => {
    out.push(...(k === 0 && gap.every((l, j) => !l.trim() || j === gap.length - 1) ? ['', gap[gap.length - 1]!] : gap));
    if (k < layout.blocks.length) out.push(...layout.blocks[k]!);
  });
  return out.join('\n') + '\n' + (prose ? `\n${prose}\n` : '');
}

/** The whole file from a layout (a rewrite of this file's), every line outside the blocks as the file had it. */
export function renderFile(file: Literate, layout: Layout): string {
  const out = [...file.head];
  layout.gaps.forEach((gap, k) => {
    out.push(...gap);
    if (k < layout.blocks.length) out.push(...layout.blocks[k]!);
  });
  return [...out, ...file.tail].join('\n');
}
