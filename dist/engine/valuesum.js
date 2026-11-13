import { VOICE_MAKERS } from "./attributes.js";
const chordOf = (d) => d && !d.gate && d.map?.kind !== 'sample' && d.map?.kind !== 'midi' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix'
    ? d.braid.tokens[0].atom.exprs
    : null;
function itemOf(e, sign) {
    if (e.k === 'num')
        return { constant: sign * e.value };
    if (e.k === 'ref')
        return e.ref.pick || e.level !== undefined ? null : { term: { cell: e.ref.name, weight: sign } };
    if (e.k === 'prod') {
        const refs = e.factors.filter((f) => f.k === 'ref');
        if (refs.length !== 1 || refs[0].k !== 'ref' || refs[0].ref.pick || !e.factors.every((f) => f.k === 'ref' || f.k === 'num'))
            return null;
        const weight = e.factors.reduce((w, f) => (f.k === 'num' ? w * f.value : w), sign);
        return { term: { cell: refs[0].ref.name, weight } };
    }
    return null;
}
const numeric = (atom) => atom.kind === 'note' || atom.kind === 'rest' || atom.kind === 'choice' || (atom.kind === 'seq' && atom.layers.every((l) => l.every((t) => numeric(t.atom))));
export function isValueLine(name, decls, seen = new Set()) {
    const d = decls.get(name);
    if (!d || d.gate || d.over || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)))
        return false;
    if (chordOf(d))
        return valueSumOf(name, decls, seen) !== null;
    if (d.map && d.map.kind !== 'lin' && d.map.kind !== 'amp' && d.map.kind !== 'db')
        return false;
    return d.braid.kind === 'list' && d.braid.tokens.length > 0 && d.braid.tokens.every((t) => numeric(t.atom));
}
export function valueSumOf(name, decls, seen = new Set()) {
    const exprs = chordOf(decls.get(name));
    if (!exprs || exprs.length !== 1 || seen.has(name))
        return null;
    const e = exprs[0];
    const items = e.k === 'sum' ? e.items : [{ e, sign: 1 }];
    const terms = [];
    let constant = 0;
    for (const it of items) {
        const x = itemOf(it.e, it.sign);
        if (!x)
            return null;
        if ('term' in x)
            terms.push(x.term);
        else
            constant += x.constant;
    }
    if (!terms.length || (terms.length === 1 && terms[0].weight === 1 && constant === 0))
        return null;
    const inner = new Set([...seen, name]);
    return terms.every((t) => isValueLine(t.cell, decls, inner)) ? { terms, constant } : null;
}
export function notesProductOf(name, decls, sounds, seen = new Set()) {
    const exprs = chordOf(decls.get(name));
    if (!exprs || exprs.length !== 1 || seen.has(name) || valueSumOf(name, decls) !== null)
        return null;
    const e = exprs[0];
    if (e.k !== 'prod')
        return null;
    const inner = new Set([...seen, name]);
    let pitch = false;
    for (const f of e.factors) {
        if (f.k === 'num')
            continue;
        if (f.k !== 'ref')
            return null;
        const d = decls.get(f.ref.name);
        if (!d)
            return null;
        if (chordOf(d)) {
            if (!notesProductOf(f.ref.name, decls, sounds, inner))
                return null;
            pitch = true;
        }
        else if (sounds(f.ref.name))
            return null;
        else if (!(d.map && (d.map.kind === 'amp' || d.map.kind === 'db' || d.map.kind === 'adsr' || d.map.kind === 'lin')))
            pitch = true;
    }
    return pitch ? e : null;
}
const bare = (e) => !e.ref.pick && !e.ref.slot && !e.ref.shift && !e.ref.degree && !e.ref.transpose && e.level === undefined;
export function inlineNotes(e, decls, sounds, found = { named: [], moved: [] }, seen = new Set()) {
    if (e.k === 'num')
        return e;
    if (e.k === 'sum')
        return { ...e, items: e.items.map((it) => ({ ...it, e: inlineNotes(it.e, decls, sounds, found, seen) })) };
    if (e.k === 'prod')
        return { ...e, factors: e.factors.map((f) => inlineNotes(f, decls, sounds, found, seen)) };
    const product = notesProductOf(e.ref.name, decls, sounds, seen);
    if (!product)
        return e;
    if (!bare(e)) {
        found.moved.push(e);
        return e;
    }
    found.named.push(e.ref.name);
    return inlineNotes(product, decls, sounds, found, new Set([...seen, e.ref.name]));
}
