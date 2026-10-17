import { attrsOf, setAttr } from "../edit.js";
import { measured, samePiece } from "./harness.js";
export function progressions(source, result) {
    const out = [];
    for (const c of result.cells.values()) {
        if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.map || !c.loops || !c.steps)
            continue;
        const loop = attrsOf(source, c.name).get('loop');
        const m = loop ? /^&([A-Za-z_][A-Za-z0-9_]*)\/([0-9]+)$/.exec(loop) : null;
        if (!m || +m[2] % c.steps !== 0)
            continue;
        const per = +m[2] / c.steps;
        const step = `&${m[1]}${per > 1 ? `/${per}` : ''}`;
        const s = measured(source, {
            id: `progression:${c.name}`,
            kind: 'progression',
            title: `&${c.name}: loop=${loop} over ${c.steps} steps is a step every ${per} — step=${step}, held under the melody it moves`,
            before: `loop=${loop}`,
            after: `step=${step}`,
            apply: (src) => setAttr(setAttr(src, c.name, 'loop', null), c.name, 'step', step),
        });
        if (s && samePiece(source, s.apply(source)))
            out.push(s);
    }
    return out;
}
