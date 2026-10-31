import { readBlocks, rewrite, writeBody } from "./literate.js";
import { readYaml, writeYaml, yamlValue } from "../repository/yaml.js";
import { readFrom, readUse } from "./parser/use.js";
import { splitComment } from "./edit.js";
const CELLS_FENCE = /^`{3,}\s*cells\s*$/m;
export const isPieceFile = (source) => /^---\r?\n/.test(source) || CELLS_FENCE.test(source);
function keyProblems(root) {
    const problems = [];
    for (const { key, line, value } of root.entries) {
        const v = yamlValue(value);
        if (key === 'title' && (typeof v !== 'string' || !v.trim()))
            problems.push({ line, message: `the title is ${JSON.stringify(v)}, not a text: title: "A name"` });
        if (key === 'description' && typeof v !== 'string')
            problems.push({ line, message: `the description is ${JSON.stringify(v)}, not a text: description: "What it is"` });
        if (key === 'tags' && !(Array.isArray(v) && v.every((t) => typeof t === 'string' && t.trim())))
            problems.push({ line, message: `the tags are ${JSON.stringify(v)}, not a list of names: tags: [genre:jazz, rhythm]` });
        if (key === 'tier' && !(typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 9999))
            problems.push({ line, message: `the tier is ${JSON.stringify(v)}: a tier of the tutorial is a whole number, 1 to 9999` });
        if (key === 'uses' && !(Array.isArray(v) && v.every(isLocked)))
            problems.push({ line, message: `the uses are ${JSON.stringify(v)}, not a lockfile: uses: a list of - id: gm_kit, hash: e1:…` });
    }
    return problems;
}
export function readPiece(markdown) {
    const lines = markdown.split(/\r?\n/);
    if (lines[0] !== '---') {
        if (!CELLS_FENCE.test(markdown))
            return { problems: [{ line: 1, message: 'no frontmatter: a piece file starts with a line `---`, or holds a ```cells block' }] };
        const body = readBlocks(lines, 0);
        if ('problems' in body)
            return body;
        return { frontmatter: {}, text: body.text, prose: body.prose, map: body.map, layout: body.layout, bare: true };
    }
    const close = lines.indexOf('---', 1);
    if (close < 0)
        return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
    const yaml = readYaml(lines.slice(1, close).join('\n'), 2);
    if ('problems' in yaml)
        return yaml;
    const root = yaml.node;
    if (root.kind !== 'map')
        return { problems: [{ line: root.line, message: 'the frontmatter is a map (`title: …`, `tags: […]`)' }] };
    const body = readBlocks(lines, close + 1);
    const problems = [...keyProblems(root), ...('problems' in body ? body.problems : [])];
    if ('problems' in body || problems.length)
        return { problems: problems.sort((a, b) => a.line - b.line) };
    return { frontmatter: yamlValue(root), text: body.text, prose: body.prose, map: body.map, layout: body.layout };
}
function isLocked(v) {
    if (typeof v !== 'object' || v === null || Array.isArray(v))
        return false;
    const m = v;
    return Object.keys(m).sort().join() === 'hash,id' && typeof m.id === 'string' && typeof m.hash === 'string';
}
const asYaml = (entries) => entries.map(({ id, hash }) => ({ id, hash }));
export const lockfileOf = ({ frontmatter }) => Array.isArray(frontmatter.uses) ? frontmatter.uses.filter(isLocked).map(({ id, hash }) => ({ id, hash })) : [];
export function withLockfile(file, uses) {
    const had = lockfileOf(file);
    const entries = uses.flatMap((u) => (u.hash ? [{ id: u.id, hash: u.hash }] : had.filter((k) => k.id === u.id)));
    const once = entries.filter((k, i) => entries.findIndex((e) => e.id === k.id) === i);
    return { ...file, frontmatter: { ...file.frontmatter, uses: asYaml(once) } };
}
const usedIds = (text) => new Set(text.split('\n').flatMap((raw) => {
    const code = splitComment(raw)[0];
    const from = readFrom(code);
    return readUse(code)?.id ?? (from?.kind === 'use' ? from.id : []);
}));
function pruned(frontmatter, text) {
    if (!('uses' in frontmatter) || !Array.isArray(frontmatter.uses))
        return frontmatter;
    const named = usedIds(text);
    const kept = lockfileOf({ frontmatter }).filter((k) => named.has(k.id));
    return Object.fromEntries(Object.entries(frontmatter).flatMap(([k, v]) => (k !== 'uses' ? [[k, v]] : kept.length ? [[k, asYaml(kept)]] : [])));
}
export function writePiece(file) {
    const { text, prose, layout, bare } = file;
    const frontmatter = pruned(file.frontmatter, text);
    const body = layout ? rewrite(layout, text) : { blocks: [[text]], gaps: [['', '```cells'], ['```']] };
    if (bare && layout && !Object.keys(frontmatter).length) {
        const first = body.gaps[0];
        const out = writeBody(body, prose);
        return first.every((l, j) => !l.trim() || j === first.length - 1) ? out.slice(1) : out;
    }
    return `---\n${writeYaml(frontmatter)}---\n${writeBody(body, prose)}`;
}
