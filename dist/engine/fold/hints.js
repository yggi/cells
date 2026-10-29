import { pairs } from "./pairs.js";
import { isElement, tokensOf } from "./transpose.js";
export const MIN_NOTES = 3;
function notesOf(f, key, memo) {
    if (isElement(key))
        return 1;
    const known = memo.get(key);
    if (known !== undefined)
        return known;
    const n = f.rules.get(key)?.kids.reduce((m, k) => m + notesOf(f, k.key, memo), 0) ?? 1;
    memo.set(key, n);
    return n;
}
const within = (inner, outer) => outer.length > inner.length &&
    outer.spans.length === inner.spans.length &&
    inner.spans.every((s) => outer.spans.some((o) => o.line === s.line && o.from <= s.from && s.to <= o.to));
function lengthOf(f, t, memo) {
    if (isElement(t.key))
        return Number(/^[rdn](\d+)/.exec(t.key)[1]);
    const look = f.looks?.get(t.key);
    if (look)
        return look.chords.length * look.dur;
    const known = memo.get(t.key);
    const one = known ?? f.rules.get(t.key)?.kids.reduce((n, k) => n + lengthOf(f, { key: k.key, base: null, ...(k.stretch ? { stretch: k.stretch } : {}) }, memo), 0) ?? 0;
    if (known === undefined)
        memo.set(t.key, one);
    return one * (t.stretch ?? 1);
}
function places(f) {
    const out = new Map();
    const memo = new Map();
    const walk = (line, t, from, base, scale) => {
        const length = lengthOf(f, t, memo) * scale;
        const rule = f.rules.get(t.key);
        if (!rule)
            return length;
        const spans = out.get(t.key) ?? [];
        spans.push({ line, from, to: from + length, base });
        out.set(t.key, spans);
        let at = from;
        const inner = scale * (t.stretch ?? 1);
        for (const k of rule.kids)
            at += walk(line, { key: k.key, base: null, ...(k.stretch ? { stretch: k.stretch } : {}) }, at, base === null || k.off === null ? null : base + k.off, inner);
        return length;
    };
    for (const line of f.lines) {
        let at = 0;
        for (const t of line.toks)
            at += walk(line.name, t, at, t.base, line.scale ?? 1);
    }
    return out;
}
export function hints(lines) {
    const start = { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() };
    const f = pairs(start) ?? start;
    const out = [];
    const memo = new Map();
    for (const [symbol, found] of places(f)) {
        if (found.length < 2 || notesOf(f, symbol, memo) < MIN_NOTES)
            continue;
        const spans = [...found].sort((a, b) => a.line.localeCompare(b.line) || a.from - b.from);
        const first = spans[0];
        const transforms = spans.map((s) => s.base === null || first.base === null || s.base === first.base ? { kind: 'same' } : { kind: 'transposed', by: s.base - first.base });
        out.push({ kind: 'repeat', symbol, spans, transforms, confidence: 1, length: first.to - first.from });
    }
    return out.filter((h) => !out.some((g) => within(h, g))).sort((a, b) => b.length * b.spans.length - a.length * a.spans.length || a.symbol.localeCompare(b.symbol));
}
