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
        if (/^\s*use\s+"/.test(code)) {
            const at = code.indexOf(quoted);
            if (at < 0)
                return [];
            return [rewrite(i, raw, code, `${code.slice(0, at)}${JSON.stringify(word)}${code.slice(at + quoted.length)}`, id, word)];
        }
        const m = new RegExp(`(\\sfrom\\s+)(${escape(quoted)}|${escape(id)})(?=[\\s(]|$)`).exec(code);
        if (!m)
            return [];
        const end = m.index + m[0].length;
        const joined = word.endsWith(')') && code[end] === '(' ? `${word.slice(0, -1)}, ${code.slice(end + 1)}` : `${word}${code.slice(end)}`;
        return [rewrite(i, raw, code, `${code.slice(0, m.index)}${m[1]}${joined}`, id, word)];
    });
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rewrite(i, raw, code, after, id, word) {
    const before = code.trim();
    return {
        id: `renamed:${i + 1}`,
        tool: 'migrate',
        rule: 'renamed',
        title: `${JSON.stringify(id)} is ${word} now: ${after.trim()}`,
        before,
        after: after.trim(),
        apply: (src) => src
            .split('\n')
            .map((line, j) => (j === i && line === raw ? `${after}${raw.slice(code.length)}` : line))
            .join('\n'),
    };
}
