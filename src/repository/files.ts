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
import { readBlocks, rewrite, writeBody, type Layout } from '../engine/literate';
import { fragmentProblems, type Fragment, type WeightedPoint } from './fragments';
import { readYaml, writeYaml, yamlValue, type YamlNode, type YamlProblem, type YamlValue } from './yaml';

/** A fragment's metadata: every frontmatter key but `id` and `association`, in the order the file gives them. */
export type Meta = { readonly [key: string]: YamlValue };

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
  const body = readBlocks(lines, close + 1);
  if ('problems' in body) problems.push(...body.problems);

  const id = entry(root, 'id');
  const idValue = id?.value.kind === 'scalar' ? id.value.value : undefined;
  if (!id) problems.push({ line: 1, message: 'no id in the frontmatter' });
  else if (typeof idValue !== 'string') problems.push({ line: id.line, message: `the id is ${JSON.stringify(yamlValue(id.value))}, not a string: quote it` });
  const assoc = entry(root, 'association');
  if (!assoc) problems.push({ line: 1, message: 'no association in the frontmatter' });
  const points = assoc ? association(assoc.value, problems) : [];
  if (problems.length || 'problems' in body) return { problems: problems.sort((a, b) => a.line - b.line) };

  const fragment: Fragment = { id: idValue as string, text: body.text, association: points };
  // What is left to check is the entry's own sense (an empty id or text, a weight ≤ 0, a blank facet): fragments.ts says it.
  const wrong = fragmentProblems(fragment);
  if (wrong.length)
    return {
      problems: wrong.map((message) => {
        const point = /point (\d+)/.exec(message);
        const line = point
          ? (assoc!.value as YamlNode & { kind: 'list' }).items[Number(point[1]) - 1]!.line
          : /no text/.test(message)
            ? (body.map[0]?.line ?? close + 2) - 1
            : id!.line;
        return { line, message };
      }),
    };
  const meta = Object.fromEntries(root.entries.filter((e) => !ENTRY_KEYS.includes(e.key)).map((e) => [e.key, yamlValue(e.value)]));
  return { fragment, meta, prose: body.prose, layout: body.layout };
}

/** A fragment file's text: frontmatter (the entry, then the metadata), the cells block, the prose. */
export function writeFragment({ fragment, meta, prose, layout }: FragmentFile): string {
  const clash = ENTRY_KEYS.filter((key) => Object.hasOwn(meta, key));
  if (clash.length) throw new Error(`writeFragment: the metadata has ${clash.join(' and ')}, which the entry writes`);
  const association = fragment.association.map(({ point, weight, facet }) => ({ point, weight, ...(facet === undefined ? {} : { facet }) }));
  const frontmatter = writeYaml({ id: fragment.id, association, ...meta });
  const body: Layout = layout ? rewrite(layout, fragment.text) : { blocks: [[fragment.text]], gaps: [['', '```cells'], ['```']] };
  return `---\n${frontmatter}---\n${writeBody(body, prose)}`;
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
