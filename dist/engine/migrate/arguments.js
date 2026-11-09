import { splitComment } from "../edit.js";
import { readFrom, topTokens } from "../parser/use.js";
import { BOUND_BY_NAME } from "../byname.js";
import { signatureOf } from "../use.js";
export function withArgument(code, name, value) {
    const tokens = topTokens(code);
    const at = tokens.findIndex((t) => t.text === 'from');
    const id = tokens[at + 1];
    if (at < 0 || !id)
        return null;
    const open = id.text.indexOf('(');
    const list = open >= 0 ? { at: id.at, text: id.text } : tokens[at + 2]?.text.startsWith('(') ? tokens[at + 2] : null;
    if (!list)
        return `${code.slice(0, id.at + id.text.length)}(${name}=${value})${code.slice(id.at + id.text.length)}`;
    const close = list.at + list.text.length - 1;
    const empty = /\(\s*$/.test(code.slice(0, close));
    return `${code.slice(0, close)}${empty ? '' : ', '}${name}=${value}${code.slice(close)}`;
}
export function argumentsByName(source, result, resolve) {
    if (!resolve)
        return [];
    const defines = new Set(result.cells.keys());
    const own = new Set(source.split('\n').flatMap((l) => {
        const code = splitComment(l)[0];
        return readFrom(code.trim()) === undefined ? (/^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/.exec(code)?.[1] ?? []) : [];
    }));
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const f = readFrom(code.trim());
        if (f?.kind !== 'use')
            return [];
        const text = resolve(f.id);
        const signature = text === null ? null : signatureOf(text);
        const missing = (BOUND_BY_NAME.get(f.id) ?? []).filter((p) => signature?.optional.includes(`&${p}`) && !f.args?.some((a) => a.name === p) && own.has(p) && defines.has(p));
        if (!missing.length)
            return [];
        let after = code.trimEnd();
        for (const p of missing)
            after = after === null ? null : withArgument(after, p, `&${p}`);
        if (after === null)
            return [];
        const before = code.trim();
        const written = after.trim();
        return [
            {
                id: `arguments:${i + 1}`,
                tool: 'migrate',
                rule: 'arguments',
                title: `${JSON.stringify(f.id)} reads ${missing.map((p) => `&${p}`).join(', ')} by name no longer: ${written}`,
                before,
                after: written,
                apply: (src) => src
                    .split('\n')
                    .map((line, j) => (j === i && line === raw ? `${after}${code.slice(code.trimEnd().length)}${comment}` : line))
                    .join('\n'),
            },
        ];
    });
}
