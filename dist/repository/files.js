import { readBlocks, rewrite, writeBody } from "../engine/literate.js";
import { fragmentProblems } from "./fragments.js";
import { readYaml, writeYaml, yamlValue } from "./yaml.js";
const ENTRY_KEYS = ['id', 'association'];
const POINT_KEYS = ['point', 'weight', 'facet'];
const entry = (node, key) => node.entries.find((e) => e.key === key);
function association(node, problems) {
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
        for (const e of item.entries)
            if (!POINT_KEYS.includes(e.key))
                problems.push({ line: e.line, message: `${where}: ${e.key} is none of point, weight, facet` });
        const point = {};
        const axes = entry(item, 'point');
        if (!axes)
            problems.push({ line: item.line, message: `${where} has no point` });
        else if (axes.value.kind !== 'map' || !axes.value.entries.length)
            problems.push({ line: axes.line, message: `${where}: its point is a map of axes to numbers` });
        else
            for (const axis of axes.value.entries) {
                if (axis.value.kind === 'scalar' && typeof axis.value.value === 'number')
                    point[axis.key] = axis.value.value;
                else
                    problems.push({ line: axis.line, message: `${where}: ${axis.key} is ${JSON.stringify(yamlValue(axis.value))}, not a number` });
            }
        const weight = entry(item, 'weight');
        const w = weight?.value.kind === 'scalar' ? weight.value.value : undefined;
        if (typeof w !== 'number')
            problems.push({ line: weight?.line ?? item.line, message: `${where}: ${weight ? `its weight is ${JSON.stringify(yamlValue(weight.value))}, not a number` : 'no weight'}` });
        const facet = entry(item, 'facet');
        const f = facet?.value.kind === 'scalar' ? facet.value.value : undefined;
        if (facet && typeof f !== 'string')
            problems.push({ line: facet.line, message: `${where}: its facet is ${JSON.stringify(yamlValue(facet.value))}, not a name` });
        return { point, weight: typeof w === 'number' ? w : 0, ...(typeof f === 'string' ? { facet: f } : {}) };
    });
}
export function readFragment(markdown) {
    const lines = markdown.split(/\r?\n/);
    if (lines[0] !== '---')
        return { problems: [{ line: 1, message: 'no frontmatter: a fragment file starts with a line `---`' }] };
    const close = lines.indexOf('---', 1);
    if (close < 0)
        return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
    const yaml = readYaml(lines.slice(1, close).join('\n'), 2);
    if ('problems' in yaml)
        return yaml;
    const root = yaml.node;
    if (root.kind !== 'map')
        return { problems: [{ line: root.line, message: 'the frontmatter is a map (`id: …`, `association: …`)' }] };
    const problems = [];
    const body = readBlocks(lines, close + 1);
    if ('problems' in body)
        problems.push(...body.problems);
    const id = entry(root, 'id');
    const idValue = id?.value.kind === 'scalar' ? id.value.value : undefined;
    if (!id)
        problems.push({ line: 1, message: 'no id in the frontmatter' });
    else if (typeof idValue !== 'string')
        problems.push({ line: id.line, message: `the id is ${JSON.stringify(yamlValue(id.value))}, not a string: quote it` });
    const assoc = entry(root, 'association');
    if (!assoc)
        problems.push({ line: 1, message: 'no association in the frontmatter' });
    const points = assoc ? association(assoc.value, problems) : [];
    if (problems.length || 'problems' in body)
        return { problems: problems.sort((a, b) => a.line - b.line) };
    const fragment = { id: idValue, text: body.text, association: points };
    const wrong = fragmentProblems(fragment);
    if (wrong.length)
        return {
            problems: wrong.map((message) => {
                const point = /point (\d+)/.exec(message);
                const line = point
                    ? assoc.value.items[Number(point[1]) - 1].line
                    : /no text/.test(message)
                        ? (body.map[0]?.line ?? close + 2) - 1
                        : id.line;
                return { line, message };
            }),
        };
    const meta = Object.fromEntries(root.entries.filter((e) => !ENTRY_KEYS.includes(e.key)).map((e) => [e.key, yamlValue(e.value)]));
    return { fragment, meta, prose: body.prose, layout: body.layout };
}
export function writeFragment({ fragment, meta, prose, layout }) {
    const clash = ENTRY_KEYS.filter((key) => Object.hasOwn(meta, key));
    if (clash.length)
        throw new Error(`writeFragment: the metadata has ${clash.join(' and ')}, which the entry writes`);
    const association = fragment.association.map(({ point, weight, facet }) => ({ point, weight, ...(facet === undefined ? {} : { facet }) }));
    const frontmatter = writeYaml({ id: fragment.id, association, ...meta });
    const body = layout ? rewrite(layout, fragment.text) : { blocks: [[fragment.text]], gaps: [['', '```cells'], ['```']] };
    return `---\n${frontmatter}---\n${writeBody(body, prose)}`;
}
export function readFragments(files) {
    const read = [];
    const problems = [];
    const firstPath = new Map();
    for (const [path, markdown] of Object.entries(files)) {
        const file = readFragment(markdown);
        if ('problems' in file) {
            problems.push(...file.problems.map((p) => `${path}:${p.line}: ${p.message}`));
            continue;
        }
        const { id } = file.fragment;
        const first = firstPath.get(id);
        if (first !== undefined)
            problems.push(`${path}:${markdown.split('\n').findIndex((l) => /^id:/.test(l)) + 1}: the id ${id} is given twice (first in ${first})`);
        else
            firstPath.set(id, path);
        read.push({ path, ...file });
    }
    return problems.length ? { problems } : { files: read };
}
