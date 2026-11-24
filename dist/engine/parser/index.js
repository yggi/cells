import { applyBases } from "./base.js";
import { isNote } from "../ast.js";
import { isPieceFile, readPiece } from "../piecefile.js";
import { IDENT, LineError, LineScanner, placeIn, stripComment } from "./scanner.js";
import { parseBody, parseCell } from "./cell.js";
import { splitPlugins } from "../plugins.js";
import { FROM_FORM, isUse, readFrom, USE_RETIRED } from "./use.js";
export { groupingOf, meterLevels } from "./generators.js";
export { readFrom, USE_RETIRED } from "./use.js";
export function rereadLine(built, filled) {
    const s = new LineScanner(filled, built.line, 0, [], built.parts, [], 0, parseBody);
    const decl = parseCell(s);
    return { decl, lambdas: s.lambdas };
}
export function parse(whole) {
    const cells = [];
    const takes = [];
    const offers = [];
    const { text: source, plugins, diagnostics: pluginDiagnostics } = splitPlugins(whole);
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
    lines.forEach(({ text: written, line: lineNo, parts }) => {
        const text = written;
        const s = new LineScanner(text, lineNo, 0, [], parts, diagnostics, 0, parseBody);
        if (s.done())
            return;
        if (isUse(text)) {
            const col = text.search(/\S/);
            diagnostics.push({ severity: 'error', message: USE_RETIRED, span: { line: lineNo, col: col + 1, len: text.trimEnd().length - col } });
            return;
        }
        const from = readFrom(text);
        if (from !== undefined) {
            const col = text.search(/\S/);
            const span = { line: lineNo, col: col + 1, len: text.trimEnd().length - col };
            if (from === null)
                diagnostics.push({ severity: 'error', message: FROM_FORM, span });
            else if (from.kind === 'use')
                takes.push({ id: from.id, names: from.names, span });
            else if (from.kind === 'signature')
                offers.push(...from.names.map((n) => n.slice(1)));
            if (from && from.kind !== 'use')
                for (const a of from.attributes ?? []) {
                    const name = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(a)?.[1];
                    if (!name || name === 'style' || name === 'facet')
                        continue;
                    const optional = from.kind === 'signature' ? from.optional.map((o) => o.slice(1)) : [];
                    if (!optional.includes(name))
                        diagnostics.push({
                            severity: 'error',
                            message: from.kind === 'declaration'
                                ? `${name}=: a collection's declaration says where it is found, style= and facet= (decision 089)`
                                : `${name}= is no optional parameter of this template: a declaration's arguments are its optional parameters (${optional.length ? optional.map((o) => `${o}=`).join(' ') : 'it has none'}), beside style= and facet=`,
                            span,
                        });
                }
            return;
        }
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
                if (s.holes.length && decl.base) {
                    diagnostics.push({ severity: 'error', message: 'base= and a cell read as the piece is built (seed=&s, 0!&n) are not yet one line: write the number, or the cell without base=', span: decl.base.span });
                    return;
                }
                const built = s.holes.length ? { text, line: lineNo, parts, lambdas: s.lambdas.map((l) => l.name), holes: [...s.holes] } : undefined;
                cells.push(built ? { ...decl, built } : decl, ...s.lambdas);
            }
            else
                s.fail(`A line declares a cell: &name …`, start, word.length);
        }
        catch (e) {
            if (!(e instanceof LineError))
                throw e;
            const head = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
            if (s.holes.length && head) {
                const at = text.indexOf('&');
                const ref = { name: head[1], pick: null, shift: 0, span: { ...placeIn(parts, at), len: head[0].length - head[0].indexOf('&') } };
                cells.push({ ...parseBody(new LineScanner('', lineNo, 0, [], parts, [], 0, parseBody), ref), built: { text, line: lineNo, parts, lambdas: [], holes: [...s.holes] } });
                return;
            }
            diagnostics.push({ severity: 'error', message: e.message, span: { ...placeIn(parts, e.col), len: e.len } });
            const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
            if (name)
                broken.push(name);
        }
    });
    return applyBases({ cells, diagnostics, broken, plugins, ...(takes.length ? { takes } : {}), ...(offers.length ? { offers } : {}) });
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
    return null;
}
