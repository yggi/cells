import { VOICE_PARAMS } from "../attributes.js";
import { refsOf } from "../readers.js";
export const LINEAR = ['lpf', 'lpq', 'hpf', 'hpq', 'bpf', 'bpq', 'ftype', 'room', 'delay', 'delaytime', 'delayfeedback'];
const PROCESSORS = [...LINEAR, 'pan', 'distort', 'crush', 'drive'];
export const instrumentsOf = (outputs, cells) => new Set(outputs.flatMap((o) => o.through).filter((n) => !!cells.get(n)?.mix));
function soundKeys(d) {
    const out = new Map();
    for (const k of Object.keys(d.params))
        if (VOICE_PARAMS.has(k))
            out.set(k, d.paramSpans[k] ?? d.span);
    for (const [k, pc] of Object.entries(d.paramCells ?? {}))
        if (VOICE_PARAMS.has(k))
            out.set(k, pc.span);
    for (const [k, st] of Object.entries(d.paramClocks ?? {}))
        if (VOICE_PARAMS.has(k))
            out.set(k, st.span);
    return out;
}
const has = (c, k) => k in c.params || k in c.paramCells || k in c.paramClocks;
export function instrumentParams(ctx, decls, cells, outputs, playings) {
    const { error } = ctx;
    const instruments = instrumentsOf(outputs, cells);
    const passes = new Map();
    for (const name of instruments) {
        const d = decls.get(name);
        if (!d)
            continue;
        const keys = soundKeys(d);
        for (const [k, span] of keys)
            if (!PROCESSORS.includes(k))
                error(`${k}= is a voice's: an instrument (&${name}) processes what its voices play, with ${LINEAR.slice(0, 4)
                    .map((x) => `${x}=`)
                    .join(' ')} …; put ${k}= on a voice`, span);
        const linear = [...keys.keys()].filter((k) => LINEAR.includes(k));
        if (linear.length)
            passes.set(name, linear);
    }
    if (!passes.size)
        return cells;
    const voicesOf = (n) => {
        const c = cells.get(n);
        const over = decls.get(n)?.over?.name;
        const kit = c?.kit ? c : over && cells.get(over)?.kit ? cells.get(over) : null;
        return kit ? refsOf(kit) : [n];
    };
    const takes = new Map();
    for (const [sound, ways] of playings)
        for (const through of ways)
            for (const v of voicesOf(sound)) {
                const voice = cells.get(v);
                if (!voice)
                    continue;
                const taken = new Map();
                for (const inst of [...through].reverse())
                    for (const k of passes.get(inst) ?? [])
                        if (!has(voice, k) && !taken.has(k))
                            taken.set(k, inst);
                if (!takes.has(v))
                    takes.set(v, []);
                takes.get(v).push(taken);
            }
    const same = (a, b) => a.size === b.size && [...a].every(([k, i]) => b.get(k) === i);
    const next = new Map(cells);
    for (const [v, ways] of takes) {
        const first = ways[0];
        if (!first.size || !ways.every((p) => same(p, first)))
            continue;
        const c = cells.get(v);
        const params = { ...c.params };
        const paramCells = { ...c.paramCells };
        const paramClocks = { ...c.paramClocks };
        for (const [k, inst] of first) {
            const i = cells.get(inst);
            if (k in i.params)
                params[k] = i.params[k];
            if (k in i.paramCells)
                paramCells[k] = i.paramCells[k];
            if (k in i.paramClocks)
                paramClocks[k] = i.paramClocks[k];
        }
        next.set(v, { ...c, params, paramCells, paramClocks, voice: true, inherited: Object.fromEntries(first) });
    }
    return next;
}
