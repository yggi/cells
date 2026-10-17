import { ATTRIBUTES } from "../attributes.js";
import { IMPLICIT } from "./tables.js";
import { sortOfCells } from "./sorts.js";
const BUILTIN_CARD = 'card:builtin';
const BUILTIN_POSTGAIN = 0.8;
const exprRefs = (e) => (e.k === 'ref' ? [e.ref.name] : e.k === 'sum' ? e.items.flatMap((x) => exprRefs(x.e)) : e.k === 'prod' ? e.factors.flatMap(exprRefs) : []);
const atomRefs = (a) => a.kind === 'ref' ? [a.name] : a.kind === 'mix' ? a.exprs.flatMap(exprRefs) : a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => atomRefs(t.atom))) : [];
function readsOf(d) {
    const out = [];
    if (d.braid.kind === 'list')
        for (const t of d.braid.tokens)
            out.push(...atomRefs(t.atom));
    for (const r of [
        d.over,
        d.base,
        d.env,
        d.pitch,
        d.map?.kind === 'table' ? d.map.table : null,
        d.step?.kind === 'driven' ? d.step.driver : d.step?.kind === 'tap' ? d.step.meter : null,
    ])
        if (r)
            out.push(r.name);
    for (const pc of Object.values(d.paramCells ?? {}))
        out.push(...pc.factors.map((f) => f.name));
    for (const st of Object.values(d.paramClocks ?? {}))
        if (st.kind === 'driven')
            out.push(st.driver.name);
    for (const [k, v] of Object.entries(d.params))
        if (typeof v === 'string' && ATTRIBUTES[k]?.value === 'cell')
            out.push(v);
    if (d.gate)
        out.push(d.gate.notes, ...d.gate.levels.map((l) => l.name), ...d.gate.receivers);
    return out;
}
export function builtinCard(ctx, declared) {
    const { decls, implicit } = declared;
    const none = { ...declared, builtin: null };
    if ([...decls.values()].some((d) => d.map?.kind === 'sample' || d.map?.kind === 'midi'))
        return none;
    const read = new Set();
    for (const d of decls.values())
        for (const n of readsOf(d))
            if (n !== d.name)
                read.add(n);
    const sortOf = sortOfCells(ctx, decls);
    const sounds = [...decls.values()].filter((d) => !implicit.has(d.name) && !d.lambda && !read.has(d.name) && !ctx.broken.has(d.name) && (sortOf(d.name) === 'signal' || sortOf(d.name) === 'wave'));
    if (!sounds.length)
        return none;
    const span = IMPLICIT;
    const exprs = sounds.map((d) => ({ k: 'ref', ref: { name: d.name, pick: null, shift: 0, span: d.span } }));
    const card = {
        name: BUILTIN_CARD,
        span,
        over: null,
        shift: null,
        off: false,
        step: null,
        map: { kind: 'sample', span },
        stride: null,
        cycle: null,
        params: { postgain: BUILTIN_POSTGAIN },
        paramSpans: {},
        braid: { kind: 'list', tokens: [{ atom: { kind: 'mix', exprs }, repeat: 1, subdivide: 1, elongate: 1, span }] },
    };
    return {
        ...declared,
        decls: new Map([...decls, [BUILTIN_CARD, card]]),
        implicit: new Set([...implicit, BUILTIN_CARD]),
        overOk: new Map([...declared.overOk, [BUILTIN_CARD, true]]),
        builtin: BUILTIN_CARD,
    };
}
