import { compileSource } from "../compile.js";
import { declLine, deleteCell, spansLines } from "../edit.js";
import { pieceMidi } from "../midiexport.js";
import { codeShifts } from "../program.js";
import { soundsIdentical } from "../sameness.js";
import { saves } from "./harness.js";
function exported(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return null;
    const smf = pieceMidi(r, codeShifts(r)).smf;
    return JSON.stringify({ ...smf, tracks: smf.tracks.map((t) => ({ ...t, name: undefined })) });
}
const keepsVoices = (source, next, options) => soundsIdentical(source, next, undefined, options) && exported(next, options) === exported(source, options);
export function sameCells(source, result, options = {}) {
    const out = [];
    const byText = new Map();
    for (const c of result.cells.values()) {
        if (c.lambda || c.implicit || c.note || c.sink || spansLines(source, c.name))
            continue;
        if (result.outputs.some((o) => o.cell === c.name))
            continue;
        const line = source.split('\n')[declLine(source, c.name)] ?? '';
        const body = line
            .replace(/^&[A-Za-z_][A-Za-z0-9_]*\s*/, '')
            .replace(/\s+#.*$/, '')
            .trim();
        if (!body || /[?|]/.test(body))
            continue;
        byText.set(body, [...(byText.get(body) ?? []), c.name]);
    }
    for (const [body, names] of byText) {
        if (names.length < 2)
            continue;
        const [keep, ...gone] = names;
        const apply = (src) => {
            let next = src;
            for (const g of gone) {
                next = deleteCell(next, g);
                next = next.replace(new RegExp(`&${g}(?![A-Za-z0-9_])`, 'g'), `&${keep}`);
            }
            return next;
        };
        const s = {
            id: `same:${names.join(',')}`,
            tool: 'shorten',
            rule: 'same',
            title: `${names.map((n) => `&${n}`).join(' and ')} are written exactly alike: keep &${keep}, and use it for ${names.length === 2 ? 'both' : 'all'}`,
            before: `${gone.map((g) => `&${g}`).join(' ')} ${body.length > 40 ? body.slice(0, 39) + '…' : body}`,
            after: `&${keep}`,
            apply,
        };
        if ((saves(source, s) ?? 0) <= 0)
            continue;
        if (names.some((n) => result.cells.get(n)?.voice) && !keepsVoices(source, apply(source), options))
            continue;
        out.push(s);
    }
    return out;
}
