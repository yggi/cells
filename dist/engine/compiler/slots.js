import { SLOTS } from "../style.js";
export function readSlots(parsed) {
    const maps = new Map(parsed.cells.map((c) => [c.name, c.map?.kind ?? (c.style ? 'style' : null)]));
    const diagnostics = [];
    const read = (o, cell) => {
        const { slot, ...rest } = o;
        const name = rest.name;
        const span = rest.span ?? cell.span;
        if (!maps.has(name))
            return { ...rest, pick: null };
        const kind = maps.get(name);
        const slots = kind ? SLOTS[kind] : undefined;
        const at = slots?.indexOf(slot) ?? -1;
        if (at >= 0)
            return { ...rest, pick: { kind: 'at', i: at, abs: true } };
        diagnostics.push({
            severity: 'error',
            message: slots
                ? `&${name}[${slot}]: &${name} (map=${kind}) has no slot ${slot}; its slots are ${slots.join(', ')}`
                : `&${name}[${slot}]: &${name}'s map names no slots (${kind ? `map=${kind}` : 'it has no map='}); pick by position (&${name}[$0]), name the slots with map=${Object.keys(SLOTS).join(' or map=')}, or give it a style= (its axes)`,
            span,
        });
        return { ...rest, pick: null };
    };
    const visit = (x, cell) => {
        if (Array.isArray(x)) {
            let changed = false;
            const out = x.map((v) => {
                const w = visit(v, cell);
                if (w !== v)
                    changed = true;
                return w;
            });
            return changed ? out : x;
        }
        if (x === null || typeof x !== 'object')
            return x;
        const o = x;
        let out = null;
        for (const [k, v] of Object.entries(o)) {
            const w = visit(v, cell);
            if (w !== v)
                (out ??= { ...o })[k] = w;
        }
        const r = out ?? o;
        return typeof r.slot === 'string' && typeof r.name === 'string' ? read(r, cell) : r;
    };
    let changed = false;
    const cells = parsed.cells.map((c) => {
        const v = visit(c, c);
        if (v !== c)
            changed = true;
        return v;
    });
    return changed ? { ...parsed, cells, diagnostics: [...parsed.diagnostics, ...diagnostics] } : parsed;
}
