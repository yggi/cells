import { leaves } from "../subseq.js";
import { ROOT } from "../program.js";
export function displayCells(given) {
    const cells = new Map(given);
    const ctx = new Map();
    for (const c of cells.values())
        if (c.root || c.over)
            ctx.set(c.name, c.root ? c.name : c.over);
    for (let changed = true, guard = 0; changed && guard < 64; guard++) {
        changed = false;
        for (const c of cells.values()) {
            const mine = ctx.get(c.name);
            if (!mine)
                continue;
            for (const child of c.children.keys()) {
                if (!ctx.has(child)) {
                    ctx.set(child, mine);
                    changed = true;
                }
            }
        }
    }
    for (const c of cells.values())
        cells.set(c.name, { ...c, context: ctx.get(c.name) ?? ROOT });
    for (const c of cells.values()) {
        if (typeof c.params.body !== 'string')
            continue;
        const exciters = [];
        for (const a of c.units.flatMap((u) => leaves(u.atom))) {
            if (a.kind === 'note')
                exciters.push({ shift: a.value + a.alter, params: {} });
            else if (a.kind === 'ref') {
                const r = cells.get(a.name);
                if (r)
                    for (const v of r.units)
                        if (v.atom.kind === 'note')
                            exciters.push({ shift: v.atom.value + v.atom.alter, params: r.params });
            }
            else if (a.kind === 'chord')
                for (const [j, v] of a.notes.entries())
                    exciters.push({ shift: v + a.alters[j], params: {} });
        }
        cells.set(c.name, { ...c, exciters: exciters.length ? exciters : Array.from({ length: 12 }, (_, i) => ({ shift: i, params: {} })) });
    }
    return cells;
}
