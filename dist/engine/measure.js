import { isNote } from "./ast.js";
import { normalise } from "./normalise/index.js";
import { parse } from "./parser/index.js";
const FREE = new Set(['label', 'show', 'tags', 'title', 'tier', 'about', 'size']);
const exprLeaves = (e) => e.k === 'ref' || e.k === 'num' ? 1 : e.k === 'sum' ? e.items.reduce((n, i) => n + exprLeaves(i.e), 0) : e.factors.reduce((n, f) => n + exprLeaves(f), 0);
function atomLeaves(a) {
    switch (a.kind) {
        case 'chord':
            return a.notes.length;
        case 'choice':
            return a.values.length;
        case 'seq':
            return a.layers.reduce((n, layer) => n + tokenLeaves(layer), 0);
        case 'mix':
            return a.exprs.reduce((n, e) => n + exprLeaves(e), 0);
        default:
            return 1;
    }
}
const tokenLeaves = (tokens) => tokens.reduce((n, t) => n + atomLeaves(t.atom), 0);
function braidLeaves(braid, lines) {
    switch (braid.kind) {
        case 'blank':
            return 0;
        case 'wave':
            return 1;
        case 'scan': {
            const { line, col, len } = braid.span;
            const written = (lines[line - 1] ?? '').slice(col - 1, col - 1 + len).replace(/^scan\(|\)$/g, '');
            return written.split(/[\s,]+/).filter(Boolean).length;
        }
        case 'list':
            return braid.signature ? 1 : tokenLeaves(braid.tokens);
    }
}
function logicalLines(text) {
    const out = new Map();
    let start = 0;
    let carry = null;
    text.split('\n').forEach((raw, i) => {
        const line = raw.replace(/"[^"]*"/g, '""').replace(/#.*$/, '');
        if (carry === null)
            start = i + 1;
        carry = carry === null ? line : `${carry} ${line}`;
        if (!/[+*,[]\s*$/.test(carry)) {
            out.set(start, carry);
            carry = null;
        }
    });
    if (carry !== null)
        out.set(start, carry);
    return out;
}
const attributesOf = (line) => [...line.matchAll(/(?:^|[\s(])([A-Za-z][A-Za-z0-9]*)=/g)].filter((m) => !FREE.has(m[1])).length + [...line.matchAll(/(?:^|\s)(off|oneshot)(?=\s|$)/g)].length;
export function structureByCell(text, { asWritten = false } = {}) {
    const source = asWritten ? text : normalise(text).source;
    const written = source.replace(/(^|[\s(])base=&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?/gm, '$1');
    const lines = written.split('\n');
    const cells = parse(written).cells.filter((d) => !isNote(d));
    const logical = logicalLines(source);
    const firstOnLine = new Set();
    return cells.map((d) => {
        const leaves = braidLeaves(d.braid, lines);
        const line = d.span.line;
        const attributes = !d.lambda && !firstOnLine.has(line) && logical.has(line) ? attributesOf(logical.get(line)) : 0;
        if (!d.lambda)
            firstOnLine.add(line);
        return { name: d.name, cells: 1, leaves, attributes, total: 1 + leaves + attributes };
    });
}
export function structureOf(text, options = {}) {
    const cells = structureByCell(text, options);
    const sum = (k) => cells.reduce((n, c) => n + c[k], 0);
    return { cells: sum('cells'), leaves: sum('leaves'), attributes: sum('attributes'), total: sum('total') };
}
