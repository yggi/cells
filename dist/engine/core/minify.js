import { parse } from "../parser/index.js";
import { INTERFACE_NAMES } from "../program.js";
import { GM_KIT } from "../midi.js";
import { splitComment } from "../edit.js";
const ownNames = (text) => {
    const keep = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));
    return [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !keep.has(n) && !n.startsWith('λ'));
};
const short = (i) => `${String.fromCharCode(97 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
const DRUMS = new Set(GM_KIT.flatMap((d) => [d.name, ...d.aliases]));
export function meaningfulNames(text) {
    const lines = new Map(parse(text).cells.map((d) => [d.name, text.split('\n')[d.span.line - 1] ?? '']));
    const keep = new Set([...lines.keys()].filter((n) => DRUMS.has(n.replace(/\d+$/, '').toLowerCase())));
    const draws = new Set([...lines].filter(([, l]) => /\?|\[[^\]]*\||\b(?:chance|seed)=/.test(splitComment(l)[0])).map(([n]) => n));
    for (let grew = true; grew;) {
        grew = false;
        for (const [n, l] of lines)
            if (!draws.has(n) && !/\*/.test(splitComment(l)[0]) && [...splitComment(l)[0].matchAll(/&([A-Za-z_]\w*)/g)].some((m) => draws.has(m[1]) && m[1] !== n)) {
                draws.add(n);
                grew = true;
            }
    }
    return new Set([...keep, ...draws]);
}
export function minify(text) {
    const kept = meaningfulNames(text);
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
