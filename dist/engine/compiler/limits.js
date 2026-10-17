import { countOf } from "../subseq.js";
import { MAX_EVENTS, MAX_NOTES_PER_SECOND, pickIndices } from "../program.js";
const many = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en') : 'unboundedly many');
const named = (c) => (c.lambda ? 'An unnamed cell &( … )' : `&${c.name}`);
export function checkLimits(ctx, decls, cells, clocks, outputs) {
    const { error, warn } = ctx;
    const unitCounts = new Map();
    const visiting = new Set();
    const countsOf = (name) => {
        const known = unitCounts.get(name);
        if (known)
            return known;
        if (visiting.has(name))
            return [];
        visiting.add(name);
        const out = (cells.get(name)?.units ?? []).map((u) => countOf(u, (a) => (a.kind === 'note' || a.kind === 'choice' ? 1 : a.kind === 'chord' ? a.notes.length : a.kind === 'ref' ? expansion(a.name, a.pick) : 0)));
        visiting.delete(name);
        unitCounts.set(name, out);
        return out;
    };
    const expansion = (name, pick = null) => {
        const all = countsOf(name);
        return (pickIndices(all.length, pick) ?? []).reduce((s, i) => s + all[i], 0);
    };
    const over = new Set();
    for (const c of cells.values()) {
        if (c.implicit)
            continue;
        const counts = countsOf(c.name);
        const total = counts.reduce((a, b) => a + b, 0);
        if (total <= MAX_EVENTS)
            continue;
        over.add(c.name);
        if (c.units.some((u) => u.atom.kind === 'ref' && expansion(u.atom.name, u.atom.pick) > MAX_EVENTS))
            continue;
        const d = decls.get(c.name);
        const toks = d?.braid.kind === 'list' ? d.braid.tokens : [];
        let sum = 0;
        const at = counts.findIndex((n) => (sum += n) > MAX_EVENTS);
        const span = toks[at]?.span ?? c.span;
        error(`${named(c)} expands to ${many(total)} notes: more than ${many(MAX_EVENTS)}, the most a cell can hold — repeat less (!n), or let a clock repeat it`, span);
    }
    const reported = new Set();
    const fastest = new Map();
    for (const o of outputs) {
        const c = cells.get(o.cell);
        if (!c?.clock || over.has(c.name) || reported.has(c.name) || c.params.law !== undefined)
            continue;
        const clock = clocks.get(c.clock);
        if (!clock)
            continue;
        const lap = Math.max(1, c.steps);
        const perSecond = (clock.perSecond * c.rate * expansion(c.name)) / lap;
        const key = clock.tap?.meter ?? c.clock;
        if (perSecond > (fastest.get(key) ?? 0))
            fastest.set(key, perSecond);
        if (!(perSecond > MAX_NOTES_PER_SECOND))
            continue;
        reported.add(c.name);
        const d = decls.get(c.name);
        const span = d?.step?.span ?? decls.get(c.clock)?.step?.span ?? c.span;
        error(`${named(c)} would start ${many(perSecond)} notes a second: more than ${many(MAX_NOTES_PER_SECOND)}, the most a cell can play — slow its step= or loop=`, span);
    }
    const unplayed = new Set();
    for (const c of cells.values()) {
        const clock = clocks.get(c.name);
        if (!clock || fastest.has(c.name) || !c.frees.some((f) => f.key === 'step' || f.key === 'loop'))
            continue;
        fastest.set(c.name, (clock.perSecond * expansion(c.name)) / Math.max(1, c.steps));
        unplayed.add(c.name);
    }
    for (const [name, perSecond] of fastest) {
        const c = cells.get(name);
        if (!c || !(perSecond > 0) || !Number.isFinite(perSecond))
            continue;
        const top = (spec) => Math.floor((spec.value * MAX_NOTES_PER_SECOND) / perSecond);
        const over = c.frees.filter((f) => (f.key === 'step' || f.key === 'loop') && f.value > 0 && f.hi > top(f) && top(f) >= f.value);
        if (!over.length)
            continue;
        c.frees = c.frees.map((f) => (over.includes(f) ? { ...f, hi: top(f) } : f));
        for (const f of over)
            warn(unplayed.has(name)
                ? `${f.key}=free(…): moved up to ${many(f.hi)}, &${name} would move what it moves more than ${many(MAX_NOTES_PER_SECOND)} times a second, the most a cell can play: the slider stops at ${many(top(f))}`
                : `${f.key}=free(…): moved up to ${many(f.hi)}, a cell &${name} clocks would start more than ${many(MAX_NOTES_PER_SECOND)} notes a second, the most a cell can play: the slider stops at ${many(top(f))}`, f.span);
    }
}
