import { compileSource } from "../compile.js";
import { ROOT, codeShifts } from "../program.js";
import { eventsBetween, plan } from "../realize.js";
import { declWords, spansLines } from "../edit.js";
import { flatten } from "../flatten.js";
export function candidates(source) {
    const r = compileSource(source);
    const readAsTable = new Set([...r.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
    const out = [];
    for (const c of r.cells.values()) {
        if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.kit || c.note || c.map)
            continue;
        if (readAsTable.has(c.name) || spansLines(source, c.name))
            continue;
        const w = declWords(source, c.name);
        if (!w || w.braid.length < 2 || w.braid.some((t) => t.startsWith('[') && t.includes('&')))
            continue;
        const over = c.over ? r.cells.get(c.over) : null;
        if (over?.implicit && over.kit)
            continue;
        out.push({ name: c.name, tokens: w.braid, grid: readsGrid(r, c.name) });
    }
    return { result: r, cells: out };
}
export const size = (source) => source.replace(/[ \t]+/g, ' ').length;
export const measured = (source, s) => {
    try {
        const next = s.apply(source);
        const saving = size(source) - size(next);
        return saving > 0 && next !== source ? { ...s, saving } : null;
    }
    catch {
        return null;
    }
};
export function sameNotes(a, b, names) {
    try {
        const ra = compileSource(a);
        const rb = compileSource(b);
        if (!rb.ok)
            return false;
        const notes = (r, n) => flatten(r, n, codeShifts(r))
            .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
            .join(' ');
        return names.every((n) => notes(ra, n) === notes(rb, n));
    }
    catch {
        return false;
    }
}
function readsGrid(r, name, path = []) {
    const c = r.cells.get(name);
    if (!c || path.includes(name))
        return false;
    if (c.over)
        return !!r.cells.get(c.over)?.root;
    const users = [...r.cells.values()].filter((u) => u.units.some((x) => x.atom.kind === 'ref' && x.atom.name === name));
    return users.length === 0 ? !!r.cells.get(ROOT)?.root : users.every((u) => readsGrid(r, u.name, [...path, name]));
}
export const SAMENESS_SECONDS = 60;
export function samePiece(a, b, until = SAMENESS_SECONDS) {
    try {
        const play = (src) => {
            const r = compileSource(src);
            if (!r.ok)
                return null;
            return eventsBetween(plan(r, codeShifts(r)), 0, until)
                .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`)
                .sort()
                .join('\n');
        };
        const x = play(a);
        return x !== null && x === play(b);
    }
    catch {
        return false;
    }
}
