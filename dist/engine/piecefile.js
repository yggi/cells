import { readBlocks, rewrite, writeBody } from "./literate.js";
import { readYaml, writeYaml, yamlValue } from "../repository/yaml.js";
export const isPieceFile = (source) => /^---\r?\n/.test(source);
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
    }
    return problems;
}
export function readPiece(markdown) {
    const lines = markdown.split(/\r?\n/);
    if (lines[0] !== '---')
        return { problems: [{ line: 1, message: 'no frontmatter: a piece file starts with a line `---`' }] };
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
export function writePiece({ frontmatter, text, prose, layout }) {
    const body = layout ? rewrite(layout, text) : { blocks: [[text]], gaps: [['', '```cells'], ['```']] };
    return `---\n${writeYaml(frontmatter)}---\n${writeBody(body, prose)}`;
}
