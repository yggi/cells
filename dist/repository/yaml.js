class Refusal extends Error {
    line;
    constructor(line, message) {
        super(message);
        this.line = line;
    }
}
const DECIMAL = /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/;
const OTHER_NUMBER = /^([-+]?0x[0-9a-fA-F]+|[-+]?0o[0-7]+|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN))$/;
const NULL = /^(null|Null|NULL|~)$/;
const TRUE = /^(true|True|TRUE)$/;
const FALSE = /^(false|False|FALSE)$/;
const OLD_BOOLEAN = /^(y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;
const INDICATOR = /^[-?:,[\]{}#&*!|>'"%@`]/;
const isKey = (key) => key !== '' && !INDICATOR.test(key) && !/: |:$| #|^\s|\s$/.test(key) && !/^[0-9]+$/.test(key) && !/[\n\r\t]/.test(key);
function plainValue(text, line, inFlow) {
    const [first] = text;
    if (first === '&' || first === '*')
        throw new Refusal(line, `an ${first === '&' ? 'anchor' : 'alias'} (${text}): the subset has none; write the value out`);
    if (first === '!')
        throw new Refusal(line, `a tag (${text}): the subset has none`);
    if (first === '|' || first === '>')
        throw new Refusal(line, `a block scalar (${first}): write the text on one line, quoted, with \\n`);
    if (first === '{' || first === '[')
        throw new Refusal(line, `flow style beyond [a, b] (${text}): write the map or the list as a block`);
    if (/^([-?:]( |$)|[%@`,\]}])/.test(text))
        throw new Refusal(line, `${first} can't start a plain value: quote it`);
    if (first === '#' || text.includes(' #'))
        throw new Refusal(line, `a comment: the subset has none; say it in the prose or under a key`);
    if (/: |:$/.test(text))
        throw new Refusal(line, `a colon and a space in a plain value (${text}): quote it`);
    if (inFlow && /[[\]{},]/.test(text))
        throw new Refusal(line, `flow style beyond [a, b] (${text}): quote an item that holds , [ ] { }`);
    if (NULL.test(text))
        return null;
    if (TRUE.test(text))
        return true;
    if (FALSE.test(text))
        return false;
    if (DECIMAL.test(text))
        return Number(text);
    if (OTHER_NUMBER.test(text))
        throw new Refusal(line, `a number the subset doesn't read (${text}): write it in decimal, or quote it`);
    return text;
}
function quoted(text, line) {
    if (text[0] === "'") {
        let value = '';
        for (let i = 1; i < text.length; i++) {
            if (text[i] !== "'")
                value += text[i];
            else if (text[i + 1] === "'")
                value += text[i++];
            else
                return { value, length: i + 1 };
        }
    }
    else {
        for (let i = 1; i < text.length; i++) {
            if (text[i] === '\\')
                i++;
            else if (text[i] === '"') {
                try {
                    return { value: JSON.parse(text.slice(0, i + 1)), length: i + 1 };
                }
                catch {
                    throw new Refusal(line, `an escape the subset doesn't read in ${text.slice(0, i + 1)}: it reads JSON's (\\" \\\\ \\n \\t \\uXXXX …)`);
                }
            }
        }
    }
    throw new Refusal(line, `a quoted string that isn't closed on its line (${text})`);
}
function scalarNode(text, line) {
    if (text === '{}')
        return { kind: 'map', line, entries: [] };
    if (text[0] === '"' || text[0] === "'") {
        const { value, length } = quoted(text, line);
        if (text.slice(length).trim())
            throw new Refusal(line, `text after a quoted string (${text.slice(length).trim()})`);
        return { kind: 'scalar', line, value };
    }
    if (text[0] === '[' && text.endsWith(']')) {
        const items = [];
        let rest = text.slice(1, -1).trim();
        while (rest) {
            let value;
            if (rest[0] === '"' || rest[0] === "'") {
                const q = quoted(rest, line);
                value = q.value;
                rest = rest.slice(q.length).trim();
            }
            else {
                const end = rest.indexOf(',');
                const item = (end < 0 ? rest : rest.slice(0, end)).trim();
                if (!item)
                    throw new Refusal(line, `an empty item in ${text}`);
                value = plainValue(item, line, true);
                rest = end < 0 ? '' : rest.slice(end);
            }
            items.push({ kind: 'scalar', line, value });
            if (rest && rest[0] !== ',')
                throw new Refusal(line, `a list item followed by ${rest[0]}, not a comma`);
            rest = rest.slice(1).trim();
            if (!rest && text.slice(1, -1).trim().endsWith(','))
                throw new Refusal(line, `an empty item at the end of ${text}`);
        }
        return { kind: 'list', line, items };
    }
    return { kind: 'scalar', line, value: plainValue(text, line, false) };
}
export function readYaml(text, firstLine = 1) {
    const lines = [];
    try {
        text.split('\n').forEach((raw, i) => {
            const line = firstLine + i;
            if (!raw.trim())
                return;
            const indent = raw.length - raw.trimStart().length;
            if (raw.slice(0, indent).includes('\t'))
                throw new Refusal(line, 'a tab in an indent: indent with spaces');
            const content = raw.trim();
            if (/^(---|\.\.\.)(\s|$)/.test(content))
                throw new Refusal(line, `a second document (${content}): the frontmatter is one`);
            if (content[0] === '%')
                throw new Refusal(line, `a directive (${content}): the subset has none`);
            if (content[0] === '#')
                throw new Refusal(line, 'a comment: the subset has none; say it in the prose or under a key');
            lines.push({ line, indent, text: content });
        });
        if (!lines.length)
            return { node: { kind: 'map', line: firstLine, entries: [] } };
        let at = 0;
        const isItem = (l) => l.text === '-' || l.text.startsWith('- ');
        const block = (indent) => (isItem(lines[at]) ? list(indent) : map(indent));
        const valueAfter = (rest, line, indent, allowLevelList) => {
            const next = lines[at];
            if (rest) {
                if (next && next.indent > indent)
                    throw new Refusal(next.line, 'a value over two lines, or indented under a value: the subset reads a value on one line');
                return scalarNode(rest, line);
            }
            if (next && next.indent > indent)
                return block(next.indent);
            if (next && allowLevelList && next.indent === indent && isItem(next))
                return list(indent);
            return { kind: 'scalar', line, value: null };
        };
        const list = (indent) => {
            const items = [];
            const start = lines[at].line;
            while (at < lines.length && lines[at].indent === indent && isItem(lines[at])) {
                const current = lines[at];
                const rest = current.text.slice(1).trimStart();
                const column = indent + current.text.length - rest.length;
                if (rest && (/^-( |$)/.test(rest) || /^[^"'[{][^]*?(: |:$)/.test(rest))) {
                    lines[at] = { line: current.line, indent: column, text: rest };
                    items.push(block(column));
                }
                else {
                    at++;
                    items.push(valueAfter(rest, current.line, indent, false));
                }
            }
            return { kind: 'list', line: start, items };
        };
        const map = (indent) => {
            const entries = [];
            const start = lines[at].line;
            while (at < lines.length && lines[at].indent === indent) {
                const { line, text } = lines[at];
                if (isItem(lines[at]))
                    throw new Refusal(line, 'a list item where a key was expected');
                if (text[0] === '?')
                    throw new Refusal(line, 'a complex key (?): keys are plain words');
                const colon = text.search(/: |:$/);
                if (colon < 0)
                    throw new Refusal(line, `no key: a line in a map is \`key: value\` (${text})`);
                const key = text.slice(0, colon);
                if (key[0] === '"' || key[0] === "'")
                    throw new Refusal(line, `a quoted key (${key}): keys are plain words`);
                if (/^[0-9]+$/.test(key))
                    throw new Refusal(line, `a key that is a number (${key}): keys are words`);
                if (!isKey(key))
                    throw new Refusal(line, `a key the subset doesn't read (${key}): keys are plain words`);
                if (entries.some((e) => e.key === key))
                    throw new Refusal(line, `the key ${key} is given twice`);
                at++;
                entries.push({ key, line, value: valueAfter(text.slice(colon + 1).trim(), line, indent, true) });
            }
            return { kind: 'map', line: start, entries };
        };
        const node = block(lines[0].indent);
        if (at < lines.length)
            throw new Refusal(lines[at].line, 'indented as no key above it is');
        return { node };
    }
    catch (e) {
        if (e instanceof Refusal)
            return { problems: [{ line: e.line, message: e.message }] };
        throw e;
    }
}
export function yamlValue(node) {
    if (node.kind === 'scalar')
        return node.value;
    if (node.kind === 'list')
        return node.items.map(yamlValue);
    return Object.fromEntries(node.entries.map((e) => [e.key, yamlValue(e.value)]));
}
const isScalar = (v) => v === null || typeof v !== 'object';
function writeString(s, inFlow) {
    let plain = s !== '' && s === s.trim() && !INDICATOR.test(s) && !/[\n\r\t\\]/.test(s) && !OLD_BOOLEAN.test(s) && !(inFlow && /[[\]{},]/.test(s));
    if (plain) {
        try {
            plain = plainValue(s, 0, inFlow) === s;
        }
        catch {
            plain = false;
        }
    }
    return plain ? s : JSON.stringify(s);
}
function writeScalar(v, inFlow = false) {
    if (typeof v === 'string')
        return writeString(v, inFlow);
    if (typeof v === 'number' && !Number.isFinite(v))
        throw new Error(`writeYaml: ${v} is no number the subset writes`);
    return String(v);
}
function inline(v) {
    if (isScalar(v))
        return writeScalar(v);
    if (Array.isArray(v))
        return v.every(isScalar) ? `[${v.map((x) => writeScalar(x, true)).join(', ')}]` : null;
    return Object.keys(v).length ? null : '{}';
}
function blockLines(v, indent) {
    if (Array.isArray(v))
        return v.flatMap((item) => {
            const one = inline(item);
            if (one !== null)
                return [`${indent}- ${one}`];
            const [first, ...rest] = blockLines(item, `${indent}  `);
            return [`${indent}- ${first.trimStart()}`, ...rest];
        });
    return Object.entries(v).flatMap(([key, value]) => {
        if (!isKey(key))
            throw new Error(`writeYaml: the key ${JSON.stringify(key)} is no key the subset reads (a plain word)`);
        const one = inline(value);
        return one !== null ? [`${indent}${key}: ${one}`] : [`${indent}${key}:`, ...blockLines(value, `${indent}  `)];
    });
}
export function writeYaml(map) {
    return blockLines(map, '')
        .map((l) => `${l}\n`)
        .join('');
}
