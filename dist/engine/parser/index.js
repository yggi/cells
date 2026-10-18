import { applyBases } from "./base.js";
import { isNote } from "../ast.js";
import { isPieceFile, readPiece } from "../piecefile.js";
import { IDENT, LineError, LineScanner, stripComment } from "./scanner.js";
import { parseBody, parseCell, SHOWS } from "./cell.js";
import { splitPlugins } from "../plugins.js";
import { BUILTIN_PLUGINS } from "../builtinPlugins.js";
export { meterLevels, SIGNATURES } from "./generators.js";
export { SHOWS } from "./cell.js";
export function parse(whole) {
    const cells = [];
    const { text: source, plugins, diagnostics: pluginDiagnostics } = splitPlugins(whole, [...SHOWS, ...BUILTIN_PLUGINS.map((p) => p.name)]);
    const diagnostics = [...pluginDiagnostics];
    const broken = [];
    const lines = [];
    let carry = null;
    source.split('\n').forEach((raw, idx) => {
        const text = stripComment(raw);
        if (carry) {
            carry.text += ' ';
            carry.parts.push({ line: idx + 1, start: carry.text.length });
            carry.text += text;
        }
        else
            carry = { text, line: idx + 1, parts: [{ line: idx + 1, start: 0 }] };
        if (!/[+*,[]\s*$/.test(carry.text)) {
            lines.push(carry);
            carry = null;
        }
    });
    if (carry)
        lines.push(carry);
    lines.forEach(({ text, line: lineNo, parts }) => {
        const s = new LineScanner(text, lineNo, 0, [], parts, diagnostics, 0, parseBody);
        if (s.done())
            return;
        try {
            const start = s.i;
            const word = s.match(IDENT);
            if (word === 'step' && s.peek() === '(')
                s.fail('step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm', start, 4);
            else if (word === 'out' && /^\s*[(=]/.test(s.text.slice(s.i)))
                s.fail('out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix', start, 3);
            else if (word === 'cell')
                s.fail('The cell keyword is gone: a line starting with &name declares a cell', start, 4);
            else if (word === null) {
                s.i = start;
                const decl = parseCell(s);
                cells.push(decl, ...s.lambdas);
            }
            else
                s.fail(`A line declares a cell: &name …`, start, word.length);
        }
        catch (e) {
            if (!(e instanceof LineError))
                throw e;
            diagnostics.push({ severity: 'error', message: e.message, span: { line: lineNo, col: e.col + 1, len: e.len } });
            const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
            if (name)
                broken.push(name);
        }
    });
    return applyBases({ cells, diagnostics, broken, plugins });
}
export const plainLabel = (label) => label
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
function card(title, label, tagList, tier, cell) {
    const plain = plainLabel(label);
    const tags = tagList
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t, i, all) => all.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i);
    const description = plain.toLowerCase().startsWith(title.toLowerCase()) ? plain.slice(title.length).replace(/^[\s,.:;—–-]+/, '') : plain;
    return { title, description, tags, tier, cell };
}
export const CARD = 'piece';
export function pieceMeta(source) {
    if (isPieceFile(source)) {
        const file = readPiece(source);
        if ('problems' in file)
            return null;
        const { title, tags, tier, description } = file.frontmatter;
        if (typeof title !== 'string')
            return null;
        const note = parse(file.text).cells.find((c) => c.name === CARD && isNote(c));
        const tagList = Array.isArray(tags) ? tags.filter((t) => typeof t === 'string') : [];
        return card(title, typeof description === 'string' ? description : (note?.label ?? ''), tagList, typeof tier === 'number' ? tier : null, note?.name ?? null);
    }
    const d = parse(source).cells.find((c) => c.title);
    if (!d)
        return null;
    return card(d.title, d.label ?? '', (d.tags ?? '').split(','), d.tier ?? null, d.name);
}
