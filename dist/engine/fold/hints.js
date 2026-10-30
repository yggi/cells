import { pairs } from "./pairs.js";
import { isElement, tokensOf } from "./transpose.js";
const BACK = '\u0000back';
const backwards = (l) => ({ name: l.name + BACK, length: l.length, chords: l.chords.map((c) => ({ ...c, at: l.length - c.at - c.dur })) });
export const MIN_NOTES = 3;
function shapeOf(f, key, memo) {
    if (isElement(key))
        return [{ key, off: 0 }];
    const known = memo.get(key);
    if (known)
        return known;
    const shape = (f.rules.get(key)?.kids ?? []).flatMap((k) => shapeOf(f, k.key, memo).map((e) => ({ key: e.key, off: k.off === null || e.off === null ? null : k.off + e.off })));
    memo.set(key, shape);
    return shape;
}
const stepsOf = (key) => Number(/^[rdn](\d+)/.exec(key)[1]);
function scan(shape, line) {
    const out = [];
    for (let i = 0; i + shape.length <= line.toks.length; i++) {
        if (out.length && out[out.length - 1].i + shape.length > i)
            continue;
        let base;
        const fits = shape.every((e, j) => {
            const t = line.toks[i + j];
            if (t.key !== e.key)
                return false;
            if (e.off === null || t.base === null)
                return e.off === null && t.base === null;
            base ??= t.base - e.off;
            return base === t.base - e.off;
        });
        if (fits)
            out.push({ line, i, n: shape.length, base: base ?? null });
    }
    return out;
}
function alike(ps, j) {
    const ts = ps.map((p) => p.line.toks[j(p)]);
    if (ts.some((t) => !t || t.key !== ts[0].key))
        return false;
    const offs = ts.map((t, k) => (t.base === null ? null : ps[k].base === null ? NaN : t.base - ps[k].base));
    return offs.every((o) => (o === null ? offs[0] === null : !Number.isNaN(o) && o === offs[0]));
}
function written({ line, i, n, base }) {
    const from = line.at[i];
    const to = line.at[i + n];
    if (!line.name.endsWith(BACK))
        return { line: line.name, from, to, base };
    const end = line.at[line.at.length - 1];
    return { line: line.name.slice(0, -BACK.length), from: end - to, to: end - from, base };
}
const apart = (ps) => {
    const ss = ps.map(written);
    return ss.every((p, k) => ss.every((q, m) => m <= k || p.line !== q.line || p.to <= q.from || q.to <= p.from));
};
function grown(places) {
    let ps = [...places];
    const step = (next) => (apart(next) ? ((ps = next), true) : false);
    while (alike(ps, (p) => p.i + p.n) && step(ps.map((p) => ({ ...p, n: p.n + 1 }))))
        ;
    while (ps.every((p) => p.i > 0) && alike(ps, (p) => p.i - 1) && step(ps.map((p) => ({ ...p, i: p.i - 1, n: p.n + 1 }))))
        ;
    return ps;
}
const within = (inner, outer) => outer.length > inner.length &&
    outer.spans.length === inner.spans.length &&
    inner.spans.every((s) => outer.spans.some((o) => o.line === s.line && o.from <= s.from && s.to <= o.to));
export function hints(lines, { retrograde = false } = {}) {
    const read = (retrograde ? [...lines, ...lines.map(backwards)] : lines).map((l) => {
        const toks = tokensOf(l);
        const at = [0];
        for (const t of toks)
            at.push(at[at.length - 1] + stepsOf(t.key));
        return { name: l.name, toks, at };
    });
    const f = pairs({ lines: read.map((l) => ({ name: l.name, toks: l.toks })), rules: new Map() });
    const out = [];
    const memo = new Map();
    const seen = new Set();
    for (const symbol of f?.rules.keys() ?? []) {
        const shape = shapeOf(f, symbol, memo);
        if (shape.length < MIN_NOTES)
            continue;
        const found = read.flatMap((l) => scan(shape, l));
        if (found.length < 2)
            continue;
        const all = grown(found).map((p) => ({ s: written(p), back: p.line.name.endsWith(BACK) }));
        const at = (x) => `${x.line}:${x.from}:${x.to}`;
        const forward = all.filter((x) => !x.back).map((x) => x.s);
        const overlaps = (x) => forward.some((y) => y.line === x.line && y.from < x.to && x.from < y.to);
        const kept = [];
        for (const x of all.filter((y) => !y.back || !overlaps(y.s)).sort((a, b) => +a.back - +b.back || a.s.line.localeCompare(b.s.line) || a.s.from - b.s.from))
            if (!kept.some((k) => k.s.line === x.s.line && k.s.from < x.s.to && x.s.from < k.s.to))
                kept.push(x);
        if (kept.length < 2 || kept[0].back)
            continue;
        const key = kept
            .map((x) => at(x.s))
            .sort()
            .join(' ');
        if (seen.has(key))
            continue;
        seen.add(key);
        const first = kept[0].s;
        const by = (s) => (s.base === null || first.base === null ? 0 : s.base - first.base);
        const transforms = kept.map(({ s, back }) => (back ? { kind: 'reversed', by: by(s) } : by(s) === 0 ? { kind: 'same' } : { kind: 'transposed', by: by(s) }));
        out.push({ kind: 'repeat', symbol, spans: kept.map((x) => x.s), transforms, confidence: 1, length: first.to - first.from });
    }
    return out
        .filter((h) => !out.some((g) => within(h, g)))
        .sort((a, b) => b.length * b.spans.length - a.length * a.spans.length || b.spans.length - a.spans.length || a.symbol.localeCompare(b.symbol));
}
const NOTE = /^(-?\d+)(?:@(\d+))?$/;
export function writtenHints(braids) {
    const starts = new Map();
    const ends = new Map();
    const lines = braids.map(({ name, tokens }) => {
        let at = 0;
        const from = new Map();
        const to = new Map();
        const chords = tokens.map((t, i) => {
            const m = NOTE.exec(t);
            const dur = m?.[2] ? Number(m[2]) : 1;
            from.set(at, i);
            const chord = { at, dur, values: [m ? m[1] : `=${t}`] };
            at += dur;
            to.set(at, i + 1);
            return chord;
        });
        starts.set(name, from);
        ends.set(name, to);
        return { name, chords, length: at };
    });
    return hints(lines, { retrograde: true }).flatMap((h) => {
        const spans = [];
        for (const s of h.spans) {
            const from = starts.get(s.line).get(s.from);
            const to = ends.get(s.line).get(s.to);
            if (from === undefined || to === undefined)
                return [];
            spans.push({ ...s, from, to });
        }
        return [{ ...h, spans, length: spans[0].to - spans[0].from }];
    });
}
