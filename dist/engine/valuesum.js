import { VOICE_PARAMS } from "./attributes.js";
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
    return terms.some((t) => isSound(t.cell, decls, inner)) ? null : { terms, constant };
}
export function isSound(name, decls, seen = new Set()) {
    const d = decls.get(name);
    if (!d)
        return false;
    if (d.gate || Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)))
        return true;
    return chordOf(d) !== null && valueSumOf(name, decls, seen) === null;
}
