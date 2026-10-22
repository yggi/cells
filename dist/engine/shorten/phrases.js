import { period } from "../helix.js";
import { declLine, freshName, setBraid } from "../edit.js";
import { sameNotes } from "../sameness.js";
import { saves } from "./harness.js";
const NOTE = /^(-?[0-9]+)((?:@[0-9]+)?)$/;
const MIN_PHRASE = 4;
const TOLL = 12;
const use = (name, ref) => `&${name}${ref}`;
const isDegree = (ref) => ref.startsWith('^') && !ref.startsWith('^$');
export function phrases(source, cells, result, options = {}) {
    const copied = new Set([...source.matchAll(/\bbase=&(\w+)/g)].map((m) => m[1]));
    cells = cells.filter((c) => !copied.has(c.name) && !new RegExp(`^&${c.name}\\b[^\\n]*\\bbase=&`, 'm').test(source));
    const found = [];
    const maxLen = 16;
    const where = new Map();
    for (const c of cells)
        for (let L = MIN_PHRASE; L <= Math.min(maxLen, c.tokens.length); L++)
            for (let i = 0; i + L <= c.tokens.length; i++) {
                const key = c.tokens.slice(i, i + L).join(' ');
                const list = where.get(key) ?? [];
                list.push({ cell: c.name, at: i });
                where.set(key, list);
            }
    const grid = new Map(cells.map((c) => [c.name, c.grid]));
    const laps = new Map(cells.map((c) => [c.name, period(result, c.name)]));
    const lapValues = [...new Set(laps.values())];
    const tokensOf = new Map(cells.map((c) => [c.name, c.tokens]));
    const shapeOf = (ts) => {
        const m = ts.map((t) => NOTE.exec(t));
        if (m.some((x) => !x))
            return null;
        const v0 = +m[0][1];
        return { key: m.map((x) => `${+x[1] - v0}${x[2]}`).join(' '), first: v0 };
    };
    const byShape = new Map();
    for (const c of cells) {
        for (let L = MIN_PHRASE; L <= Math.min(maxLen, c.tokens.length); L++)
            for (let i = 0; i + L <= c.tokens.length; i++) {
                const sh = shapeOf(c.tokens.slice(i, i + L));
                if (!sh)
                    continue;
                const list = byShape.get(sh.key) ?? [];
                list.push({ cell: c.name, at: i, first: sh.first });
                byShape.set(sh.key, list);
            }
    }
    for (const [key, list] of where) {
        const tokens = key.split(' ');
        const L = tokens.length;
        if (tokens.every((t) => t === tokens[0]))
            continue;
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
        for (const o of list)
            take(o.cell, o.at, '');
        const back = where.get([...tokens].reverse().join(' '));
        if (back && tokens.join(' ') !== [...tokens].reverse().join(' '))
            for (const o of back)
                take(o.cell, o.at, '[::-1]');
        if (L >= MIN_PHRASE && L <= 12)
            for (const lap of lapValues) {
                const climb = (t, by) => {
                    const m = NOTE.exec(t);
                    return m ? `${+m[1] + by}${m[2]}` : t.startsWith('~') ? t : null;
                };
                for (let k = 1; k < L; k++)
                    for (const dir of ['>>', '<<']) {
                        const turned = dir === '>>' ? [...tokens.slice(k), ...tokens.slice(0, k).map((t) => climb(t, lap))] : [...tokens.slice(L - k).map((t) => climb(t, -lap)), ...tokens.slice(0, L - k)];
                        if (turned.some((t) => t === null))
                            continue;
                        const tkey = turned.join(' ');
                        if (tkey === key)
                            continue;
                        for (const at of where.get(tkey) ?? [])
                            if (laps.get(at.cell) === lap)
                                take(at.cell, at.at, `[${dir}${k === 1 ? '' : k}]`);
                    }
            }
        const sh = shapeOf(tokens);
        if (sh && L >= MIN_PHRASE)
            for (const o of byShape.get(sh.key) ?? []) {
                const d = o.first - sh.first;
                if (d !== 0)
                    take(o.cell, o.at, grid.get(o.cell) ? `^$${d}` : `^${d}`);
            }
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
