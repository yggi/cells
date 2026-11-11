import { splitComment } from "../edit.js";
import { leftOf, readFrom } from "../parser/use.js";
import { MOVED } from "../renamed.js";
import { partsOf } from "../use.js";
export function movedIds(source, resolve) {
    if (!resolve)
        return [];
    return source.split('\n').flatMap((raw, i) => {
        const [code] = splitComment(raw);
        const from = readFrom(code.trim());
        const moved = from?.kind === 'use' ? MOVED.get(from.id) : undefined;
        if (!from || from.kind !== 'use' || !moved || !from.names)
            return [];
        const document = resolve(moved.document);
        if (document === null || !partsOf(document).some((p) => p.includes(moved.head)))
            return [];
        const takes = from.names.map((n, k) => (k === 0 ? `&${moved.head}` : (from.takes?.[k] ?? n)));
        const at = new RegExp(`\\sfrom\\s+(?:"${from.id}"|${from.id})(?=[\\s(]|$)`).exec(code);
        if (!at)
            return [];
        const lead = code.slice(0, code.length - code.trimStart().length);
        const after = `${lead}${leftOf(from.names, takes)} from ${moved.document}${code.slice(at.index + at[0].length)}`.trimEnd();
        const before = code.trim();
        return [
            {
                id: `moved:${i + 1}`,
                tool: 'migrate',
                rule: 'moved',
                title: `${JSON.stringify(from.id)} is a part of ${moved.document} now: ${after.trim()}`,
                before,
                after: after.trim(),
                apply: (src) => src
                    .split('\n')
                    .map((line, j) => (j === i && line === raw ? `${after}${raw.slice(code.trimEnd().length)}` : line))
                    .join('\n'),
            },
        ];
    });
}
