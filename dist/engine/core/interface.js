import { declLine } from "../edit.js";
export function keepsInterface(before, after, keep) {
    const readers = (t, n) => {
        const ref = new RegExp(`&${n}(?![A-Za-z0-9_])`);
        const own = declLine(t, n);
        return t.split('\n').filter((l, i) => i !== own && ref.test(l)).length;
    };
    return [...keep].every((n) => declLine(after, n) >= 0 && (readers(before, n) === 0 || readers(after, n) > 0));
}
