import { compileSource } from "../compile.js";
import { deleteCell, splitComment } from "../edit.js";
import { soundsIdentical } from "../sameness.js";
import { shorten } from "../shorten/index.js";
const CORE_KINDS = new Set(['phrase', 'same', 'default']);
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
function unread(source, options) {
    const r = compileSource(source, undefined, options);
    if (!r.ok)
        return [];
    const played = new Set(r.outputs.map((o) => o.cell));
    const codes = source.split('\n').map((l) => splitComment(l)[0]);
    return codes.flatMap((c, i) => {
        const name = HEAD.exec(c)?.[1];
        if (!name || played.has(name))
            return [];
        const named = new RegExp(`&${name}(?![A-Za-z0-9_])`);
        return codes.some((d, j) => j !== i && named.test(d)) ? [] : [name];
    });
}
export function coreFold(text, options = {}, rounds = 60) {
    let now = text;
    const steps = [];
    const same = (a, b) => soundsIdentical(a, b, undefined, options);
    for (let i = 0; i < rounds; i++) {
        const gone = unread(now, options).find((name) => same(now, deleteCell(now, name)));
        if (gone) {
            now = deleteCell(now, gone);
            steps.push(`&${gone} is read by nothing and plays nothing: gone`);
            continue;
        }
        const best = shorten(now, options).find((s) => CORE_KINDS.has(s.kind) && same(now, s.apply(now)));
        if (!best)
            break;
        now = best.apply(now);
        steps.push(best.title);
    }
    return { source: now, steps };
}
