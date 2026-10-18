export function leaves(a) {
    return a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => leaves(t.atom))) : [a];
}
export function innerSteps(a) {
    return a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => [t, ...innerSteps(t.atom)])) : [];
}
export function mapLeaves(a, f) {
    return a.kind === 'seq' ? { ...a, layers: a.layers.map((l) => l.map((t) => ({ ...t, atom: mapLeaves(t.atom, f) }))) } : f(a);
}
export function countOf(u, each) {
    const a = u.atom;
    const one = a.kind === 'seq' ? a.layers.reduce((s, l) => s + l.reduce((x, t) => x + countOf(t, each), 0), 0) * (a.euclid?.k ?? 1) : each(a);
    return u.repeat * u.subdivide * one;
}
const EPS = 1e-9;
const floor = (x) => Math.floor(x + EPS);
const mod = (a, m) => ((a % m) + m) % m;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a / gcd(a, b)) * b;
function inverse(a, m) {
    let [r0, r1, t0, t1] = [mod(a, m), m, 1, 0];
    while (r1 !== 0) {
        const q = Math.floor(r0 / r1);
        [r0, r1, t0, t1] = [r1, r0 - q * r1, t1, t0 - q * t1];
    }
    return mod(t0, m);
}
const weight = (layer) => layer.reduce((x, t) => x + t.elongate * t.repeat, 0);
export function lapsOf(a) {
    if (a.kind !== 'seq')
        return 1;
    const layer = (l) => l.reduce((m, t) => lcm(m, lapsOf(t.atom)), 1) * (a.mode === 'alt' ? weight(l) : 1);
    return a.layers.reduce((m, l) => lcm(m, layer(l)), 1) * (a.slow ?? 1);
}
export const whole = (atom, at, dur) => [{ atom, at, dur, of: 1, is: 0, chances: [], picks: [] }];
function slowed(hs, n, from, dur) {
    return hs.map((h) => {
        const t = n * (h.is + (h.at - from) / dur);
        const lap = floor(t);
        const of = h.of * n;
        return {
            ...h,
            at: from + Math.max(0, t - lap) * dur,
            dur: h.dur * n,
            of,
            is: mod(lap, of),
            picks: h.picks.map((p) => {
                const f = n * (h.is + p.lap + (p.at - from) / dur) - lap;
                const k = floor(f);
                return { ...p, lap: k, at: from + Math.max(0, f - k) * dur };
            }),
        };
    });
}
function struck(hs, e, from, dur) {
    const out = [];
    for (const i of e.hits) {
        const p = i / e.n;
        for (const h of hs) {
            const o = (h.at - from) / dur;
            const d = h.dur / dur;
            for (let m = 0; m < o + d; m++)
                if (o <= m + p + EPS && m + p < o + d - EPS)
                    out.push({ ...h, at: from + p * dur, dur: dur / e.n, is: mod(h.is + m, h.of), picks: h.picks.map((q) => ({ ...q, lap: q.lap - m })) });
        }
    }
    return out;
}
function holds(a, from, dur, id, ctx, leaf) {
    if (a.kind !== 'seq')
        return leaf(a, from, dur).map((h) => ({ ...h, chances: [...ctx.chances, ...h.chances], ...lv(ctx.level, h.level) }));
    let hs = a.layers.flatMap((l, i) => {
        const all = weight(l);
        const seq = [];
        let b = 0;
        l.forEach((t, j) => {
            seq.push(...place(t, from + (b * dur) / all, (t.elongate * dur) / all, `${id}/${i}.${j}`, ctx, leaf));
            b += t.elongate * t.repeat;
        });
        if (a.mode === 'alt')
            return slowed(seq, all, from, dur);
        if (a.mode === 'choose')
            return seq.map((h) => ({ ...h, picks: [...h.picks, { id, of: a.layers.length, is: i, lap: 0, at: from }] }));
        return seq;
    });
    if (a.euclid)
        hs = struck(hs, a.euclid, from, dur);
    if (a.slow && a.slow > 1)
        hs = slowed(hs, a.slow, from, dur);
    return hs;
}
const lv = (outer, own) => {
    const l = own === undefined ? outer : outer === undefined ? own : own * outer;
    return l === undefined ? {} : { level: l };
};
function place(u, at, foot, id, outer, leaf) {
    const ctx = {
        chances: u.chance === undefined ? outer.chances : [...outer.chances, u.chance],
        level: u.level === undefined ? outer.level : u.level * (outer.level ?? 1),
    };
    const n = u.subdivide;
    const dur = foot / n;
    const out = [];
    for (let r = 0; r < u.repeat; r++)
        for (let j = 0; j < n; j++) {
            const from = at + r * foot + j * dur;
            for (const h of holds(u.atom, from, dur, id, ctx, leaf)) {
                if (n === 1 || (h.of === 1 && !h.picks.length)) {
                    out.push(h);
                    continue;
                }
                const g = gcd(n, h.of);
                if (mod(h.is - j, g) !== 0)
                    continue;
                const of = h.of / g;
                const is = of === 1 ? 0 : mod(((h.is - j) / g) * inverse(n / g, of), of);
                out.push({
                    ...h,
                    of,
                    is,
                    picks: h.picks.map((p) => {
                        const m = j + p.lap;
                        return { ...p, lap: Math.floor(m / n), at: p.at + (mod(m, n) - j) * dur };
                    }),
                });
            }
        }
    return out;
}
export function footOf(a, unit) {
    if (a.kind !== 'seq')
        return unit(a);
    if (!a.bare)
        return 1;
    const t = a.layers[0][0];
    return footOf(t.atom, unit) * t.elongate;
}
export function placed(units, unit, leaf, id = '') {
    const out = [];
    let base = 0;
    units.forEach((u, top) => {
        const foot = footOf(u.atom, unit) * u.elongate;
        for (const h of place(u, base, foot, `${id}${top}`, { chances: [], level: undefined }, leaf))
            out.push({
                atom: h.atom,
                at: h.at,
                dur: h.dur,
                chances: h.chances,
                top,
                ...(h.level === undefined ? {} : { level: h.level }),
                ...(h.of > 1 ? { laps: { of: h.of, is: h.is } } : {}),
                ...(h.picks.length ? { chosen: h.picks } : {}),
            });
        base += foot * u.repeat;
    });
    return out;
}
export const slots = (units, unit) => placed(units, unit, whole);
