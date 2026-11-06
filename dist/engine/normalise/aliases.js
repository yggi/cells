import { FILTER_MODELS, PARAM_ALIASES } from "../attributes.js";
import { attrsOf, renameAttr, setAttr } from "../edit.js";
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
export function filterModels(source, result) {
    const out = [];
    for (const c of result.cells.values()) {
        if (c.implicit || c.lambda)
            continue;
        const written = attrsOf(source, c.name).get('ftype');
        const word = written !== undefined && /^\d+$/.test(written) ? FILTER_MODELS[Number(written)] : undefined;
        if (!word)
            continue;
        out.push({
            id: `ftype:${c.name}`,
            tool: 'normalise',
            rule: 'alias',
            title: `&${c.name}: ftype=${written} is superdough's number for ftype=${word} — write the word`,
            before: `ftype=${written}`,
            after: `ftype=${word}`,
            apply: (src) => setAttr(src, c.name, 'ftype', word),
        });
    }
    return out;
}
