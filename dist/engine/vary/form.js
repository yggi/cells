const SPLICE = /^(?:&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+|\[[^\]]*\])*|(?:inverse|degree)\(.+\))$/;
export const FORM_FIXED = [0, -1];
export function formsOf(own, words, played, voiced) {
    const read = [];
    for (const name of own) {
        if (played.has(name) || voiced(name))
            continue;
        const w = words(name);
        if (!w || w.braid.length < 2 || !w.braid.every((t) => SPLICE.test(t)))
            continue;
        read.push({ name: `&${name}`, head: w.head, attrs: w.attrs, slots: w.braid });
    }
    const out = [];
    const taken = new Set();
    for (const [i, f] of read.entries()) {
        if (taken.has(f.name))
            continue;
        const partner = read.slice(i + 1).find((g) => !taken.has(g.name) && paired(f.slots, g.slots));
        if (partner)
            taken.add(partner.name);
        out.push(partner ? { ...f, partner } : f);
    }
    return out;
}
function paired(a, b) {
    if (a.length !== b.length)
        return false;
    const ab = new Map();
    const ba = new Map();
    for (const [i, x] of a.entries()) {
        const y = b[i];
        if ((ab.get(x) ?? y) !== y || (ba.get(y) ?? x) !== x)
            return false;
        ab.set(x, y);
        ba.set(y, x);
    }
    return new Set(a).size > 1;
}
