import { splitComment } from "../edit.js";
import { readUse, writeUse } from "../parser/use.js";
function forwardOf(text) {
    const lines = text
        .split('\n')
        .map((l) => splitComment(l)[0].trim())
        .filter(Boolean);
    if (lines.length !== 1)
        return null;
    return readUse(lines[0]) ?? null;
}
function forwarded(use, to) {
    if (!use.names)
        return { id: to.id, names: to.names, form: to.names ? 'named' : 'all' };
    if (to.names && use.names.some((n) => !to.names.includes(n)))
        return null;
    return { id: to.id, names: use.names, form: 'named' };
}
export function forwardedUses(source, resolve) {
    if (!resolve)
        return [];
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const use = readUse(code);
        if (!use)
            return [];
        const text = resolve(use.id);
        const to = text === null ? null : forwardOf(text);
        const now = to && forwarded(use, to);
        if (!now)
            return [];
        const before = code.trim();
        const after = writeUse(now);
        return [
            {
                id: `forwarded:${i + 1}`,
                tool: 'normalise',
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
