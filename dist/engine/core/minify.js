import { parse } from "../parser/index.js";
import { GM_KIT } from "../midi.js";
const ownNames = (text) => [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !n.startsWith('λ'));
const short = (i) => `${String.fromCharCode(97 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
const DRUMS = new Set(GM_KIT.flatMap((d) => [d.name, ...d.aliases]));
export function meaningfulNames(text) {
    return new Set(parse(text)
        .cells.map((d) => d.name)
        .filter((n) => DRUMS.has(n.replace(/\d+$/, '').toLowerCase())));
}
export function minify(text, keep = new Set()) {
    const kept = new Set([...meaningfulNames(text), ...keep]);
    const own = ownNames(text).filter((n) => !kept.has(n));
    const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
    const to = new Map();
    let i = 0;
    for (const name of own) {
        let n = short(i++);
        while (taken.has(n) && !own.includes(n))
            n = short(i++);
        to.set(name, n);
    }
    const via = text.replace(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])/g, (w, n) => (to.has(n) ? `&§${to.get(n)}` : w));
    return via.replace(/&§/g, '&');
}
