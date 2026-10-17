import { pickLabel } from "./ast.js";
import { ROOT, MAX_EVENTS, pickIndices, pickSteps } from "./program.js";
import { isTap, positionOf, rootOf, shiftedUnits } from "./helix.js";
import { placed, whole } from "./subseq.js";
export function unitsFor(result, name, shifts, pick, table, extra = 0) {
    if (!pick)
        return shiftedUnits(result, name, shifts(name) + extra, table);
    const all = shiftedUnits(result, name, pick.abs ? 0 : shifts(name), table);
    return (pickIndices(all.length, pick) ?? []).map((i) => all[i]);
}
export const stepsOf = (result, name, pick) => pickSteps(result.cells.get(name), pick) ?? 0;
const pickKey = (p, shift = 0) => (!p ? `>${shift}` : pickLabel(p));
export class ExpansionLimit extends Error {
}
export function flatten(result, root, shifts, rootPick = null, silent = () => false, rootShift = 0, rootCtx = ROOT) {
    const memo = new Map();
    const walk = (name, pick, extra, ctx, ctxShift) => {
        const cell = result.cells.get(name);
        const table = cell.root ? name : (cell.over ?? ctx);
        const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
        const key = `${name}|${pickKey(pick, extra)}|${table}|${tShift}`;
        const hit = memo.get(key);
        if (hit)
            return hit;
        const out = [];
        if (!silent(name)) {
            const taps = isTap(result, name, pick) ? pickIndices(result.cells.get(name).units.length, pick) : null;
            const units = unitsFor(result, name, shifts, pick, table, extra);
            const unit = (x) => (x.kind === 'ref' ? stepsOf(result, x.name, x.pick) || 1 : 1);
            const leaf = (x, at, dur) => {
                if (x.kind !== 'ref')
                    return whole(x, at, dur);
                const k = dur / unit(x);
                return walk(x.name, x.pick, x.shift, table, tShift).map((e) => ({
                    atom: { kind: 'spliced', e, ref: x },
                    at: at + e.step * k,
                    dur: e.duration * k,
                    of: e.laps?.of ?? 1,
                    is: e.laps?.is ?? 0,
                    chances: [],
                    picks: (e.chosen ?? []).map((c) => ({ ...c, at: at + c.at * k })),
                }));
            };
            for (const { atom: a, at, dur, chances, top, level, laps, chosen } of placed(units, unit, leaf, `${name}:`)) {
                const ev = {
                    step: at,
                    duration: dur,
                    cell: name,
                    table,
                    tableShift: tShift,
                    ...(taps ? { via: { cell: name, index: taps[top], ctx: table, mul: 1, add: 0 } } : {}),
                    ...(laps ? { laps } : {}),
                    ...(chosen ? { chosen } : {}),
                };
                const drop = chances.map((c) => (c === null ? (cell.chance ?? 0.5) : c));
                const odds = {
                    ...(!drop.length ? {} : { chance: drop.length === 1 ? drop[0] : 1 - drop.reduce((keep, c) => keep * (1 - c), 1) }),
                    ...(level === undefined ? {} : { level }),
                };
                const pitch = (semis) => ({
                    ...ev,
                    table: rootOf(result, table),
                    tableShift: 0,
                    value: Math.round(positionOf(result, rootOf(result, table), semis) * 1e6) / 1e6,
                    alter: 0,
                });
                if (a.kind === 'note')
                    out.push(a.pitched ? { ...pitch(a.value), ...odds } : { ...ev, value: a.value, alter: a.alter, ...odds });
                else if (a.kind === 'chord')
                    a.notes.forEach((v, j) => {
                        const own = a.levels?.[j];
                        const lv = own === undefined ? {} : { level: own * (level ?? 1) };
                        out.push(a.pitched?.[j] ? { ...pitch(v), ...odds, ...lv } : { ...ev, value: v, alter: a.alters[j], ...odds, ...lv });
                    });
                else if (a.kind === 'choice')
                    out.push({ ...ev, value: a.values[0], alter: a.alters[0], ...odds, options: a.values.map((v, j) => ({ value: v, alter: a.alters[j] })) });
                else if (a.kind === 'spliced') {
                    const { e, ref } = a;
                    const up = ref.transpose ?? 0;
                    const m = ref.values;
                    const { laps: _laps, chosen: _chosen, ...own } = e;
                    out.push({
                        ...own,
                        ...(m
                            ? {
                                value: m.mul * e.value + m.add,
                                alter: m.mul * e.alter,
                                ...(e.options ? { options: e.options.map((o) => ({ value: m.mul * o.value + m.add, alter: m.mul * o.alter })) } : {}),
                                ...(e.via ? { via: { ...e.via, mul: (m.mul * e.via.mul), add: m.mul * e.via.add + m.add } } : {}),
                            }
                            : {}),
                        step: at,
                        duration: dur,
                        ...(laps ? { laps } : {}),
                        ...(chosen ? { chosen } : {}),
                        ...(up || e.transpose ? { transpose: (e.transpose ?? 0) + up } : {}),
                        ...(level !== undefined ? { level: (e.level ?? 1) * level } : {}),
                    });
                }
                if (out.length > MAX_EVENTS)
                    throw new ExpansionLimit(name);
            }
        }
        memo.set(key, out);
        return out;
    };
    return [...walk(root, rootPick, rootShift, rootCtx, 0)].sort((a, b) => a.step - b.step || a.value - b.value);
}
export function tapped(result, e, shifts) {
    if (!e.via)
        return { value: e.value, alter: e.alter };
    const u = shiftedUnits(result, e.via.cell, shifts(e.via.cell), e.via.ctx)[e.via.index];
    return u?.atom.kind === 'note' ? { value: e.via.mul * u.atom.value + e.via.add, alter: e.via.mul * u.atom.alter } : { value: e.value, alter: e.alter };
}
