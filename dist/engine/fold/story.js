import { inline } from "./beta.js";
import { kidsOf, useOrder } from "./print.js";
import { isElement, isLook, tokensOf } from "./transpose.js";
function heights(f) {
    const h = new Map();
    const of = (key) => {
        if (isElement(key) || isLook(key))
            return 0;
        const known = h.get(key);
        if (known !== undefined)
            return known;
        h.set(key, 0);
        const r = f.rules.get(key);
        const below = [...r.kids.map((k) => k.key), ...(r.of ? [r.of] : [])];
        const v = 1 + Math.max(0, ...below.map(of));
        h.set(key, v);
        return v;
    };
    for (const k of f.rules.keys())
        of(k);
    return h;
}
function usesOf(f, key) {
    const count = (toks) => toks.filter((t, i) => t.key === key && !(i > 0 && toks[i - 1].key === key && toks[i - 1].base === t.base)).length;
    return f.lines.reduce((n, l) => n + count(l.toks), 0) + [...f.rules.values()].reduce((n, r) => n + count(r.of === key ? [{ key, base: null }] : kidsOf(r)), 0);
}
export function storyOf(lines, f) {
    const h = heights(f);
    const order = useOrder(f);
    const first = new Map(order.map((k, i) => [k, i]));
    const coming = [...order].sort((a, b) => h.get(a) - h.get(b) || first.get(a) - first.get(b));
    const back = [f];
    for (const key of [...coming].reverse())
        back.push(inline(back[back.length - 1], key));
    const bare = back[back.length - 1];
    const frames = [{ folded: { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() }, came: null, uses: 0 }];
    if (bare.looks?.size || bare.lines.some((l) => (l.scale ?? 1) !== 1))
        frames.push({ folded: bare, came: null, uses: 0 });
    coming.forEach((key, i) => {
        const folded = back[back.length - 2 - i];
        frames.push({ folded, came: key, uses: usesOf(folded, key) });
    });
    return frames;
}
