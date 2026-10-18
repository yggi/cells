import { cachedFit } from "./fit.js";
export const CO_USE_PULL = 0.1;
export const coUseScore = (distance, uses) => distance - CO_USE_PULL * Math.log1p(uses);
const isFiniteNumber = (x) => typeof x === 'number' && Number.isFinite(x);
function pointProblems(point, where) {
    if (typeof point !== 'object' || point === null)
        return [`${where}: not a style point`];
    const axes = Object.entries(point);
    if (!axes.length)
        return [`${where}: an empty point (no axes)`];
    return axes.flatMap(([axis, value]) => (isFiniteNumber(value) ? [] : [`${where}: ${axis} is ${String(value)}, not a number`]));
}
export function fragmentProblems(entry) {
    const problems = [];
    const { id, text, association } = entry;
    if (typeof id !== 'string' || !id.trim())
        problems.push('no id');
    const name = typeof id === 'string' && id.trim() ? id : '(no id)';
    if (typeof text !== 'string' || !text.trim())
        problems.push(`${name}: no text`);
    if (!Array.isArray(association) || !association.length)
        problems.push(`${name}: no style point in its association`);
    else
        association.forEach((wp, i) => {
            const where = `${name}: point ${i + 1}`;
            if (!wp || !isFiniteNumber(wp.weight) || wp.weight <= 0)
                problems.push(`${where}: weight ${String(wp?.weight)}, not a number > 0`);
            const facet = wp?.facet;
            if (facet !== undefined && (typeof facet !== 'string' || !facet.trim()))
                problems.push(`${where}: facet ${String(facet)}, not a name`);
            problems.push(...pointProblems(wp?.point, where));
        });
    return problems;
}
export function pointDistance(a, b, axisWeights = {}) {
    let sum = 0;
    let weights = 0;
    for (const axis of Object.keys(a)) {
        if (!Object.hasOwn(b, axis))
            continue;
        const w = axisWeights[axis] ?? 1;
        sum += w * (a[axis] - b[axis]) ** 2;
        weights += w;
    }
    return weights > 0 ? Math.sqrt(sum / weights) : Infinity;
}
export const pointsOf = (fragment, facet) => facet === undefined ? fragment.association : fragment.association.filter((wp) => wp.facet === undefined || wp.facet === facet);
export function fragmentDistance(fragment, point, axisWeights = {}, facet) {
    return Math.min(...pointsOf(fragment, facet).map((wp) => pointDistance(wp.point, point, axisWeights) / wp.weight));
}
export function createRepository(entries) {
    const problems = entries.flatMap(fragmentProblems);
    const seen = new Set();
    for (const { id } of entries) {
        if (seen.has(id))
            problems.push(`${id}: the id is given twice`);
        seen.add(id);
    }
    if (problems.length)
        throw new Error(`A malformed repository: ${problems.join('; ')}`);
    const fragments = [...entries];
    const fits = cachedFit();
    const together = new Map(fragments.map((f) => [f.id, new Map()]));
    const usesWith = (id, chosen) => {
        const counts = together.get(id);
        let n = 0;
        for (const other of chosen)
            n += counts.get(other) ?? 0;
        return n;
    };
    return {
        fragments,
        query(point, k, axisWeights = {}, { facet, chosen = [], workbench } = {}) {
            if (!(Number.isInteger(k) && k >= 0))
                throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
            const wrong = [
                ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
                ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
            ];
            if (wrong.length)
                throw new Error(`query: ${wrong.join(', ')}`);
            const chosenIds = [...new Set(chosen)];
            const ranked = fragments
                .filter((fragment) => pointsOf(fragment, facet).length > 0)
                .map((fragment) => {
                const distance = fragmentDistance(fragment, point, axisWeights, facet);
                return { fragment, distance, score: coUseScore(distance, usesWith(fragment.id, chosenIds)) };
            })
                .sort((a, b) => a.score - b.score || (a.fragment.id < b.fragment.id ? -1 : a.fragment.id > b.fragment.id ? 1 : 0));
            if (workbench === undefined)
                return ranked.slice(0, k);
            const fitting = [];
            for (const found of ranked) {
                if (fitting.length >= k)
                    break;
                if (fits(found.fragment.text, workbench).fits)
                    fitting.push(found);
            }
            return fitting;
        },
        used(ids) {
            const unknown = ids.filter((id) => !together.has(id));
            if (unknown.length)
                throw new Error(`used: no fragment ${unknown.map((id) => `'${id}'`).join(', ')}`);
            const distinct = [...new Set(ids)];
            for (const a of distinct)
                for (const b of distinct) {
                    if (a === b)
                        continue;
                    const counts = together.get(a);
                    counts.set(b, (counts.get(b) ?? 0) + 1);
                }
        },
        usedTogether(a, b) {
            return a === b ? 0 : (together.get(a)?.get(b) ?? 0);
        },
    };
}
