import { setAttr } from "../edit.js";
import { drawKeyOf, keyAsSeed } from "../drawkey.js";
import { flatten } from "../flatten.js";
import { codeShifts } from "../program.js";
function draws(result, name) {
    try {
        return flatten(result, name, codeShifts(result)).some((e) => e.chance !== undefined || !!e.options || !!e.chosen);
    }
    catch {
        return false;
    }
}
export function seeds(source, result) {
    const key = drawKeyOf(result);
    const out = [];
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
