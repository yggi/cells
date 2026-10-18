import { declarations } from "./fit.js";
import { byId, fragmentProblems, pointDistance, pointsOf } from "./fragments.js";
import { INTERFACE_NAMES } from "./holes.js";
export const FILING_WEIGHT = 0.1;
export const USE_STEP = 0.1;
export const USE_CAP = 1.25;
const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.replace(/^&/, '')));
const NAME = /&([A-Za-z_][A-Za-z0-9_]*)/g;
const ownNames = (text) => [...new Set(declarations(text).map((l) => l.name))].filter((name) => !INTERFACE.has(name));
export function canonicalText(text) {
    const index = new Map(ownNames(text).map((name, i) => [name, i + 1]));
    return declarations(text)
        .map((l) => l.code.replace(NAME, (written, name) => (index.has(name) ? `&#${index.get(name)}` : written)))
        .join('\n');
}
export function sameText(a, b) {
    if (canonicalText(a) !== canonicalText(b))
        return null;
    const bs = ownNames(b);
    return new Map(ownNames(a).flatMap((name, i) => (name === bs[i] ? [] : [[`&${name}`, `&${bs[i]}`]])));
}
export function usedTogether(layer, a, b) {
    if (a === b)
        return 0;
    const [x, y] = byId(a, b) < 0 ? [a, b] : [b, a];
    return layer.together.find((p) => p.ids[0] === x && p.ids[1] === y)?.count ?? 0;
}
const rounded = (weight) => Math.round(weight * 1e9) / 1e9;
function movedAt(repository, layer, id, point, facet) {
    const file = layer.filed.find((f) => f.fragment.id === id);
    const own = file ? file.fragment.association : repository.fragments.find((f) => f.id === id).association;
    const places = own.map((wp, i) => ({ wp, own: i }));
    layer.points.forEach((lp, i) => {
        if (lp.id === id)
            places.push({ wp: lp, row: i });
    });
    const ofFacet = new Set(pointsOf({ id, text: '-', association: places.map((p) => p.wp) }, facet));
    let found;
    let best = Infinity;
    for (const place of places) {
        const d = ofFacet.has(place.wp) ? pointDistance(place.wp.point, point) / place.wp.weight : Infinity;
        if (d <= best && d < Infinity)
            [found, best] = [place, d];
    }
    if (!found)
        return addedAt(layer, id, file, { point: { ...point }, weight: FILING_WEIGHT, ...(facet === undefined ? {} : { facet }) });
    const { wp } = found;
    if (wp.weight >= USE_CAP)
        return layer;
    const weight = rounded(Math.min(USE_CAP, wp.weight + USE_STEP));
    if (found.row !== undefined)
        return { ...layer, points: layer.points.map((lp, i) => (i === found.row ? { ...lp, weight } : lp)) };
    if (!file)
        return addedAt(layer, id, file, { ...wp, weight });
    const association = own.map((p, i) => (i === found.own ? { ...p, weight } : p));
    return { ...layer, filed: layer.filed.map((f) => (f === file ? { ...f, fragment: { ...f.fragment, association } } : f)) };
}
function addedAt(layer, id, file, wp) {
    if (!file)
        return { ...layer, points: [...layer.points, { id, ...wp }] };
    const fragment = { ...file.fragment, association: [...file.fragment.association, wp] };
    return { ...layer, filed: layer.filed.map((f) => (f === file ? { ...f, fragment } : f)) };
}
function countedTogether(layer, ids) {
    const distinct = [...new Set(ids)].sort(byId);
    if (distinct.length < 2)
        return layer;
    const together = [...layer.together];
    const at = new Map(together.map((p, i) => [JSON.stringify(p.ids), i]));
    for (let i = 0; i < distinct.length; i++)
        for (let j = i + 1; j < distinct.length; j++) {
            const ids = [distinct[i], distinct[j]];
            const key = JSON.stringify(ids);
            const k = at.get(key);
            if (k === undefined) {
                at.set(key, together.length);
                together.push({ ids, count: 1 });
            }
            else
                together[k] = { ids, count: together[k].count + 1 };
        }
    return { ...layer, together };
}
export function useFragments(repository, layer, uses) {
    const held = new Set(repository.merge(layer).fragments.map((f) => f.id));
    const unknown = uses.filter((u) => !held.has(u.id)).map((u) => `'${u.id}'`);
    if (unknown.length)
        throw new Error(`useFragments: no fragment ${unknown.join(', ')}`);
    let next = countedTogether(layer, uses.map((u) => u.id));
    for (const { id, point, facet } of uses)
        if (point)
            next = movedAt(repository, next, id, point, facet);
    return next;
}
export function fileFragment(repository, layer, filing) {
    const { text, point, facet, source, created, meta = {}, prose = '' } = filing;
    const problems = [];
    if (typeof source !== 'string' || !source.trim())
        problems.push('no source');
    if (typeof created !== 'string' || !created.trim())
        problems.push('no created');
    const clash = ['id', 'association', 'source', 'created'].filter((key) => Object.hasOwn(meta, key));
    if (clash.length)
        problems.push(`its meta names ${clash.join(', ')}, which filing writes itself`);
    const association = [{ point: { ...point }, weight: FILING_WEIGHT, ...(facet === undefined ? {} : { facet }) }];
    problems.push(...fragmentProblems({ id: filing.id ?? 'filed', text, association }));
    if (problems.length)
        throw new Error(`fileFragment: ${problems.join('; ')}`);
    const merged = repository.merge(layer);
    for (const held of merged.fragments) {
        const renamed = sameText(text, held.text);
        if (renamed)
            return { layer: movedAt(repository, layer, held.id, point, facet), id: held.id, file: null, renamed };
    }
    const taken = new Set([...merged.fragments.map((f) => f.id), ...merged.unheld]);
    if (filing.id !== undefined && taken.has(filing.id))
        throw new Error(`fileFragment: the id ${filing.id} is taken`);
    let id = filing.id ?? `${source} ${created}`;
    for (let n = 2; taken.has(id); n++)
        id = `${source} ${created} ${n}`;
    const file = { fragment: { id, text, association }, meta: { source, created, ...meta }, prose };
    return { layer: { ...layer, filed: [...layer.filed, file] }, id, file, renamed: new Map() };
}
