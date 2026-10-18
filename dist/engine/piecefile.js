import { readYaml, writeYaml, yamlValue } from "../repository/yaml.js";
const FENCE = /^```cells\s*$/;
export const isPieceFile = (source) => /^---\r?\n/.test(source);
function keyProblems(root) {
    const problems = [];
    for (const { key, line, value } of root.entries) {
        const v = yamlValue(value);
        if (key === 'title' && (typeof v !== 'string' || !v.trim()))
            problems.push({ line, message: `the title is ${JSON.stringify(v)}, not a text: title: "A name"` });
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
    const problems = keyProblems(root);
    const fences = lines.flatMap((l, i) => (i > close && FENCE.test(l) ? [i] : []));
    const open = fences[0];
    if (open === undefined)
        problems.push({ line: close + 1, message: 'no ```cells block after the frontmatter' });
    if (fences.length > 1)
        problems.push({ line: fences[1] + 1, message: `a second \`\`\`cells block (the first is at line ${open + 1}): a piece file holds one` });
    const end = open === undefined ? -1 : lines.indexOf('```', open + 1);
    if (open !== undefined && end < 0)
        problems.push({ line: open + 1, message: 'the ```cells block is never closed (a line ```)' });
    const before = open === undefined ? -1 : lines.slice(close + 1, open).findIndex((l) => l.trim());
    if (before >= 0)
        problems.push({ line: close + 2 + before, message: 'prose before the ```cells block: the block comes first, the prose after it' });
    if (problems.length)
        return { problems: problems.sort((a, b) => a.line - b.line) };
    const prose = lines
        .slice(end + 1)
        .join('\n')
        .replace(/^\s*\n/, '')
        .trimEnd();
    return { frontmatter: yamlValue(root), text: lines.slice(open + 1, end).join('\n'), prose };
}
export function writePiece({ frontmatter, text, prose }) {
    return `---\n${writeYaml(frontmatter)}---\n\n\`\`\`cells\n${text}\n\`\`\`\n${prose ? `\n${prose}\n` : ''}`;
}
