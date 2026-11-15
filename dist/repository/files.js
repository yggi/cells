import { readPiece, writePiece } from "../engine/piecefile.js";
import { parse } from "../engine/parser/index.js";
import { AXIS_NAMES } from "../engine/style.js";
import { associationOf, FOLDER_FACETS } from "./declarations.js";
import { fragmentProblems } from "./fragments.js";
import { readYaml, yamlValue } from "./yaml.js";
const ENTRY_KEYS = ['id', 'association'];
const POINT_KEYS = ['point', 'weight', 'facet', 'args'];
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
                problems.push({ line: e.line, message: `${where}: ${e.key} is none of point, weight, facet, args` });
        const point = {};
        const axes = entry(item, 'point');
        if (!axes) {
            if (!entry(item, 'facet'))
                problems.push({ line: item.line, message: `${where} has no point and no facet: a fragment of no style names the facet it is found as` });
        }
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
        const w = weight?.value.kind === 'scalar' ? weight.value.value : !weight && !axes ? 1 : undefined;
        if (typeof w !== 'number')
            problems.push({ line: weight?.line ?? item.line, message: `${where}: ${weight ? `its weight is ${JSON.stringify(yamlValue(weight.value))}, not a number` : 'no weight'}` });
        const facet = entry(item, 'facet');
        const f = facet?.value.kind === 'scalar' ? facet.value.value : undefined;
        if (facet && typeof f !== 'string')
            problems.push({ line: facet.line, message: `${where}: its facet is ${JSON.stringify(yamlValue(facet.value))}, not a name` });
        const argsEntry = entry(item, 'args');
        const args = {};
        if (argsEntry && (argsEntry.value.kind !== 'map' || !argsEntry.value.entries.length))
            problems.push({ line: argsEntry.line, message: `${where}: its args are a map of parameters to values` });
        else if (argsEntry && argsEntry.value.kind === 'map')
            for (const a of argsEntry.value.entries) {
                const v = a.value.kind === 'scalar' ? a.value.value : undefined;
                if ((typeof v === 'string' && /^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(v) && !/[&=]/.test(v)) || typeof v === 'number')
                    args[a.key] = String(v);
                else
                    problems.push({ line: a.line, message: `${where}: its arg ${a.key} is ${JSON.stringify(yamlValue(a.value))}, not a value (a word, a number, 8n:2/3, meter("7/8"))` });
            }
        return { point, weight: typeof w === 'number' ? w : 0, ...(typeof f === 'string' ? { facet: f } : {}), ...(Object.keys(args).length ? { args } : {}) };
    });
}
export function readFragment(markdown, options = {}) {
    const lines = markdown.split(/\r?\n/);
    if (lines[0] !== '---')
        return { problems: [{ line: 1, message: 'no frontmatter: a fragment file starts with a line `---`' }] };
    const piece = readPiece(markdown);
    if ('problems' in piece)
        return { problems: piece.problems.map((p) => (/^the frontmatter is a map/.test(p.message) ? { ...p, message: 'the frontmatter is a map (`id: …`, `association: …`)' } : p)) };
    const close = lines.indexOf('---', 1);
    const root = readYaml(lines.slice(1, close).join('\n'), 2).node;
    const problems = [];
    const id = entry(root, 'id');
    const idValue = id?.value.kind === 'scalar' ? id.value.value : undefined;
    if (!id)
        problems.push({ line: 1, message: 'no id in the frontmatter' });
    else if (typeof idValue !== 'string')
        problems.push({ line: id.line, message: `the id is ${JSON.stringify(yamlValue(id.value))}, not a string: quote it` });
    const assoc = entry(root, 'association');
    const declared = associationOf(piece.text, { ...(options.facet === undefined ? {} : { facet: options.facet }), styles: options.styles ?? new Map() });
    const firstLine = (piece.map?.[0]?.line ?? close + 2) - 1;
    if (assoc && declared?.explicit)
        problems.push({ line: assoc.line, message: 'the association is written twice: in the frontmatter and in the text’s declarations (decision 089): keep the declarations' });
    else if (!assoc && !declared)
        problems.push({ line: 1, message: 'no association: no declaration in the text (`* from style=…`, a signature with style=) and none in the frontmatter' });
    if (declared && !assoc)
        problems.push(...declared.problems.map((message) => ({ line: firstLine, message })));
    const points = assoc ? association(assoc.value, problems) : (declared?.association ?? []);
    if (problems.length)
        return { problems: problems.sort((a, b) => a.line - b.line) };
    const fragment = { id: idValue, text: piece.text, association: points };
    const wrong = fragmentProblems(fragment);
    if (wrong.length)
        return {
            problems: wrong.map((message) => {
                const point = /point (\d+)/.exec(message);
                const line = point && assoc
                    ? assoc.value.items[Number(point[1]) - 1].line
                    : /no text/.test(message)
                        ? (piece.map?.[0]?.line ?? close + 2) - 1
                        : id.line;
                return { line, message };
            }),
        };
    const meta = Object.fromEntries(Object.entries(piece.frontmatter).filter(([key]) => !ENTRY_KEYS.includes(key)));
    return { fragment, meta, prose: piece.prose, layout: piece.layout };
}
export function writeFragment({ fragment, meta, prose, layout }, options = {}) {
    const clash = ENTRY_KEYS.filter((key) => Object.hasOwn(meta, key));
    if (clash.length)
        throw new Error(`writeFragment: the metadata has ${clash.join(' and ')}, which the entry writes`);
    const association = fragment.association.map(({ point, weight, facet, args }) => ({
        ...(Object.keys(point).length ? { point, weight } : weight === 1 ? {} : { weight }),
        ...(facet === undefined ? {} : { facet }),
        ...(args === undefined ? {} : { args }),
    }));
    const derived = associationOf(fragment.text, { ...(options.facet === undefined ? {} : { facet: options.facet }), styles: options.styles ?? new Map() });
    const declares = derived !== null && (derived.explicit || sameAssociation(derived.association, fragment.association));
    return writePiece({ frontmatter: { id: fragment.id, ...(declares ? {} : { association }), ...meta }, text: fragment.text, prose, layout });
}
export function readFragments(files) {
    const read = [];
    const problems = [];
    const firstPath = new Map();
    const styles = styleNamesIn(files);
    for (const [path, markdown] of Object.entries(files)) {
        const facet = FOLDER_FACETS[path.split('/')[0]];
        const file = readFragment(markdown, { ...(facet === undefined || !path.includes('/') ? {} : { facet }), styles });
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
export function styleNamesIn(files) {
    for (const markdown of Object.values(files)) {
        if (!/^id: styles$/m.test(markdown.slice(0, markdown.indexOf('\n---', 3) + 1)))
            continue;
        const piece = readPiece(markdown);
        if ('problems' in piece)
            return new Map();
        return new Map(parse(piece.text).cells.flatMap((cell) => {
            const values = cell.braid.kind === 'list' ? cell.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
            return cell.map?.kind === 'style' && values.length === AXIS_NAMES.length && values.every(Number.isFinite)
                ? [[cell.name, Object.fromEntries(AXIS_NAMES.map((a, i) => [a, values[i]]))]]
                : [];
        }));
    }
    return new Map();
}
const sameAssociation = (a, b) => JSON.stringify(a) === JSON.stringify(b);
