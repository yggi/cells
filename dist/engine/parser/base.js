import { innerSteps, mapLeaves } from "../subseq.js";
const INHERITED = ['over', 'shift', 'step', 'map', 'stride', 'cycle', 'env', 'pitch', 'show', 'chance', 'seed', 'size'];
const steps = (tokens) => tokens.flatMap((t) => (t.repeat > 1 ? Array.from({ length: t.repeat }, () => ({ ...t, repeat: 1 })) : [t]));
function moved(a, ref) {
    const grid = ref.transpose ?? 0;
    const degree = ref.degree ?? 0;
    if (!grid && !degree)
        return a;
    const by = grid + degree;
    switch (a.kind) {
        case 'seq':
            return mapLeaves(a, (l) => moved(l, ref));
        case 'note':
            return { ...a, value: a.value + by };
        case 'chord':
            return { ...a, notes: a.notes.map((n) => n + by) };
        case 'choice':
            return { ...a, values: a.values.map((n) => n + by) };
        case 'ref':
            return grid ? { ...a, transpose: (a.transpose ?? 0) + grid } : { ...a, values: { mul: a.values?.mul ?? 1, add: (a.values?.add ?? 0) + degree * (a.values?.mul ?? 1) } };
        default:
            return a;
    }
}
export function applyBases(p) {
    if (!p.cells.some((c) => c.base || keeps(c) || keepsInside(c)))
        return p;
    const byName = new Map(p.cells.map((c) => [c.name, c]));
    const diagnostics = [...p.diagnostics];
    const done = new Map();
    const resolving = new Set();
    const error = (c, message) => diagnostics.push({ severity: 'error', message, span: c.base?.span ?? c.span });
    const resolve = (c) => {
        const hit = done.get(c.name);
        if (hit)
            return hit;
        let out = c;
        if (c.base) {
            const base = byName.get(c.base.name);
            if (!base)
                out = c;
            else if (resolving.has(c.name))
                error(c, `base=&${c.base.name} comes round to &${c.name} itself`);
            else {
                resolving.add(c.name);
                out = overdub(c, resolve(base), c.base, (m) => error(c, m));
                resolving.delete(c.name);
            }
        }
        else if (keeps(c))
            diagnostics.push({ severity: 'error', message: `= keeps a step of the base: only in a cell with base= (&${c.name} base=&other = 4 =)`, span: c.span });
        if (keepsInside(c))
            diagnostics.push({
                severity: 'error',
                message: `= keeps a whole step of the base, not part of one: write it outside brackets (&${c.name} base=&other = [0 2])`,
                span: c.span,
            });
        done.set(c.name, out);
        return out;
    };
    return { ...p, cells: p.cells.map(resolve), diagnostics };
}
const keepsInside = (c) => c.braid.kind === 'list' && c.braid.tokens.some((t) => innerSteps(t.atom).some((x) => x.atom.kind === 'rest' && x.atom.keep));
const keeps = (c) => c.braid.kind === 'list' && c.braid.tokens.some((t) => t.atom.kind === 'rest' && t.atom.keep);
export function overdub(c, base, ref, fail) {
    const inherited = {};
    for (const k of INHERITED)
        if (c[k] == null && base[k] != null)
            inherited[k] = base[k];
    const params = { ...base.params, ...c.params };
    const paramSpans = { ...base.paramSpans, ...c.paramSpans };
    const paramCells = base.paramCells || c.paramCells ? { ...base.paramCells, ...c.paramCells } : undefined;
    const paramClocks = base.paramClocks || c.paramClocks ? { ...base.paramClocks, ...c.paramClocks } : undefined;
    if (ref.transpose && (c.over ?? base.over))
        fail(`base=&${ref.name}^$${ref.transpose}: a cell that reads a table moves by its degrees (^n), not yet by grid steps`);
    let braid = c.braid;
    if (base.braid.kind === 'list') {
        const under = steps(base.braid.tokens);
        const over = c.braid.kind === 'list' ? steps(c.braid.tokens) : [];
        const tokens = [];
        for (let i = 0; i < Math.max(under.length, over.length); i++) {
            const b = under[i];
            const o = over[i];
            const keep = !o || (o.atom.kind === 'rest' && o.atom.keep);
            if (!keep) {
                tokens.push(o);
                continue;
            }
            if (!b) {
                fail(`= past the end of &${base.name} (${under.length} steps): nothing to keep`);
                continue;
            }
            const atom = moved(b.atom, ref);
            tokens.push(o && o.elongate !== 1 ? { ...b, atom, elongate: o.elongate } : { ...b, atom });
        }
        braid = { kind: 'list', tokens };
    }
    else if (c.braid.kind === 'blank')
        braid = base.braid;
    else if (keeps(c))
        fail(`&${base.name} is a ${base.braid.kind}(…), not a braid: = keeps steps of a braid`);
    return {
        ...c,
        ...inherited,
        params,
        paramSpans,
        ...(paramCells ? { paramCells } : {}),
        ...(paramClocks ? { paramClocks } : {}),
        braid,
    };
}
