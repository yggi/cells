import { compileSource } from "../compile.js";
import { ROOT } from "../program.js";
import { declWords, spansLines } from "../edit.js";
export { samePiece, sameNotes, SAMENESS_SECONDS } from "../sameness.js";
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
export const saves = (source, r) => {
    try {
        const next = r.apply(source);
        return next === source ? null : size(source) - size(next);
    }
    catch {
        return null;
    }
};
export const suggestion = (source, r) => ({
    id: r.id,
    kind: r.rule,
    title: r.title,
    before: r.before,
    after: r.after,
    saving: saves(source, r) ?? 0,
    apply: r.apply,
});
export const measured = (source, s) => {
    const saving = saves(source, s);
    return saving !== null && saving > 0 ? { ...s, saving } : null;
};
function readsGrid(r, name, path = []) {
    const c = r.cells.get(name);
    if (!c || path.includes(name))
        return false;
    if (c.over)
        return !!r.cells.get(c.over)?.root;
    const users = [...r.cells.values()].filter((u) => u.units.some((x) => x.atom.kind === 'ref' && x.atom.name === name));
    return users.length === 0 ? !!r.cells.get(ROOT)?.root : users.every((u) => readsGrid(r, u.name, [...path, name]));
}
