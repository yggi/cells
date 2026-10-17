import { declLine, deleteCell, spansLines } from "../edit.js";
import { measured } from "./harness.js";
export function sameCells(source, result) {
    const out = [];
    const byText = new Map();
    for (const c of result.cells.values()) {
        if (c.lambda || c.implicit || c.voice || c.note || c.sink || spansLines(source, c.name))
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
        const s = measured(source, {
            id: `same:${names.join(',')}`,
            kind: 'same',
            title: `${names.map((n) => `&${n}`).join(' and ')} are written exactly alike: keep &${keep}, and use it for both`,
            before: `${gone.map((g) => `&${g}`).join(' ')} ${body.length > 40 ? body.slice(0, 39) + '…' : body}`,
            after: `&${keep}`,
            apply,
        });
        if (s)
            out.push(s);
    }
    return out;
}
