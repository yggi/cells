import { normalise } from "../normalise/index.js";
import { soundsIdentical } from "../sameness.js";
import { parse } from "../parser/index.js";
import { declLine } from "../edit.js";
import { signatureOf } from "../use.js";
import { FAMILIES, LEFT, stillWritten } from "./desugar.js";
import { coreFold } from "./fold.js";
import { minify } from "./minify.js";
export { FAMILIES, LEFT, stillWritten } from "./desugar.js";
export { meaningfulNames, minify } from "./minify.js";
export { coreFold } from "./fold.js";
export function interfaceOf(text, spec = []) {
    const cells = parse(text).cells;
    const bare = (n) => n.replace(/^&/, '');
    let names;
    if (spec === 'signature') {
        const sig = signatureOf(text);
        names = sig ? [...sig.names, ...sig.optional, ...(sig.main ? [sig.main] : [])].map(bare) : [];
    }
    else if (spec === 'roles')
        names = cells.filter((d) => d.map?.kind === 'role').map((d) => d.name);
    else
        names = spec.map(bare);
    const keep = new Set(names.filter((n) => cells.some((d) => d.name === n)));
    for (const d of cells)
        if (keep.has(d.name) && d.map?.kind === 'role' && d.braid.kind === 'list')
            for (const t of d.braid.tokens)
                if (t.atom.kind === 'ref')
                    keep.add(t.atom.name);
    return keep;
}
const ROUNDS = 4;
function round(source, options, spec, keep) {
    const same = (a, b) => soundsIdentical(a, b, undefined, options);
    const kept = (t) => [...keep].every((n) => declLine(t, n) >= 0);
    const normal = normalise(source, options);
    const steps = [];
    let now = source;
    const more = () => {
        for (const n of interfaceOf(now, spec))
            keep.add(n);
    };
    if (kept(normal.source)) {
        now = normal.source;
        steps.push(...normal.steps);
        more();
    }
    else
        steps.push('left as written: Normalise would rename or remove an interface cell');
    for (const f of FAMILIES) {
        const next = f.rewrite(now, { ...options, keep });
        if (next === now)
            continue;
        if (!kept(next)) {
            steps.push(`left as written: ${f.key} (${f.rows}) would remove an interface cell`);
            continue;
        }
        if (same(now, next)) {
            now = next;
            more();
            steps.push(`de-sugared: ${f.key} (${f.rows})`);
        }
        else
            steps.push(`left as written: ${f.key} (${f.rows}) would not play the same here`);
    }
    const folded = coreFold(now, options, undefined, keep);
    now = folded.source;
    steps.push(...folded.steps);
    const short = minify(now, keep);
    if (short !== now && same(now, short)) {
        now = short;
        steps.push('minified: its own names short');
    }
    return { source: now, steps };
}
export function toCore(source, options = {}) {
    const { interface: spec, ...rest } = options;
    const keep = interfaceOf(source, spec);
    let now = source;
    const steps = [];
    for (let i = 0; i < ROUNDS; i++) {
        const r = round(now, rest, spec, keep);
        if (r.source === now)
            break;
        now = r.source;
        steps.push(...r.steps);
    }
    return { source: now, steps, left: LEFT.filter((l) => stillWritten(l, now)).map(({ key, rows, why }) => ({ key, rows, why })) };
}
