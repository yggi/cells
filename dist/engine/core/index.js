import { normalise } from "../normalise/index.js";
import { soundsIdentical } from "../sameness.js";
import { FAMILIES, LEFT, stillWritten } from "./desugar.js";
import { coreFold } from "./fold.js";
import { minify } from "./minify.js";
export { FAMILIES, LEFT, stillWritten } from "./desugar.js";
export { meaningfulNames, minify } from "./minify.js";
export { coreFold } from "./fold.js";
const ROUNDS = 4;
function round(source, options) {
    const same = (a, b) => soundsIdentical(a, b, undefined, options);
    const normal = normalise(source, options);
    let now = normal.source;
    const steps = [...normal.steps];
    for (const f of FAMILIES) {
        const next = f.rewrite(now, options);
        if (next === now)
            continue;
        if (same(now, next)) {
            now = next;
            steps.push(`de-sugared: ${f.key} (${f.rows})`);
        }
        else
            steps.push(`left as written: ${f.key} (${f.rows}) would not play the same here`);
    }
    const folded = coreFold(now, options);
    now = folded.source;
    steps.push(...folded.steps);
    const short = minify(now);
    if (short !== now && same(now, short)) {
        now = short;
        steps.push('minified: its own names short');
    }
    return { source: now, steps };
}
export function toCore(source, options = {}) {
    let now = source;
    const steps = [];
    for (let i = 0; i < ROUNDS; i++) {
        const r = round(now, options);
        if (r.source === now)
            break;
        now = r.source;
        steps.push(...r.steps);
    }
    return { source: now, steps, left: LEFT.filter((l) => stillWritten(l, now)).map(({ key, rows, why }) => ({ key, rows, why })) };
}
