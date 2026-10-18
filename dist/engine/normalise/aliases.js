import { PARAM_ALIASES } from "../attributes.js";
import { attrsOf, renameAttr } from "../edit.js";
export function aliases(source, result, only = () => true) {
    const out = [];
    for (const c of result.cells.values()) {
        if (c.implicit || c.lambda)
            continue;
        const attrs = attrsOf(source, c.name);
        for (const [key, value] of attrs) {
            const ours = PARAM_ALIASES[key];
            if (!ours || attrs.has(ours) || !only(key, ours))
                continue;
            out.push({
                id: `alias:${c.name}:${key}`,
                tool: 'normalise',
                rule: 'alias',
                title: `&${c.name}: ${key}= is Strudel's or dough's name for ${ours}= — write ours`,
                before: `${key}=${value}`,
                after: `${ours}=${value}`,
                apply: (src) => renameAttr(src, c.name, key, ours),
            });
        }
    }
    return out;
}
