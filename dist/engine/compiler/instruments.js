import { VOICE_PARAMS } from "../attributes.js";
import { refsOf } from "../readers.js";
import { IMPLICIT } from "./tables.js";
export const LINEAR = ['lpf', 'lpq', 'hpf', 'hpq', 'pan', 'room', 'delay', 'delaytime', 'delayfeedback'];
const GRIT = ['distort', 'crush'];
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
    const { error, warn } = ctx;
    const instruments = instrumentsOf(outputs, cells);
    const passes = new Map();
    for (const name of instruments) {
        const d = decls.get(name);
        if (!d)
            continue;
        const keys = soundKeys(d);
        const linear = new Map();
        for (const [k, span] of keys)
            if (LINEAR.includes(k))
                linear.set(k, span);
            else if (GRIT.includes(k))
                warn(`${k}= on the instrument &${name} acts on what its voices play together, in a chain of its own: not rendered yet (decision 067), so it plays without it`, span);
            else
                error(`${k}= is a voice's: an instrument (&${name}) processes what its voices play, with ${LINEAR.slice(0, 4)
                    .map((x) => `${x}=`)
                    .join(' ')} …; put ${k}= on a voice`, span);
        if (linear.size)
            passes.set(name, linear);
    }
    if (!passes.size)
        return cells;
    const said = new Set();
    const once = (key, f) => {
        if (!said.has(key))
            (said.add(key), f());
    };
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
                for (const inst of [...through].reverse()) {
                    for (const [k, span] of passes.get(inst) ?? []) {
                        if (has(voice, k))
                            once(`${inst}:${k}:${v}`, () => warn(`&${v} sets ${k}= and plays through &${inst}, which sets it too: the two in series aren't rendered yet (decision 067), so &${v}'s own plays`, span));
                        else if (taken.has(k))
                            once(`${inst}:${k}:${taken.get(k)}`, () => warn(`&${inst} and &${taken.get(k)} both set ${k}=, one after the other: the two in series aren't rendered yet (decision 067), so &${taken.get(k)}'s plays`, span));
                        else
                            taken.set(k, inst);
                    }
                }
                if (!takes.has(v))
                    takes.set(v, []);
                takes.get(v).push(taken);
            }
    const same = (a, b) => a.size === b.size && [...a].every(([k, i]) => b.get(k) === i);
    const next = new Map(cells);
    for (const [v, playings] of takes) {
        const first = playings[0];
        if (!playings.every((p) => same(p, first))) {
            const from = [...new Set(playings.flatMap((p) => [...p.values()]))];
            const d = decls.get(v);
            warn(`&${v} plays through ${from.map((i) => `&${i}`).join(' and ')} and elsewhere without ${from.length > 1 ? 'them' : 'it'}: a voice has one chain until an instrument has its own (decision 067), so ${from.length > 1 ? 'their' : 'its'} sound parameters aren't rendered on &${v}`, d?.span ?? IMPLICIT);
            continue;
        }
        if (!first.size)
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
