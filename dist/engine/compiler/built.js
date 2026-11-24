import { rereadLine } from "../parser/index.js";
import { LineError } from "../parser/scanner.js";
import { NUMBER_PLACES } from "../parser/numbers.js";
import { constantOf } from "../valuesum.js";
export function builtProblem(read, c) {
    return c.step
        ? `&${c.name} is read as ${read}: a stepped one is not yet a form; write one number (&${c.name} 3)`
        : `&${c.name} is read as ${read}: a cell that is one number, filled as the piece is built (&${c.name} 3)`;
}
export function readBuilt(decls, ref, read) {
    const c = decls.get(ref.name);
    if (!c)
        return { unknown: ref };
    if (c.fill && c.braid.kind === 'blank')
        return { blank: true };
    const value = constantOf(decls, c.name);
    return value === null ? { problem: builtProblem(read, c), at: c.span } : { value, cell: c };
}
export function builtNumber(said, decls, ref, read) {
    const got = readBuilt(decls, ref, read);
    if ('value' in got)
        return got;
    if ('unknown' in got)
        said.unknownCell(got.unknown.name, got.unknown.span);
    else if ('problem' in got)
        said.error(got.problem, got.at);
    return null;
}
export function placeProblem(place, value) {
    if (place.whole && !place.rounds && !Number.isInteger(value))
        return `it takes a whole number, not ${value}`;
    if ((place.min !== undefined && value < place.min) || (place.max !== undefined && value > place.max))
        return `it takes ${place.min ?? 'any'} to ${place.max ?? 'any'}, not ${value}`;
    return null;
}
const FILLING = new Map(Object.values(NUMBER_PLACES).flatMap((p) => (p.fills ? [[p.form, p]] : [])));
const numberText = (v) => String(Math.round(v * 1e9) / 1e9).replace(/^(-?)0\./, '$10.');
function unfilled(holes) {
    let shift = 0;
    const places = holes.map((h) => {
        const start = h.from + shift;
        shift += h.length - (h.to - h.from);
        return { ...h, start, end: start + h.length, after: shift };
    });
    return (p) => {
        let moved = 0;
        for (const h of places) {
            if (p < h.start)
                break;
            if (p < h.end)
                return h.from;
            moved = h.after;
        }
        return p - moved;
    };
}
const isSpan = (x) => !!x && typeof x === 'object' && typeof x.line === 'number' && typeof x.col === 'number' && typeof x.len === 'number';
function respanned(x, line, back, seen = new Map()) {
    if (!x || typeof x !== 'object')
        return x;
    if (seen.has(x))
        return seen.get(x);
    if (Array.isArray(x)) {
        const out = [];
        seen.set(x, out);
        for (const v of x)
            out.push(respanned(v, line, back, seen));
        return out;
    }
    if (isSpan(x) && x.line === line) {
        const from = back(x.col - 1);
        const to = back(x.col - 1 + x.len);
        return { ...x, col: from + 1, len: Math.max(1, to - from) };
    }
    const out = {};
    seen.set(x, out);
    for (const [k, v] of Object.entries(x))
        out[k] = respanned(v, line, back, seen);
    return out;
}
function filledLine(b, texts) {
    const sorted = [...texts].sort((a, c) => c.hole.from - a.hole.from);
    let filled = b.text;
    for (const t of sorted)
        filled = filled.slice(0, t.hole.from) + t.text + filled.slice(t.hole.to);
    try {
        const again = rereadLine(b, filled);
        if (b.parts.length > 1)
            return again;
        const back = unfilled([...texts].sort((a, c) => a.hole.from - c.hole.from).map((t) => ({ from: t.hole.from, to: t.hole.to, length: t.text.length })));
        return { decl: respanned(again.decl, b.line, back), lambdas: again.lambdas.map((l) => respanned(l, b.line, back)) };
    }
    catch (e) {
        if (!(e instanceof LineError))
            throw e;
        return { problem: `${b.text.trim()}, filled as ${filled.trim()}: ${e.message}` };
    }
}
export function fillBuilt(parsed) {
    if (!parsed.cells.some((c) => c.built))
        return parsed;
    const decls = new Map(parsed.cells.map((c) => [c.name, c]));
    const diagnostics = [...parsed.diagnostics];
    const out = [];
    const gone = new Set();
    const made = new Map();
    for (const d of parsed.cells) {
        const b = d.built;
        if (!b)
            continue;
        const texts = [];
        let ok = true;
        for (const h of b.holes) {
            const place = FILLING.get(h.form);
            const got = readBuilt(decls, h.ref, place.fills.read);
            if ('problem' in got)
                diagnostics.push({ severity: 'error', message: got.problem, span: got.at });
            if (!('value' in got)) {
                ok = false;
                continue;
            }
            const problem = placeProblem(place, got.value);
            if (problem) {
                diagnostics.push({ severity: 'error', message: `&${h.ref.name} is read as ${place.fills.read}: ${problem} (${place.form})`, span: h.ref.span });
                ok = false;
                continue;
            }
            texts.push({ hole: h, text: numberText(place.whole || place.rounds ? Math.round(got.value) : got.value) });
        }
        if (!ok)
            continue;
        const again = filledLine(b, texts);
        if ('problem' in again) {
            diagnostics.push({ severity: 'error', message: again.problem, span: d.span });
            continue;
        }
        for (const l of b.lambdas)
            gone.add(l);
        made.set(d.name, [{ ...again.decl, valueReads: [...(again.decl.valueReads ?? []), ...b.holes.map((h) => h.ref.name)] }, ...again.lambdas]);
    }
    for (const d of parsed.cells) {
        if (gone.has(d.name))
            continue;
        const replaced = made.get(d.name);
        if (replaced)
            out.push(...replaced);
        else
            out.push(d);
    }
    return { ...parsed, cells: out, diagnostics };
}
export function unreadHoles(said, decls) {
    for (const d of decls.values())
        for (const h of d.built?.holes ?? [])
            if (!decls.has(h.ref.name))
                said.unknownCell(h.ref.name, h.ref.span);
}
