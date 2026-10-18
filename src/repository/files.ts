/**
 * A fragment as a file (decision 047, #143): Markdown, with YAML frontmatter (`yaml.ts`, the subset parsed here), then
 * one ```` ```cells ```` block, then free prose.
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
 * its value in its order. The block's lines are the fragment's text; the prose is everything after the block. A reader
 * takes blank lines around them as they come; `writeFragment` writes one blank line before the block and before the
 * prose, and ends the file with a newline, so a file written that way reads and writes back byte for byte.
 */
import { fragmentProblems, type Fragment, type WeightedPoint } from './fragments';
import { readYaml, writeYaml, yamlValue, type YamlNode, type YamlProblem, type YamlValue } from './yaml';

/** A fragment's metadata: every frontmatter key but `id` and `association`, in the order the file gives them. */
export type Meta = { readonly [key: string]: YamlValue };

/** What a fragment file holds. */
export interface FragmentFile {
  readonly fragment: Fragment;
  readonly meta: Meta;
  /** The Markdown after the cells block, without the blank lines around it; empty for none. */
  readonly prose: string;
}

/** What is wrong with a file, each problem with its line. */
export interface FragmentFileProblems {
  readonly problems: readonly YamlProblem[];
}

const FENCE = /^```cells\s*$/;
const ENTRY_KEYS = ['id', 'association'];
const POINT_KEYS = ['point', 'weight', 'facet'];

/** The entry of a map node with this key. */
const entry = (node: YamlNode & { kind: 'map' }, key: string) => node.entries.find((e) => e.key === key);

/** The association's points, or the problems with them, each with its line. */
function association(node: YamlNode, problems: YamlProblem[]): WeightedPoint[] {
  if (node.kind !== 'list') {
    problems.push({ line: node.line, message: 'the association is a list of points (`- point: …`)' });
    return [];
  }
  return node.items.map((item, i) => {
    const where = `point ${i + 1}`;
    if (item.kind !== 'map') {
      problems.push({ line: item.line, message: `${where} is a map (point, weight, facet)` });
      return { point: {}, weight: 0 };
    }
    for (const e of item.entries) if (!POINT_KEYS.includes(e.key)) problems.push({ line: e.line, message: `${where}: ${e.key} is none of point, weight, facet` });
    const point: Record<string, number> = {};
    const axes = entry(item, 'point');
    if (!axes) problems.push({ line: item.line, message: `${where} has no point` });
    else if (axes.value.kind !== 'map' || !axes.value.entries.length) problems.push({ line: axes.line, message: `${where}: its point is a map of axes to numbers` });
    else
      for (const axis of axes.value.entries) {
        if (axis.value.kind === 'scalar' && typeof axis.value.value === 'number') point[axis.key] = axis.value.value;
        else problems.push({ line: axis.line, message: `${where}: ${axis.key} is ${JSON.stringify(yamlValue(axis.value))}, not a number` });
      }
    const weight = entry(item, 'weight');
    const w = weight?.value.kind === 'scalar' ? weight.value.value : undefined;
    if (typeof w !== 'number')
      problems.push({ line: weight?.line ?? item.line, message: `${where}: ${weight ? `its weight is ${JSON.stringify(yamlValue(weight.value))}, not a number` : 'no weight'}` });
    const facet = entry(item, 'facet');
    const f = facet?.value.kind === 'scalar' ? facet.value.value : undefined;
    if (facet && typeof f !== 'string') problems.push({ line: facet.line, message: `${where}: its facet is ${JSON.stringify(yamlValue(facet.value))}, not a name` });
    return { point, weight: typeof w === 'number' ? w : 0, ...(typeof f === 'string' ? { facet: f } : {}) };
  });
}

/** A fragment file read: its fragment, metadata and prose, or what is wrong with it, each problem naming its line. */
export function readFragment(markdown: string): FragmentFile | FragmentFileProblems {
  const lines = markdown.split(/\r?\n/);
  if (lines[0] !== '---') return { problems: [{ line: 1, message: 'no frontmatter: a fragment file starts with a line `---`' }] };
  const close = lines.indexOf('---', 1);
  if (close < 0) return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
  const yaml = readYaml(lines.slice(1, close).join('\n'), 2);
  if ('problems' in yaml) return yaml;
  const root = yaml.node;
  if (root.kind !== 'map') return { problems: [{ line: root.line, message: 'the frontmatter is a map (`id: …`, `association: …`)' }] };

  const problems: YamlProblem[] = [];
  const fences = lines.flatMap((l, i) => (i > close && FENCE.test(l) ? [i] : []));
  const open = fences[0];
  if (open === undefined) problems.push({ line: close + 1, message: 'no ```cells block after the frontmatter' });
  if (fences.length > 1) problems.push({ line: fences[1]! + 1, message: `a second \`\`\`cells block (the first is at line ${open! + 1}): a fragment file holds one` });
  const end = open === undefined ? -1 : lines.indexOf('```', open + 1);
  if (open !== undefined && end < 0) problems.push({ line: open + 1, message: 'the ```cells block is never closed (a line ```)' });
  const before = open === undefined ? -1 : lines.slice(close + 1, open).findIndex((l) => l.trim());
  if (before >= 0) problems.push({ line: close + 2 + before, message: 'prose before the ```cells block: the block comes first, the prose after it' });

  const id = entry(root, 'id');
  const idValue = id?.value.kind === 'scalar' ? id.value.value : undefined;
  if (!id) problems.push({ line: 1, message: 'no id in the frontmatter' });
  else if (typeof idValue !== 'string') problems.push({ line: id.line, message: `the id is ${JSON.stringify(yamlValue(id.value))}, not a string: quote it` });
  const assoc = entry(root, 'association');
  if (!assoc) problems.push({ line: 1, message: 'no association in the frontmatter' });
  const points = assoc ? association(assoc.value, problems) : [];
  if (problems.length) return { problems };

  const fragment: Fragment = { id: idValue as string, text: lines.slice(open! + 1, end).join('\n'), association: points };
  // What is left to check is the entry's own sense (an empty id or text, a weight ≤ 0, a blank facet): fragments.ts says it.
  const wrong = fragmentProblems(fragment);
  if (wrong.length)
    return {
      problems: wrong.map((message) => {
        const point = /point (\d+)/.exec(message);
        const line = point ? (assoc!.value as YamlNode & { kind: 'list' }).items[Number(point[1]) - 1]!.line : /no text/.test(message) ? open! + 1 : id!.line;
        return { line, message };
      }),
    };
  const meta = Object.fromEntries(root.entries.filter((e) => !ENTRY_KEYS.includes(e.key)).map((e) => [e.key, yamlValue(e.value)]));
  const prose = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\s*\n/, '')
    .trimEnd();
  return { fragment, meta, prose };
}

/** A fragment file's text: frontmatter (the entry, then the metadata), the cells block, the prose. */
export function writeFragment({ fragment, meta, prose }: FragmentFile): string {
  const clash = ENTRY_KEYS.filter((key) => Object.hasOwn(meta, key));
  if (clash.length) throw new Error(`writeFragment: the metadata has ${clash.join(' and ')}, which the entry writes`);
  const association = fragment.association.map(({ point, weight, facet }) => ({ point, weight, ...(facet === undefined ? {} : { facet }) }));
  const frontmatter = writeYaml({ id: fragment.id, association, ...meta });
  return `---\n${frontmatter}---\n\n\`\`\`cells\n${fragment.text}\n\`\`\`\n${prose ? `\n${prose}\n` : ''}`;
}

/** A fragment file read from a library of files, with the path it was read from. */
export interface LibraryFile extends FragmentFile {
  readonly path: string;
}

/**
 * A library of fragment files, by path, read in the order given: each file read, or every problem named with its path
 * and line, an id given twice among them too.
 */
export function readFragments(files: Readonly<Record<string, string>>): { files: LibraryFile[] } | { problems: string[] } {
  const read: LibraryFile[] = [];
  const problems: string[] = [];
  const firstPath = new Map<string, string>();
  for (const [path, markdown] of Object.entries(files)) {
    const file = readFragment(markdown);
    if ('problems' in file) {
      problems.push(...file.problems.map((p) => `${path}:${p.line}: ${p.message}`));
      continue;
    }
    const { id } = file.fragment;
    const first = firstPath.get(id);
    if (first !== undefined) problems.push(`${path}:${markdown.split('\n').findIndex((l) => /^id:/.test(l)) + 1}: the id ${id} is given twice (first in ${first})`);
    else firstPath.set(id, path);
    read.push({ path, ...file });
  }
  return problems.length ? { problems } : { files: read };
}
