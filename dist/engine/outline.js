import { writtenGraph } from "./graph.js";
const PORT_RANK = { over: 0, braid: 1, voice: 2, is: 2, mix: 3, midi: 3, play: 3 };
const rankOf = (port) => PORT_RANK[port] ?? (port === 'step' ? 6 : 4);
function cellOf(node) {
    if (node.startsWith('cell:'))
        return node.slice(5);
    const junction = /^junction:(.+):\d+$/.exec(node);
    return junction ? junction[1] : null;
}
function headsOf(take) {
    if (take.names)
        return take.names.map((n) => n.replace(/^&/, ''));
    const gave = take.gave.map((n) => n.replace(/^&/, ''));
    return gave.filter((n) => !gave.some((other) => other !== n && n.startsWith(`${other}_`)));
}
export function outlineOf(result, { facetsOf = () => [] } = {}) {
    const takes = new Map((result.takes ?? []).map((t) => [t.span.line, t]));
    const unitOf = new Map();
    const made = new Map();
    const make = (key, line, id, within) => {
        if (!made.has(key))
            made.set(key, { line, id, within, cells: [] });
        return key;
    };
    for (const take of result.takes ?? [])
        make(String(take.span.line), take.span.line, take.id, null);
    const place = (cell, chain) => {
        const line = chain[0].line;
        const take = takes.get(line);
        const outer = make(String(line), line, take?.id ?? chain[1]?.id ?? null, null);
        const key = chain.length >= 3 ? make(`${line}/${chain[1].line}`, line, chain[2].id, outer) : outer;
        unitOf.set(cell, key);
    };
    const loose = [];
    for (const cell of result.cells.values()) {
        const chain = result.origins?.get(cell.name);
        if (chain?.length)
            place(cell.name, chain);
        else if (cell.lambda !== null || cell.implicit)
            loose.push(cell.name);
        else
            unitOf.set(cell.name, make(String(cell.span.line), cell.span.line, null, null));
    }
    const graph = writtenGraph(result);
    const wires = graph.edges.flatMap((e) => {
        if (e.port === 'about')
            return [];
        const from = cellOf(e.from);
        const to = cellOf(e.to);
        if (!from || !to)
            return [];
        return [e.port === 'is' ? { read: to, reader: from, port: e.port } : { read: from, reader: to, port: e.port }];
    });
    const voices = new Set(graph.nodes.flatMap((n) => (n.kind === 'voice' ? [n.cell.name] : [])));
    const playsOn = (w) => w.port === 'braid' && voices.has(w.read);
    for (let settled = true; loose.length && settled;) {
        settled = false;
        for (let i = loose.length - 1; i >= 0; i--) {
            const name = loose[i];
            const read = new Set(wires.flatMap((w) => (w.reader === name && unitOf.has(w.read) ? [unitOf.get(w.read)] : [])));
            const readers = wires.filter((w) => w.read === name).map((w) => w.reader);
            const by = new Set(readers.flatMap((r) => (unitOf.has(r) ? [unitOf.get(r)] : [])));
            const one = read.size === 1 ? [...read][0] : read.size === 0 && by.size === 1 && readers.every((r) => unitOf.has(r)) ? [...by][0] : undefined;
            if (one === undefined)
                continue;
            unitOf.set(name, one);
            loose.splice(i, 1);
            settled = true;
        }
    }
    for (const [cell, key] of unitOf)
        made.get(key).cells.push(cell);
    const order = [...made.keys()].sort((a, b) => {
        const [la, ia = 0] = a.split('/').map(Number);
        const [lb, ib = 0] = b.split('/').map(Number);
        return la - lb || ia - ib;
    });
    const rankBy = new Map(order.map((k, i) => [k, i]));
    const reads = new Map(order.map((k) => [k, new Map()]));
    const on = new Map(order.map((k) => [k, new Set()]));
    for (const w of wires) {
        const reader = unitOf.get(w.reader);
        const read = unitOf.get(w.read);
        if (!reader || !read || reader === read)
            continue;
        if (playsOn(w)) {
            on.get(reader).add(read);
            continue;
        }
        const ports = reads.get(reader);
        ports.set(read, Math.min(ports.get(read) ?? Infinity, rankOf(w.port)));
    }
    const parts = order.map((key) => {
        const { line, id, within, cells } = made.get(key);
        const take = within === null ? takes.get(line) : undefined;
        const outer = within === null ? undefined : takes.get(line);
        const heads = take?.names ? headsOf(take) : take || outer ? headsOf((take ?? outer)).filter((h) => cells.includes(h)) : cells.filter((c) => !result.cells.get(c)?.lambda);
        return {
            key,
            line,
            id,
            within,
            heads: heads.map((h) => `&${h}`),
            cells,
            facets: id === null ? [] : facetsOf(id),
            args: take?.args ?? null,
            overrode: take?.overrode ?? [],
            reads: [...reads.get(key).keys()].sort((a, b) => rankBy.get(a) - rankBy.get(b)),
            on: [...on.get(key)].filter((k) => !reads.get(key).has(k)).sort((a, b) => rankBy.get(a) - rankBy.get(b)),
        };
    });
    const byKey = new Map(parts.map((p) => [p.key, p]));
    const acyclic = new Map(parts.map((p) => [p.key, p.reads.filter((r) => r !== p.within)]));
    const state = new Map();
    const walk = (k) => {
        state.set(k, 'open');
        acyclic.set(k, acyclic.get(k).filter((r) => {
            if (state.get(r) === 'open')
                return false;
            if (!state.has(r))
                walk(r);
            return true;
        }));
        state.set(k, 'done');
    };
    for (const k of order)
        if (!state.has(k))
            walk(k);
    const readers = new Map(order.map((k) => [k, []]));
    for (const k of order)
        for (const r of acyclic.get(k))
            readers.get(r).push(k);
    const depthBy = (next) => {
        const depth = new Map();
        const of = (k) => {
            if (!depth.has(k))
                depth.set(k, Math.max(0, ...next(k).map((n) => of(n) + 1)));
            return depth.get(k);
        };
        for (const k of order)
            of(k);
        return depth;
    };
    const tree = (next, prefer) => {
        const depth = depthBy(next);
        const parent = new Map();
        for (const k of order) {
            const candidates = next(k).filter((n) => depth.get(n) === depth.get(k) - 1);
            candidates.sort((a, b) => prefer(k, a) - prefer(k, b) || rankBy.get(a) - rankBy.get(b));
            if (candidates[0] !== undefined)
                parent.set(k, candidates[0]);
        }
        const nodeOf = (k) => ({
            part: byKey.get(k),
            children: order.filter((c) => parent.get(c) === k).map(nodeOf),
        });
        return order.filter((k) => !parent.has(k)).map(nodeOf);
    };
    const named = (k, candidate) => {
        const args = Object.values(byKey.get(k).args ?? {});
        return args.some((a) => byKey.get(candidate).heads.includes(a.trim())) ? -1 : reads.get(k).get(candidate);
    };
    const ground = tree((k) => acyclic.get(k), named);
    const outputs = tree((k) => readers.get(k), (k, candidate) => reads.get(candidate).get(k));
    return { parts, ground, outputs };
}
