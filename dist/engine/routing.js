import { leaves } from "./subseq.js";
import { isMidiCard, ROOT } from "./program.js";
import { tableChain } from "./helix.js";
import { cellId, clockTapId, edgeId, isJunction, stepEdgeId } from "./ids.js";
import { chainMuted, outputPlays } from "./realize.js";
import { flows } from "./flows.js";
const keeps = (result, name) => result.tapes.some((t) => t.name === name) || typeof result.cells.get(name)?.params.body === 'string';
const sourceOf = (result, o) => {
    const read = o.mods.find((m) => m.picks)?.cell ?? o.cell;
    return o.kit && result.cells.get(read)?.over === o.voice ? read : o.voice;
};
const playable = (c) => c.units.some((u) => leaves(u.atom).some((a) => a.kind === 'note' || a.kind === 'chord' || a.kind === 'choice'));
export class RouteAcc {
    result;
    muted;
    nodes = new Set();
    edges = new Set();
    constructor(result, muted) {
        this.result = result;
        this.muted = muted;
    }
    off(name) {
        return this.muted.has(cellId(name));
    }
    node(name) {
        if (!this.off(name))
            this.nodes.add(cellId(name));
    }
    edge(from, to, id = edgeId(cellId(from), cellId(to))) {
        if (this.off(from) || this.off(to) || !this.result.cells.has(from) || !this.result.cells.has(to))
            return;
        this.nodes.add(cellId(from)).add(cellId(to));
        this.edges.add(id);
    }
    tables(table, from) {
        const chain = tableChain(this.result, table);
        if (from && this.result.cells.get(from)?.over === table && !this.off(table))
            this.edge(from, table);
        chain.forEach((t, i) => {
            this.node(t);
            const next = chain[i + 1];
            if (next && this.result.cells.get(t)?.over === next)
                this.edge(t, next);
            if (this.result.cells.get(t)?.step)
                this.clock(t);
        });
    }
    clocked = new Set();
    clock(name) {
        if (this.clocked.has(name))
            return;
        this.clocked.add(name);
        let at = name;
        for (let g = 0; at && g < 64; g++) {
            const st = this.result.cells.get(at)?.step ?? null;
            if (!st || this.off(st.driver))
                break;
            const table = this.result.sections?.get(at);
            if (table && !this.off(table)) {
                this.edge(table, at);
                this.edge(table, st.driver, stepEdgeId(cellId(table), cellId(st.driver)));
            }
            else if (!table)
                this.edge(at, st.driver, stepEdgeId(cellId(at), cellId(st.driver)));
            at = st.driver;
        }
        const own = this.result.cells.get(name)?.clock;
        const clock = own ? (this.result.clocks.get(own)?.cell ?? own) : null;
        if (clock && !this.off(clock))
            this.tables(clock);
        this.timed(name);
    }
    timed(name) {
        for (const [key, k] of Object.entries(this.result.cells.get(name)?.paramClocks ?? {}))
            if (!this.off(k.driver)) {
                this.edge(name, k.driver, clockTapId(cellId(name), cellId(k.driver), key));
                this.clock(k.driver);
            }
    }
    braid(name, ctx, from = null, seen = new Set()) {
        const cell = this.result.cells.get(name);
        if (!cell || this.off(name))
            return false;
        const table = cell.root ? name : (cell.over ?? ctx);
        const lender = cell.root ? null : cell.over ? name : from;
        const key = `${name}|${table}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        let plays = false;
        if (playable(cell)) {
            if (chainMuted(this.result, table, this.muted))
                return false;
            this.tables(table, lender ?? undefined);
            plays = true;
        }
        this.node(name);
        for (const child of cell.children.keys()) {
            if (this.off(child))
                continue;
            this.edge(name, child);
            if (this.braid(child, table, lender, seen))
                plays = true;
        }
        return plays;
    }
    stream(name) {
        const c = this.result.cells.get(name);
        if (!c || this.off(name))
            return;
        this.braid(name, c.over ?? c.context);
        this.clock(name);
    }
    voice(name, seen = new Set()) {
        const v = this.result.cells.get(name);
        if (!v || seen.has(name) || this.off(name))
            return;
        seen.add(name);
        this.node(name);
        for (const own of [v.env, v.pitch])
            if (own && !this.off(own))
                this.stream(own);
        if (v.map?.kind === 'table' && !this.off(v.map.table)) {
            this.edge(v.map.table, name, clockTapId(cellId(v.map.table), cellId(name), 'map'));
            this.stream(v.map.table);
        }
        this.timed(name);
        for (const pc of Object.values(v.paramCells ?? {}))
            for (const f of pc.factors)
                if (!this.off(f)) {
                    this.edge(f, name);
                    this.stream(f);
                }
        const fm = v.params.fm;
        if (typeof fm === 'string' && this.result.cells.has(fm) && !this.off(fm)) {
            this.edge(fm, name);
            this.stream(fm);
            this.voice(fm, seen);
        }
    }
}
function soundOf(acc, o) {
    const on = new Set([sourceOf(acc.result, o), ...o.through, ...o.via, ...o.select.flatMap((x) => [x.cell, acc.result.cells.get(x.cell).over, x.part])]);
    const from = flows(acc.result).from;
    for (const n of on) {
        acc.node(n);
        for (const f of from.get(n) ?? [])
            if (on.has(f.to))
                acc.edge(f.from, f.to, f.id);
    }
}
function notesOf(acc, o, how) {
    if (o.drone) {
        for (const m of [...o.mods, ...o.levels])
            if (!acc.off(m.cell)) {
                acc.edge(m.cell, o.voice);
                acc.stream(m.cell);
            }
        if (o.envelopeCell)
            acc.edge(o.envelopeCell, o.voice);
        acc.voice(o.voice);
        return;
    }
    how.braid(acc, o);
    acc.clock(o.cell);
    if (o.tape) {
        acc.edge(o.cell, o.tape.tape);
        acc.edge(o.tape.tape, o.tape.head);
        acc.edge(o.tape.head, o.voice);
        acc.clock(o.tape.tape);
        acc.timed(o.tape.head);
    }
    else
        acc.edge(o.cell, o.voice);
    for (const m of [...o.mods, ...o.levels])
        if (!acc.off(m.cell)) {
            acc.edge(m.cell, o.voice);
            acc.stream(m.cell);
        }
    if (o.envelopeCell)
        acc.edge(o.envelopeCell, o.voice);
    if (o.kit)
        for (const k of how.members(o))
            if (!acc.off(k)) {
                acc.edge(o.voice, k);
                acc.voice(k);
            }
    acc.voice(o.voice);
    for (const x of o.select)
        acc.stream(x.cell);
}
function route(result, muted, outs, how, keeping) {
    const acc = new RouteAcc(result, muted);
    const flowsFrom = flows(result).from;
    for (const o of outs)
        soundOf(acc, o);
    const queue = [];
    for (const c of result.cells.values())
        if (keeps(result, c.name) && !acc.off(c.name) && (keeping(c.name) || acc.nodes.has(cellId(c.name))))
            queue.push(c.name);
    for (const n of [...acc.nodes])
        for (const f of flowsFrom.get(n.slice('cell:'.length)) ?? [])
            if (keeps(result, f.to) && !acc.off(f.to)) {
                acc.edge(f.from, f.to, f.id);
                queue.push(f.to);
            }
    for (const done = new Set(); queue.length;) {
        const n = queue.pop();
        if (done.has(n))
            continue;
        done.add(n);
        for (const f of flowsFrom.get(n) ?? [])
            if (!acc.off(f.to)) {
                acc.edge(f.from, f.to, f.id);
                queue.push(f.to);
            }
    }
    const heard = new Set();
    for (const c of result.cells.values())
        if ((c.sink || isMidiCard(c)) && acc.nodes.has(cellId(c.name)))
            heard.add(c.name);
    for (let grew = true; grew;) {
        grew = false;
        for (const [from, fs] of flowsFrom)
            if (!heard.has(from) && acc.nodes.has(cellId(from)) && fs.some((f) => heard.has(f.to) && acc.edges.has(f.id))) {
                heard.add(from);
                grew = true;
            }
    }
    const sound = new RouteAcc(result, muted);
    for (const n of heard)
        sound.node(n);
    for (const [from, fs] of flowsFrom)
        for (const f of fs)
            if (heard.has(from) && heard.has(f.to) && acc.edges.has(f.id))
                sound.edges.add(f.id);
    for (const o of outs)
        if (heard.has(sourceOf(result, o)))
            notesOf(sound, o, how);
    for (const n of heard)
        if (keeps(result, n))
            sound.clock(n);
    for (const n of heard)
        sound.timed(n);
    for (const c of result.cells.values())
        if (typeof c.params.scope === 'string' && !sound.off(c.name))
            for (const k of c.children.keys())
                if (sound.nodes.has(cellId(k)))
                    sound.edge(c.name, k);
    return sound;
}
function plays(result, muted, o) {
    return !!o.drone || new RouteAcc(result, muted).braid(o.cell, ROOT);
}
const routingCache = new WeakMap();
export function routing(result, muted) {
    const key = [...muted].sort().join(' ');
    let byMuted = routingCache.get(result);
    if (!byMuted)
        routingCache.set(result, (byMuted = new Map()));
    const hit = byMuted.get(key);
    if (hit)
        return hit;
    const outs = result.outputs.filter((o) => outputPlays(result, o, muted) && plays(result, muted, o));
    const all = {
        braid: (acc, o) => void acc.braid(o.cell, ROOT),
        members: (o) => [...(result.cells.get(o.voice)?.children.keys() ?? [])],
    };
    const r = route(result, muted, outs, all, (n) => typeof result.cells.get(n)?.params.body === 'string');
    byMuted.set(key, r);
    return r;
}
export function liveRouting(result, muted, outs, how) {
    const all = routing(result, muted);
    const r = route(result, muted, outs, how, (n) => all.nodes.has(cellId(n)));
    return { nodes: new Set([...r.nodes].filter((n) => all.nodes.has(n))), edges: new Set([...r.edges].filter((e) => all.edges.has(e))) };
}
const drawnCache = new WeakMap();
export function drawn(model, r) {
    let byModel = drawnCache.get(r);
    if (!byModel)
        drawnCache.set(r, (byModel = new WeakMap()));
    let hit = byModel.get(model);
    if (!hit) {
        const shown = new Set(model.edges.map((e) => e.id));
        const edges = new Set();
        for (const id of r.edges) {
            const to = model.alias.has(id) ? model.alias.get(id) : id;
            if (to && shown.has(to))
                edges.add(to);
        }
        let nodes = r.nodes;
        for (const e of model.edges)
            if (e.routes?.every((any) => any.some((id) => r.edges.has(id)))) {
                edges.add(e.id);
                for (const end of [e.source, e.target])
                    if (isJunction(end) && !nodes.has(end)) {
                        if (nodes === r.nodes)
                            nodes = new Set(r.nodes);
                        nodes.add(end);
                    }
            }
        byModel.set(model, (hit = { nodes, edges }));
    }
    return hit;
}
export function nodeStateOf(id, muted, routed, live) {
    if (muted.has(id))
        return 'off';
    if (!live)
        return 'on';
    if (!routed.nodes.has(id))
        return 'unrouted';
    return live.nodes.has(id) ? 'live' : 'idle';
}
export function edgeStateOf(e, muted, routed, live) {
    if (muted.has(e.source) || muted.has(e.target))
        return 'off';
    if (!live)
        return 'on';
    if (!routed.edges.has(e.id))
        return 'unrouted';
    return live.edges.has(e.id) ? 'live' : 'idle';
}
