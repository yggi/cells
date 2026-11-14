import { variantsOf } from "./variants.js";
import { RENAMED_IDS } from "../engine/renamed.js";
import { cachedFit } from "./fit.js";
export const EMPTY_LAYER = Object.freeze({ filed: Object.freeze([]), points: Object.freeze([]), together: Object.freeze([]) });
export const CO_USE_PULL = 0.1;
export const CO_USE_KNOWN = 10;
export const CO_USE_REACH = 0.1;
export const coUseScore = (distance, uses, pull = CO_USE_PULL) => uses > 0 && pull > 0 ? distance - (pull * CO_USE_REACH * Math.log1p(Math.min(uses, CO_USE_KNOWN))) / Math.log1p(CO_USE_KNOWN) : distance;
const isFiniteNumber = (x) => typeof x === 'number' && Number.isFinite(x);
function pointProblems(point, where) {
    if (typeof point !== 'object' || point === null)
        return [`${where}: not a style point`];
    return Object.entries(point).flatMap(([axis, value]) => (isFiniteNumber(value) ? [] : [`${where}: ${axis} is ${String(value)}, not a number`]));
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
        association.forEach((wp, i) => problems.push(...weightedPointProblems(wp, `${name}: point ${i + 1}`)));
    return problems;
}
function weightedPointProblems(wp, where) {
    const problems = [];
    if (!wp || !isFiniteNumber(wp.weight) || wp.weight <= 0)
        problems.push(`${where}: weight ${String(wp?.weight)}, not a number > 0`);
    const facet = wp?.facet;
    if (facet !== undefined && (typeof facet !== 'string' || !facet.trim()))
        problems.push(`${where}: facet ${String(facet)}, not a name`);
    problems.push(...pointProblems(wp?.point, where));
    return problems;
}
export function layerProblems(layer) {
    const { filed, points, together } = layer;
    const problems = [];
    if (!Array.isArray(filed))
        problems.push('the layer: filed is not a list');
    else {
        const seen = new Set();
        filed.forEach((file, i) => {
            const where = `filed ${i + 1}`;
            if (!file?.fragment)
                return void problems.push(`${where}: no fragment`);
            problems.push(...fragmentProblems(file.fragment).map((p) => `${where}: ${p}`));
            if (typeof file.meta !== 'object' || file.meta === null || Array.isArray(file.meta))
                problems.push(`${where}: its meta is not a map`);
            if (typeof file.prose !== 'string')
                problems.push(`${where}: its prose is not a string`);
            if (seen.has(file.fragment.id))
                problems.push(`${where}: the id ${file.fragment.id} is filed twice`);
            seen.add(file.fragment.id);
        });
    }
    if (!Array.isArray(points))
        problems.push('the layer: points is not a list');
    else
        points.forEach((lp, i) => {
            const where = `learned point ${i + 1}`;
            if (typeof lp?.id !== 'string' || !lp.id.trim())
                problems.push(`${where}: no id`);
            problems.push(...weightedPointProblems(lp, where));
        });
    if (!Array.isArray(together))
        problems.push('the layer: together is not a list');
    else {
        const seen = new Set();
        together.forEach((pair, i) => {
            const where = `pair ${i + 1}`;
            const ids = pair?.ids;
            const [a, b] = Array.isArray(ids) ? ids : [];
            if (!Array.isArray(ids) || ids.length !== 2 || typeof a !== 'string' || typeof b !== 'string' || !a.trim() || !b.trim())
                return void problems.push(`${where}: its ids are not two names`);
            if (!(byId(a, b) < 0))
                problems.push(`${where}: its ids ${a} and ${b} are not two, in order`);
            if (!(Number.isInteger(pair?.count) && pair.count > 0))
                problems.push(`${where}: its count ${String(pair?.count)} is not a whole number > 0`);
            const key = JSON.stringify([a, b]);
            if (seen.has(key))
                problems.push(`${where}: ${a} and ${b} are counted twice`);
            seen.add(key);
        });
    }
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
export const ANY_DISTANCE = 1;
export const isAnyStyle = (point) => Object.keys(point).length === 0;
export function fragmentDistance(fragment, point, axisWeights = {}, facet) {
    return Math.min(...pointsOf(fragment, facet).map((wp) => (isAnyStyle(wp.point) ? ANY_DISTANCE : pointDistance(wp.point, point, axisWeights)) / wp.weight));
}
const WAS = new Map([...RENAMED_IDS].reverse().map(([old, word]) => [word, old]));
const tieKey = (id) => WAS.get(id) ?? id;
export const byId = (a, b) => {
    const [x, y] = [tieKey(a), tieKey(b)];
    return x < y ? -1 : x > y ? 1 : 0;
};
function expanded(fragment, problems) {
    try {
        return variantsOf(fragment);
    }
    catch (e) {
        problems.push(`${String(fragment?.id)}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
    }
}
export function createRepository(given) {
    const problems = [];
    const entries = given.flatMap((f) => expanded(f, problems));
    problems.push(...entries.flatMap(fragmentProblems));
    const seen = new Set();
    for (const { id } of entries) {
        if (seen.has(id))
            problems.push(`${id}: the id is given twice`);
        seen.add(id);
    }
    if (problems.length)
        throw new Error(`A malformed repository: ${problems.join('; ')}`);
    const seed = [...entries];
    const resolverOf = (fragments) => {
        const byId = new Map([...given, ...fragments].map((f) => [f.id, f.text]));
        return (id) => byId.get(id) ?? null;
    };
    const fits = cachedFit(resolverOf(seed));
    const alone = { fragments: seed, filed: new Set(), together: new Map(), unheld: [] };
    function merge(layer) {
        const wrong = layerProblems(layer);
        for (const { fragment } of Array.isArray(layer.filed) ? layer.filed : [])
            if (seen.has(fragment?.id))
                wrong.push(`the layer files ${fragment.id}, a seed fragment's id`);
        if (wrong.length)
            throw new Error(`A malformed learned layer: ${wrong.join('; ')}`);
        if (!layer.filed.length && !layer.points.length && !layer.together.length)
            return alone;
        const filedFragments = layer.filed.flatMap((f) => expanded(f.fragment, wrong));
        for (const { id } of filedFragments)
            if (seen.has(id) && !layer.filed.some((f) => f.fragment.id === id))
                wrong.push(`the layer files ${id}, a seed fragment's id`);
        if (wrong.length)
            throw new Error(`A malformed learned layer: ${wrong.join('; ')}`);
        const filed = new Set(filedFragments.map((f) => f.id));
        const held = (id) => seen.has(id) || filed.has(id);
        const added = new Map();
        const unheld = new Set();
        for (const { id, point, weight, facet } of layer.points) {
            if (!held(id)) {
                unheld.add(id);
                continue;
            }
            const list = added.get(id) ?? [];
            list.push({ point, weight, ...(facet === undefined ? {} : { facet }) });
            added.set(id, list);
        }
        const withAdded = (f) => {
            const more = added.get(f.id);
            return more ? { ...f, association: [...f.association, ...more] } : f;
        };
        const together = new Map();
        const count = (a, b, n) => {
            const counts = together.get(a) ?? new Map();
            counts.set(b, (counts.get(b) ?? 0) + n);
            together.set(a, counts);
        };
        for (const { ids, count: n } of layer.together) {
            const [a, b] = ids;
            for (const id of ids)
                if (!held(id))
                    unheld.add(id);
            if (!held(a) || !held(b))
                continue;
            count(a, b, n);
            count(b, a, n);
        }
        return { fragments: [...seed.map(withAdded), ...filedFragments.map(withAdded)], filed, together, unheld: [...unheld].sort(byId) };
    }
    return {
        fragments: seed,
        merge,
        query(point, k, axisWeights = {}, { facet, chosen = [], workbench, layer, pull = CO_USE_PULL, arguments: mains = {} } = {}) {
            if (!(Number.isInteger(k) && k >= 0))
                throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
            if (!(isFiniteNumber(pull) && pull >= 0))
                throw new Error(`query: pull is ${String(pull)}, not a number ≥ 0`);
            const wrong = [
                ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
                ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
            ];
            if (wrong.length)
                throw new Error(`query: ${wrong.join(', ')}`);
            const { fragments, filed, together } = layer ? merge(layer) : alone;
            const chosenIds = [...new Set(chosen)];
            const usesWith = (id) => {
                const counts = together.get(id);
                let n = 0;
                if (counts)
                    for (const other of chosenIds)
                        n += counts.get(other) ?? 0;
                return n;
            };
            const ranked = fragments
                .filter((fragment) => pointsOf(fragment, facet).length > 0)
                .map((fragment) => {
                const distance = fragmentDistance(fragment, point, axisWeights, facet);
                return { fragment, distance, score: coUseScore(distance, usesWith(fragment.id), pull) };
            })
                .sort((a, b) => a.score - b.score || Number(filed.has(b.fragment.id)) - Number(filed.has(a.fragment.id)) || byId(a.fragment.id, b.fragment.id));
            if (workbench === undefined)
                return ranked.slice(0, k);
            const fit = layer && fragments !== seed ? cachedFit(resolverOf([...fragments, ...layer.filed.map((f) => f.fragment)])) : fits;
            const mainOf = (f) => {
                if (facet !== undefined)
                    return mains[facet];
                for (const wp of f.association)
                    if (wp.facet !== undefined && mains[wp.facet] !== undefined)
                        return mains[wp.facet];
                return undefined;
            };
            const fitting = [];
            for (const found of ranked) {
                if (fitting.length >= k)
                    break;
                if (fit(found.fragment.text, workbench, mainOf(found.fragment)).fits)
                    fitting.push(found);
            }
            return fitting;
        },
    };
}
