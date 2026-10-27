export const noSound = (name) => `&${name} is a role: it names the gates that play it, and is no sound to mix, send or play (name its gates here)`;
export function performersOf(ctx, decls, implicit) {
    const { error } = ctx;
    const roleOf = new Map();
    for (const d of decls.values()) {
        if (d.map?.kind !== 'role')
            continue;
        const tokens = d.braid.kind === 'list' ? d.braid.tokens : [];
        if (tokens.length === 0)
            error(`&${d.name} is a role: name the gates that play it (&${d.name} map=role &player)`, d.span);
        for (const t of tokens) {
            const a = t.atom;
            if (a.kind !== 'ref') {
                error(`a role's entries are the gates that play it, as written (&${d.name} map=role &player &player2)`, t.span);
                continue;
            }
            const g = decls.get(a.name);
            if (!g)
                continue;
            if (!g.gate || a.pick || a.shift || a.transpose !== undefined || a.values || t.repeat !== 1 || t.elongate !== 1 || t.subdivide !== 1) {
                error(`&${a.name}: a role's entries are gates, as written (&player play=&part &voice), and &${a.name} is not one`, t.span);
                continue;
            }
            const was = roleOf.get(a.name);
            if (was === undefined)
                roleOf.set(a.name, d.name);
            else if (was !== d.name)
                error(`&${a.name} plays two roles, &${was} and &${d.name}: a gate plays one`, t.span);
        }
    }
    return [...decls.values()].flatMap((d) => {
        if (!d.gate || implicit.has(d.name))
            return [];
        const role = roleOf.get(d.name);
        return [{ name: d.name, ...(role !== undefined ? { role } : {}), part: d.gate.notes, ...(d.gate.move ? { move: d.gate.move } : {}), voices: d.gate.receivers }];
    });
}
export const isPerformer = (decls, name) => {
    const d = decls.get(name);
    return !!d && (!!d.gate || d.map?.kind === 'role');
};
export function bandsOf(ctx, decls) {
    const bands = new Map();
    const read = new Set([...decls.values()].flatMap((d) => (d.over ? [d.over.name] : [])));
    for (const name of read) {
        const t = decls.get(name);
        if (!t || t.map || t.braid.kind !== 'list' || !t.braid.tokens.length)
            continue;
        const tokens = t.braid.tokens;
        const plain = (x) => x.atom.kind === 'ref' && !x.atom.pick && !x.atom.shift && x.atom.transpose === undefined && !x.atom.values && x.repeat === 1 && x.subdivide === 1 && x.elongate === 1;
        if (!tokens.every((x) => plain(x) && x.atom.kind === 'ref' && isPerformer(decls, x.atom.name)))
            continue;
        const entries = tokens.map((x) => (x.atom.kind === 'ref' ? x.atom.name : ''));
        if (t.step)
            ctx.warn(`&${name} is a band, a table of performers: it needs no step=, the selector reading it steps (their parts keep their time)`, t.step.span);
        const seen = new Map();
        for (const [i, e] of entries.entries()) {
            const r = decls.get(e);
            const gates = r.gate ? [e] : r.braid.kind === 'list' ? r.braid.tokens.flatMap((x) => (x.atom.kind === 'ref' && decls.get(x.atom.name)?.gate ? [x.atom.name] : [])) : [];
            for (const g of new Set(gates)) {
                const was = seen.get(g);
                if (was !== undefined && was !== e)
                    ctx.error(`&${g} is in &${name} twice, as &${was} and as &${e}: a performer is one entry of a band`, tokens[i].span);
                else
                    seen.set(g, e);
            }
        }
        bands.set(name, entries);
    }
    return bands;
}
export function banded(outputs, cells, bands) {
    if (!bands.size)
        return [...outputs];
    const selectors = (table) => [...cells.values()].filter((c) => c.over === table && c.clock).map((c) => c.name);
    return outputs.map((o) => {
        const gate = [...o.through, ...o.via].find((n) => cells.get(n)?.gate);
        if (!gate)
            return o;
        const select = [];
        const via = [];
        for (const [table, entries] of bands) {
            const entry = entries.findIndex((e) => e === gate || (cells.get(e)?.map?.kind === 'role' && cells.get(e).units.some((u) => u.atom.kind === 'ref' && u.atom.name === gate)));
            if (entry < 0)
                continue;
            for (const cell of selectors(table))
                select.push({ cell, entry, part: entries[entry], performer: true });
            via.push(...selectors(table), table, entries[entry]);
        }
        return select.length ? { ...o, via: [...new Set([...o.via, ...via])], select: [...o.select, ...select] } : o;
    });
}
export function checkBands(ctx, decls, cells, bands) {
    for (const [table, entries] of bands)
        for (const c of cells.values()) {
            if (c.over !== table || !c.clock)
                continue;
            const policy = (e) => cells.get(e)?.params.restart ?? c.params.restart;
            const moved = entries.find((e) => policy(e) === 'restart' || policy(e) === 'resume');
            const bars = c.step?.tap === '1m' && c.step.chain.every((x) => (x.op === '÷' && Number.isInteger(x.n)) || x.n === 1);
            if (moved && !bars)
                ctx.warn(`&${c.name} switches &${moved} with restart=${policy(moved)} off the bar: its part starts where the switch falls, not on a bar line, so its notes move in the bar. Switch on whole bars (step=1m), or let it run on (restart=free, a performer's default)`, decls.get(c.name).span);
        }
}
