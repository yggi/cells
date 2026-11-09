import { splitComment } from "../edit.js";
import { isWordId, leftOf, readFrom } from "../parser/use.js";
import { signatureOf } from "../use.js";
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const refersTo = (name) => new RegExp(`&${name}(?![A-Za-z0-9_])`);
export function narrowestFroms(source, resolve) {
    if (!resolve)
        return [];
    const lines = source.split('\n');
    const codes = lines.map((l) => splitComment(l)[0]);
    const own = new Set(codes.flatMap((c) => (readFrom(c.trim()) === undefined ? [HEAD.exec(c)?.[1] ?? ''] : [])).filter(Boolean));
    return lines.flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const f = readFrom(code.trim());
        if (!f || f.kind !== 'use' || f.args || f.main || f.head.length)
            return [];
        const text = resolve(f.id);
        if (text === null || signatureOf(text))
            return [];
        const heads = [...new Set(text.split('\n').flatMap((l) => HEAD.exec(splitComment(l)[0])?.[1] ?? []))];
        const asked = f.names?.map((n, k) => [n, f.takes[k]]) ?? heads.map((h) => [`&${h}`, `&${h}`]);
        const read = (h) => !own.has(h) && codes.some((c, j) => j !== i && refersTo(h).test(c));
        const used = asked.filter(([n]) => read(n.slice(1)));
        if (!used.length)
            return [];
        const before = code.trim();
        const after = `${leftOf(used.map(([n]) => n), used.map(([, t]) => t))} from ${isWordId(f.id) ? f.id : JSON.stringify(f.id)}`;
        if (after === before)
            return [];
        return [
            {
                id: `narrowest:${i + 1}`,
                tool: 'normalise',
                rule: 'narrowest',
                title: `${before} is written ${after}: the cells of it the piece uses`,
                before,
                after,
                apply: (src) => src
                    .split('\n')
                    .map((line, j) => (j === i && line === raw ? `${/^\s*/.exec(code)[0]}${after}${comment ? `${/\s*$/.exec(code)[0]}${comment}` : ''}` : line))
                    .join('\n'),
            },
        ];
    });
}
