import { FIVETO12 } from "./fiveto12.js";
export const BUILT_IN = new Map([[FIVETO12.id, FIVETO12]]);
export const BY_FRAGMENT = new Map([...BUILT_IN.values()].map((f) => [f.fragment, f]));
export const lawOf = (params) => (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;
const streamsIn = (result) => [...result.cells.values()].flatMap((cell) => {
    const law = cell.fill?.fragment ? BY_FRAGMENT.get(cell.fill.fragment) : undefined;
    return law && law.fills[cell.fill?.name ?? '']?.lap !== undefined ? [{ cell, law }] : [];
});
export const lawIn = (result) => streamsIn(result)[0]?.law ?? null;
export const lawAt = (result, clock) => streamsIn(result).find((x) => x.cell.fill?.clock === clock)?.law ?? null;
export const unitOf = (f) => Math.min(...Object.values(f.fills).flatMap((x) => (x.lap !== undefined && !x.mark ? [x.lap] : [])));
export function marksOf(f) {
    return Object.entries(f.fills).flatMap(([name, x]) => x.mark && x.lap ? Array.from({ length: Math.round(f.cycle / x.lap) }, (_, k) => ({ at: k * x.lap * f.stepSeconds, label: textOf(f.fill(name, k, {})) })) : []);
}
export const textOf = (answer) => (typeof answer === 'string' ? answer : '');
const namedIn = (e) => (e.k === 'ref' ? [e.ref.name] : e.k === 'sum' ? e.items.flatMap((x) => namedIn(x.e)) : e.k === 'prod' ? e.factors.flatMap(namedIn) : []);
export function streamClockOf(cells, c) {
    if (c.fill?.fragment)
        return c.fill.clock;
    const atom = c.units.length === 1 ? c.units[0].atom : null;
    if (atom?.kind !== 'mix')
        return undefined;
    for (const e of atom.exprs)
        for (const n of namedIn(e)) {
            const f = cells.get(n)?.fill;
            if (f?.fragment)
                return f.clock;
        }
    return undefined;
}
