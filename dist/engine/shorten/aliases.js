import { PARAM_ALIASES } from "../attributes.js";
import { attrsOf, renameAttr } from "../edit.js";
import { measured } from "./harness.js";
export function aliases(source, result) {
    const out = [];
    for (const c of result.cells.values()) {
        if (c.implicit || c.lambda)
            continue;
        for (const [key, value] of attrsOf(source, c.name)) {
            const ours = PARAM_ALIASES[key];
            if (!ours || ours.length >= key.length)
                continue;
            const s = measured(source, {
                id: `alias:${c.name}:${key}`,
                kind: 'alias',
                title: `&${c.name}: ${key}= is Strudel's or dough's name for ${ours}= — write ours`,
                before: `${key}=${value}`,
                after: `${ours}=${value}`,
                apply: (src) => renameAttr(src, c.name, key, ours),
            });
            if (s)
                out.push(s);
        }
    }
    return out;
}
