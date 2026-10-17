import { elementText, isElement, scaled } from "./transpose.js";
const SHORTEST = 12;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const durOf = (t) => Number(/^[rdn](\d+)/.exec(t.key)[1]);
export const stretch = (f, see) => {
    const rules = new Map(f.rules);
    const cells = new Map();
    let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
    let made = 0;
    const lines = f.lines.map((line) => {
        if (line.toks.every((t) => isElement(t.key)) && line.toks.reduce((g, t) => gcd(g, durOf(t)), 0) >= 2)
            return line;
        const out = [];
        const toks = line.toks;
        for (let i = 0; i < toks.length;) {
            let g = 0;
            let j = i;
            while (j < toks.length && isElement(toks[j].key) && gcd(g, durOf(toks[j])) >= 2)
                g = gcd(g, durOf(toks[j++]));
            const run = toks.slice(i, j);
            if (run.length < SHORTEST || !run.some((t) => t.base !== null)) {
                out.push(toks[i]);
                i++;
                continue;
            }
            const base = run.find((t) => t.base !== null).base;
            const kids = run.map((t) => ({ key: scaled(t.key, 1 / g), off: t.base === null ? null : t.base - base }));
            const id = kids.map((k) => `${k.key}/${k.off}`).join(' ');
            const writtenOut = run.reduce((n, t) => n + elementText(t.key, t.base).length + 1, 0);
            const body = kids.reduce((n, k) => n + elementText(k.key, k.off).length + 1, 0);
            const known = cells.get(id);
            if (!known && writtenOut - (5 + 2 + 4) - (5 + body) <= 0) {
                out.push(toks[i]);
                i++;
                continue;
            }
            let key = known;
            if (!key) {
                key = `s${next++}`;
                const rule = { key, kids };
                rules.set(key, rule);
                cells.set(id, key);
            }
            out.push({ key, base, stretch: g });
            made++;
            i = j;
        }
        return { ...line, toks: out };
    });
    if (!made)
        return null;
    const now = { ...f, lines, rules };
    see?.(() => now);
    return now;
};
