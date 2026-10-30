import { period } from "../helix.js";
import { declLine, freshName, setBraid } from "../edit.js";
import { sameNotes } from "../sameness.js";
import { writtenHints } from "../fold/hints.js";
import { saves } from "./harness.js";
const NOTE = /^(-?[0-9]+)((?:@[0-9]+)?)$/;
const MIN_PHRASE = 4;
const MAX_PHRASE = 16;
const TOLL = 12;
const use = (name, ref) => `&${name}${ref}`;
const MAX_TURN = 12;
function turnsOf(tokens, lap) {
    const L = tokens.length;
    if (L > MAX_TURN)
        return [];
    const climb = (t, by) => {
        const m = NOTE.exec(t);
        return m ? `${+m[1] + by}${m[2]}` : t.startsWith('~') ? t : null;
    };
    const key = tokens.join(' ');
    const out = [];
    for (let k = 1; k < L; k++)
        for (const dir of ['>>', '<<']) {
            const turned = dir === '>>' ? [...tokens.slice(k), ...tokens.slice(0, k).map((t) => climb(t, lap))] : [...tokens.slice(L - k).map((t) => climb(t, -lap)), ...tokens.slice(0, L - k)];
            if (turned.some((t) => t === null) || turned.join(' ') === key)
                continue;
            out.push({ key: turned.join(' '), ref: `[${dir}${k === 1 ? '' : k}]` });
        }
    return out;
}
const isDegree = (ref) => ref.startsWith('^') && !ref.startsWith('^$');
export function phrases(source, cells, result, options = {}) {
    const copied = new Set([...source.matchAll(/\bbase=&(\w+)/g)].map((m) => m[1]));
    cells = cells.filter((c) => !copied.has(c.name) && !new RegExp(`^&${c.name}\\b[^\\n]*\\bbase=&`, 'm').test(source));
    const found = [];
    const grid = new Map(cells.map((c) => [c.name, c.grid]));
    const laps = new Map(cells.map((c) => [c.name, period(result, c.name)]));
    const lapValues = [...new Set(laps.values())];
    const tokensOf = new Map(cells.map((c) => [c.name, c.tokens]));
    const windows = new Map();
    for (const h of writtenHints(cells)) {
        const first = h.spans[0];
        const whole = tokensOf.get(first.line).slice(first.from, first.to);
        for (let L = MIN_PHRASE; L <= Math.min(MAX_PHRASE, whole.length); L++)
            for (let k = 0; k + L <= whole.length; k++) {
                const tokens = whole.slice(k, k + L);
                if (tokens.every((t) => t === tokens[0]))
                    continue;
                const moves = tokens.every((t) => NOTE.test(t) || /^~(@\d+)?$/.test(t));
                const anchors = h.spans.flatMap((sp, i) => {
                    const t = h.transforms[i];
                    return t.kind === 'reversed' || (t.kind === 'transposed' && !moves) ? [] : [{ cell: sp.line, at: sp.from + k, by: t.kind === 'same' ? 0 : t.by }];
                });
                for (const a of anchors) {
                    const text = tokensOf.get(a.cell).slice(a.at, a.at + L);
                    const key = text.join(' ');
                    const w = windows.get(key) ?? { tokens: text, places: [] };
                    h.spans.forEach((sp, i) => {
                        const t = h.transforms[i];
                        const by = (t.kind === 'same' ? 0 : t.by) - a.by;
                        if (t.kind === 'reversed') {
                            if (by === 0)
                                w.places.push({ cell: sp.line, at: sp.to - k - L, ref: '[::-1]' });
                        }
                        else if (by === 0)
                            w.places.push({ cell: sp.line, at: sp.from + k, ref: '' });
                        else if (moves)
                            w.places.push({ cell: sp.line, at: sp.from + k, ref: grid.get(sp.line) ? `^$${by}` : `^${by}` });
                    });
                    windows.set(key, w);
                }
            }
    }
    const at = new Map();
    for (const c of cells)
        for (let L = MIN_PHRASE; L <= Math.min(MAX_TURN, c.tokens.length); L++)
            for (let i = 0; i + L <= c.tokens.length; i++) {
                const key = c.tokens.slice(i, i + L).join(' ');
                at.set(key, [...(at.get(key) ?? []), { cell: c.name, at: i, ref: '' }]);
            }
    for (const c of cells)
        for (let L = MIN_PHRASE; L <= Math.min(MAX_TURN, c.tokens.length); L++)
            for (let i = 0; i + L <= c.tokens.length; i++) {
                const tokens = c.tokens.slice(i, i + L);
                const key = tokens.join(' ');
                if (windows.has(key) || tokens.every((t) => t === tokens[0]))
                    continue;
                const lap = laps.get(c.name);
                if (turnsOf(tokens, lap).some((t) => (at.get(t.key) ?? []).some((o) => laps.get(o.cell) === lap)))
                    windows.set(key, { tokens, places: [{ cell: c.name, at: i, ref: '' }] });
            }
    for (const [key, { tokens, places }] of windows) {
        const L = tokens.length;
        const taken = new Map();
        const occs = [];
        const take = (cell, at, ref) => {
            const used = taken.get(cell) ?? new Set();
            for (let j = at; j < at + L; j++)
                if (used.has(j))
                    return;
            for (let j = at; j < at + L; j++)
                used.add(j);
            taken.set(cell, used);
            occs.push({ cell, at, ref });
        };
        for (const o of [...places].sort((a, b) => +(a.ref !== '') - +(b.ref !== '') || a.cell.localeCompare(b.cell) || a.at - b.at))
            take(o.cell, o.at, o.ref);
        for (const lap of lapValues)
            for (const turn of turnsOf(tokens, lap))
                for (const o of at.get(turn.key) ?? [])
                    if (laps.get(o.cell) === lap)
                        take(o.cell, o.at, turn.ref);
        if (occs.length < 2)
            continue;
        const saving = occs.reduce((a, o) => a + key.length - use('m1', o.ref).length, 0) - (key.length + 6);
        if (saving > 4)
            found.push({ key, tokens, occs, saving });
    }
    found.sort((a, b) => b.saving - a.saving || b.tokens.length - a.tokens.length);
    const kept = [];
    const covered = new Set();
    for (const f of found) {
        const steps = f.occs.flatMap((o) => Array.from({ length: f.tokens.length }, (_, j) => `${o.cell}:${o.at + j}`));
        if (steps.filter((x) => covered.has(x)).length > steps.length / 2)
            continue;
        for (const x of steps)
            covered.add(x);
        kept.push(f);
        if (kept.length >= 8)
            break;
    }
    const out = [];
    for (const f of kept) {
        const apply = (src) => {
            const name = freshName(src, 'm');
            const first = Math.min(...f.occs.map((o) => declLine(src, o.cell)));
            const lines = src.split('\n');
            lines.splice(first, 0, `&${name} ${f.key}`);
            let next = lines.join('\n');
            for (const cell of new Set(f.occs.map((o) => o.cell))) {
                const ts = [...tokensOf.get(cell)];
                for (const o of f.occs.filter((x) => x.cell === cell).sort((a, b) => b.at - a.at))
                    ts.splice(o.at, f.tokens.length, use(name, o.ref));
                next = setBraid(next, cell, ts);
            }
            return next;
        };
        const ways = [
            ...new Set(f.occs.map((o) => o.ref === ''
                ? 'as written'
                : o.ref === '[::-1]'
                    ? 'backwards'
                    : o.ref.startsWith('^$')
                        ? `transposed ${o.ref}`
                        : isDegree(o.ref)
                            ? `${o.ref.slice(1)} degrees`
                            : `turned ${o.ref}`)),
        ];
        const turnedAny = f.occs.some((o) => o.ref.startsWith('[>>') || o.ref.startsWith('[<<') || isDegree(o.ref));
        const s = {
            id: `phrase:${f.key}`,
            tool: 'shorten',
            rule: 'phrase',
            title: `A phrase written ${f.occs.length} times (${ways.join(', ')}) in ${[...new Set(f.occs.map((o) => `&${o.cell}`))].join(', ')}: one cell, used where it was`,
            before: f.key.length > 48 ? f.key.slice(0, 47) + '…' : f.key,
            after: f.occs.map((o) => use('m', o.ref)).join(' … '),
            apply,
        };
        const saving = saves(source, s) ?? 0;
        if (saving >= TOLL && (!turnedAny || sameNotes(source, s.apply(source), [...new Set(f.occs.map((o) => o.cell))], options)))
            out.push(s);
    }
    return out;
}
