import { setFree } from "./edit.js";
export const freeList = (r) => [...r.cells.values()].flatMap((c) => c.frees).sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
export const freeIndex = (r, spec) => freeList(r).findIndex((f) => f.span.line === spec.span.line && f.span.col === spec.span.col);
export function withHeld(src, r, held) {
    const fs = freeList(r);
    let out = src;
    for (let i = fs.length - 1; i >= 0; i--)
        if (held.has(i))
            out = setFree(out, fs[i], held.get(i));
    return out;
}
