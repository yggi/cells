import { splitComment } from "../edit.js";
import { isWordId, leftOf, readFrom } from "../parser/use.js";
const taking = (code) => {
    const f = readFrom(code.trim());
    return f?.kind === 'use' && !f.head.length && !f.args && f.main === null ? f : null;
};
function forwardOf(text) {
    const lines = text
        .split('\n')
        .map((l) => splitComment(l)[0].trim())
        .filter(Boolean);
    const to = lines.length === 1 ? taking(lines[0]) : null;
    return to && to.names?.every((n, i) => n === to.takes[i]) !== false ? to : null;
}
function forwarded(use, to) {
    if (!use.names)
        return { names: to.names, takes: to.takes };
    if (to.names && use.takes.some((n) => !to.names.includes(n)))
        return undefined;
    return { names: use.names, takes: use.takes };
}
const written = (id, { names, takes }) => `${leftOf(names, takes)} from ${isWordId(id) ? id : JSON.stringify(id)}`;
export function forwardedUses(source, resolve) {
    if (!resolve)
        return [];
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const use = taking(code);
        if (!use)
            return [];
        const text = resolve(use.id);
        const to = text === null ? null : forwardOf(text);
        const names = to ? forwarded(use, to) : undefined;
        if (!to || names === undefined)
            return [];
        const before = code.trim();
        const after = written(to.id, names);
        return [
            {
                id: `forwarded:${i + 1}`,
                tool: 'migrate',
                rule: 'forwarded',
                title: `${before} takes what ${JSON.stringify(use.id)} forwards: ${after}`,
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
