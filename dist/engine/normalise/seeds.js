import { setAttr } from "../edit.js";
import { drawKeyOf, keyAsSeed } from "../drawkey.js";
import { flatten } from "../flatten.js";
import { noisePlaces } from "../noise.js";
import { codeShifts } from "../program.js";
function draws(result, name) {
    try {
        return flatten(result, name, codeShifts(result)).some((e) => e.chance !== undefined || !!e.options || !!e.chosen);
    }
    catch {
        return false;
    }
}
function noiseSeeds(result) {
    const places = noisePlaces(result);
    const written = new Set([...places.keys()].flatMap((n) => (result.cells.get(n)?.seeded ? [result.cells.get(n).seed] : [])));
    const out = [];
    for (const [name, place] of places) {
        const c = result.cells.get(name);
        if (!c || c.implicit || c.lambda || c.seeded)
            continue;
        let n = Number(place.slice('noise#'.length));
        if (written.has(n))
            for (n = places.size; written.has(n); n++)
                ;
        written.add(n);
        out.push({
            id: `seed:${name}`,
            tool: 'normalise',
            rule: 'seed',
            title: `&${name}: its noise starts where its place among the noise voices says — write the seed it is thrown from, seed=${n}`,
            before: '',
            after: `seed=${n}`,
            apply: (src) => setAttr(src, name, 'seed', String(n)),
        });
    }
    return out;
}
export function seeds(source, result) {
    const key = drawKeyOf(result);
    const out = [...noiseSeeds(result)];
    for (const c of result.cells.values()) {
        if (c.implicit || c.lambda || c.seeded || !draws(result, c.name))
            continue;
        const n = keyAsSeed(key(c.name));
        out.push({
            id: `seed:${c.name}`,
            tool: 'normalise',
            rule: 'seed',
            title: `&${c.name}: its chance is thrown from what it carries — write the seed it is thrown from, seed=${n}`,
            before: '',
            after: `seed=${n}`,
            apply: (src) => setAttr(src, c.name, 'seed', String(n)),
        });
    }
    return out;
}
