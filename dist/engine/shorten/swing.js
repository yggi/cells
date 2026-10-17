import { attrsOf, declLine, setAttr } from "../edit.js";
import { bareSwingLevel } from "../meter.js";
import { samePiece, size } from "./harness.js";
export function swings(source, result) {
    const out = [];
    for (const c of result.cells.values()) {
        const m = c.meter;
        const written = m && typeof c.params.swing === 'number' ? attrsOf(source, c.name).get('swing') : undefined;
        if (!m || !written || /^[1-9][0-9]*(?:n\.?|t):/.test(written) || declLine(source, c.name) < 0)
            continue;
        const level = bareSwingLevel(m);
        if (!level)
            continue;
        const apply = (s) => setAttr(s, c.name, 'swing', `${level}:${written}`);
        const next = apply(source);
        if (next === source || !samePiece(source, next))
            continue;
        const at = declLine(source, c.name);
        out.push({
            id: `swing:${c.name}`,
            kind: 'swing',
            title: `&${c.name}'s swing= leans the meter cell's own steps: name the level, swing=${level}:${written} (#18)`,
            before: source.split('\n')[at].trim(),
            after: next.split('\n')[at].trim(),
            saving: size(source) - size(next),
            apply,
        });
    }
    return out;
}
