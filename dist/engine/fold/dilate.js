import { isElement } from "./transpose.js";
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const dilate = (f) => {
    let made = 0;
    const lines = f.lines.map((line) => {
        if (line.toks.some((t) => !isElement(t.key)))
            return line;
        const k = line.toks.reduce((g, t) => gcd(g, Number(/^[rdn](\d+)/.exec(t.key)[1])), 0);
        if (k <= 1)
            return line;
        made++;
        const toks = line.toks.map((t) => ({ ...t, key: t.key.replace(/^([rdn])(\d+)/, (_, kind, d) => `${kind}${Number(d) / k}`) }));
        return { name: line.name, toks, scale: (line.scale ?? 1) * k };
    });
    return made ? { ...f, lines } : null;
};
