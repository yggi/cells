import { attrsOf, declLine, setAttr } from "../edit.js";
import { parse } from "../parser/index.js";
export function mainMeters(source, result) {
    const main = result.meters?.[0];
    if (!main)
        return [];
    const out = [];
    for (const d of parse(source).cells) {
        if (d.lambda !== undefined || declLine(source, d.name) < 0)
            continue;
        const bare = (st) => st?.kind === 'tap' && !st.meter;
        const keys = [...(bare(d.step) ? ['step'] : []), ...Object.entries(d.paramClocks ?? {}).flatMap(([k, st]) => (bare(st) ? [k] : []))];
        for (const key of keys) {
            const written = attrsOf(source, d.name).get(key);
            if (written === undefined)
                continue;
            const at = declLine(source, d.name);
            const apply = (s) => setAttr(s, d.name, key, `&${main}:${written}`);
            out.push({
                id: `main meter:${d.name}:${key}`,
                tool: 'migrate',
                rule: 'main meter',
                title: `&${d.name}'s ${key}=${written} names no meter, and the piece has ${result.meters.length}: ${key}=&${main}:${written}, the one it read (decision 091)`,
                before: source.split('\n')[at].trim(),
                after: apply(source).split('\n')[at].trim(),
                apply,
            });
        }
    }
    return out;
}
