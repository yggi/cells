import { elementText, isElement } from "./transpose.js";
const SHORTEST = 12;
const CHANGES = (n) => Math.max(2, Math.floor(n / 4));
const SAID = 2;
const SEED = 5;
const COMMON = 48;
const LONGEST = 64;
export const variants = (f, see) => {
    const lines = f.lines.map((l) => [...l.toks]);
    const used = lines.map((t) => t.map(() => false));
    const rules = new Map(f.rules);
    let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
    let made = 0;
    const text = (t) => elementText(t.key, t.base).length + 1;
    const compare = (p, q, n) => {
        const a = lines[p.line];
        const b = lines[q.line];
        const ua = used[p.line];
        const ub = used[q.line];
        if (p.i + n > a.length || q.i + n > b.length)
            return null;
        const most = CHANGES(n);
        let shapes = 0;
        for (let j = 0; j < n; j++) {
            const x = a[p.i + j];
            const y = b[q.i + j];
            if (!isElement(x.key) || !isElement(y.key) || ua[p.i + j] || ub[q.i + j])
                return null;
            if (x.key !== y.key && ++shapes > most)
                return null;
        }
        const votes = new Map();
        for (let j = 0; j < n; j++) {
            const x = a[p.i + j];
            const y = b[q.i + j];
            if (x.key === y.key && x.base !== null && y.base !== null)
                votes.set(y.base - x.base, (votes.get(y.base - x.base) ?? 0) + 1);
        }
        let by = 0;
        let top = -1;
        for (const [d, c] of votes)
            if (c > top)
                [by, top] = [d, c];
        let changed = 0;
        const diff = new Array(n);
        for (let j = 0; j < n; j++) {
            const x = a[p.i + j];
            const y = b[q.i + j];
            diff[j] = x.key !== y.key || (x.base === null) !== (y.base === null) || (x.base !== null && y.base - x.base !== by);
            if (diff[j] && ++changed > most)
                return null;
        }
        return { diff, by };
    };
    for (let round = 0; round < 32; round++) {
        const seeds = new Map();
        lines.forEach((toks, line) => {
            for (let i = 0; i + SEED <= toks.length; i++) {
                const w = toks.slice(i, i + SEED);
                if (w.some((t, j) => !isElement(t.key) || used[line][i + j]))
                    continue;
                const b0 = w.find((t) => t.base !== null)?.base ?? 0;
                const key = w.map((t) => `${t.key}/${t.base === null ? '' : t.base - b0}`).join(' ');
                seeds.set(key, [...(seeds.get(key) ?? []), { line, i }]);
            }
        });
        const found = new Map();
        for (const places of seeds.values()) {
            if (places.length < 2 || places.length > COMMON)
                continue;
            const proto = places[0];
            const a = lines[proto.line];
            for (const q of places.slice(1)) {
                if (q.line === proto.line && q.i < proto.i + SEED)
                    continue;
                const b = lines[q.line];
                const pitched = a.slice(proto.i, proto.i + SEED).findIndex((t) => t.base !== null);
                const by = pitched < 0 ? 0 : b[q.i + pitched].base - a[proto.i + pitched].base;
                let n = SEED;
                let changed = 0;
                for (;;) {
                    const [x, y] = [a[proto.i + n], b[q.i + n]];
                    if (!x || !y || !isElement(x.key) || !isElement(y.key) || used[proto.line][proto.i + n] || used[q.line][q.i + n])
                        break;
                    if (q.line === proto.line && proto.i + n + 1 > q.i)
                        break;
                    const differs = x.key !== y.key || (x.base === null) !== (y.base === null) || (x.base !== null && y.base - x.base !== by);
                    if (differs && changed + 1 > CHANGES(n + 1))
                        break;
                    changed += +differs;
                    n++;
                }
                while (n > SEED && compare(proto, q, n)?.diff[n - 1])
                    n--;
                if (n < SHORTEST)
                    continue;
                const key = `${proto.line}:${proto.i}:${n}`;
                const hit = found.get(key);
                found.set(key, { proto, n, score: (hit?.score ?? n) + n });
            }
        }
        let best = null;
        const returnsOf = (proto, n) => {
            const out = [];
            lines.forEach((toks, line) => {
                for (let i = 0; i + n <= toks.length; i++) {
                    if (line === proto.line && i < proto.i + n && i + n > proto.i)
                        continue;
                    const c = compare(proto, { line, i }, n);
                    if (!c)
                        continue;
                    out.push({ at: { line, i }, ...c });
                    i += n - 1;
                }
            });
            return out;
        };
        const gainOf = (proto, n, returns) => {
            const written = lines[proto.line].slice(proto.i, proto.i + n).reduce((m, t) => m + text(t), 0);
            const cost = returns.reduce((m, r) => {
                const changed = r.diff.filter(Boolean).length;
                return m + (changed ? 22 + 6 * changed + lines[r.at.line].slice(r.at.i, r.at.i + n).reduce((k, t, j) => k + (r.diff[j] ? text(t) : 0), 0) : 9);
            }, 9 + written + 6);
            return (returns.length + 1) * written - cost + SAID * n * returns.length;
        };
        for (const first of [...found.values()].sort((x, y) => y.score - x.score).slice(0, 4)) {
            let { proto, n } = first;
            let returns = returnsOf(proto, n);
            const bestAt = (n, shift) => {
                let pick = null;
                for (const o of [proto, ...returns.map((r) => r.at)]) {
                    const p = { line: o.line, i: o.i + shift };
                    if (p.i < 0 || p.i + n > lines[p.line].length)
                        continue;
                    const rs = returnsOf(p, n);
                    const apart = rs.reduce((m, r) => m + r.diff.filter(Boolean).length, 0);
                    if (!pick || rs.length > pick.returns.length || (rs.length === pick.returns.length && apart < pick.apart))
                        pick = { proto: p, returns: rs, apart };
                }
                return pick;
            };
            const start = bestAt(n, 0);
            if (start)
                [proto, returns] = [start.proto, start.returns];
            const worth = (rs, g) => (rs.some((r) => r.diff.some(Boolean)) ? g : -Infinity);
            let top = { proto, n, returns, gain: worth(returns, gainOf(proto, n, returns)) };
            const family = returns.length;
            while (n < LONGEST) {
                let step = null;
                for (const shift of [0, -1]) {
                    const next = bestAt(n + 1, shift);
                    if (next && next.returns.length && (!step || next.returns.length > step.returns.length))
                        step = next;
                }
                if (!step || 2 * step.returns.length < family)
                    break;
                [proto, returns] = [step.proto, step.returns];
                n++;
                const gain = worth(returns, gainOf(proto, n, returns));
                if (gain > top.gain)
                    top = { proto, n, returns, gain };
            }
            if (top.gain > 0 && (!best || top.gain > best.gain))
                best = top;
        }
        if (!best)
            break;
        const { proto, n } = best;
        const steps = lines[proto.line].slice(proto.i, proto.i + n);
        const base = steps.find((t) => t.base !== null)?.base ?? null;
        const kidsOf = (toks, b) => toks.map((t) => ({ key: t.key, off: t.base === null ? null : t.base - (b ?? 0) }));
        const phrase = { key: `s${next++}`, kids: kidsOf(steps, base) };
        rules.set(phrase.key, phrase);
        const replace = [{ at: proto, tok: { key: phrase.key, base } }];
        for (const r of best.returns) {
            const toks = lines[r.at.line].slice(r.at.i, r.at.i + n);
            if (!r.diff.some(Boolean)) {
                replace.push({ at: r.at, tok: { key: phrase.key, base: base === null ? null : base + r.by } });
                continue;
            }
            const b = toks.find((t) => t.base !== null)?.base ?? null;
            const v = { key: `s${next++}`, kids: kidsOf(toks, b), of: phrase.key, patched: r.diff };
            rules.set(v.key, v);
            replace.push({ at: r.at, tok: { key: v.key, base: b } });
        }
        for (const { at, tok } of replace.sort((x, y) => y.at.line - x.at.line || y.at.i - x.at.i)) {
            lines[at.line].splice(at.i, n, tok);
            used[at.line].splice(at.i, n, true);
        }
        made++;
        see?.(now);
    }
    return made ? now() : null;
    function now() {
        return { ...f, lines: f.lines.map((l, i) => ({ ...l, toks: [...lines[i]] })), rules: new Map(rules) };
    }
};
