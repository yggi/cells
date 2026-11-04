import { splitComment } from "../edit.js";
import { readFrom, readUse } from "../parser/use.js";
import { RENAMED_IDS } from "../renamed.js";
function idOf(code) {
    const use = readUse(code);
    if (use)
        return use.id;
    const from = readFrom(code);
    return from?.kind === 'use' ? from.id : null;
}
export function renamedIds(source, resolve) {
    if (!resolve)
        return [];
    return source.split('\n').flatMap((raw, i) => {
        const [code] = splitComment(raw);
        const id = idOf(code);
        const word = id === null ? undefined : RENAMED_IDS.get(id);
        if (word === undefined || resolve(id) === null || resolve(id) !== resolve(word))
            return [];
        const quoted = JSON.stringify(id);
        const at = code.indexOf(quoted);
        if (at < 0)
            return [];
        const bare = /^\s*use\s+"/.test(code) ? JSON.stringify(word) : word;
        const before = code.trim();
        const after = `${code.slice(0, at)}${bare}${code.slice(at + quoted.length)}`;
        return [
            {
                id: `renamed:${i + 1}`,
                tool: 'migrate',
                rule: 'renamed',
                title: `${quoted} is ${word} now: ${after.trim()}`,
                before,
                after: after.trim(),
                apply: (src) => src
                    .split('\n')
                    .map((line, j) => (j === i && line === raw ? `${after}${raw.slice(code.length)}` : line))
                    .join('\n'),
            },
        ];
    });
}
