import { splitComment } from "../edit.js";
const WORD = /(swing=[^\s]*?[0-9)]):pairs(?=[,\s]|$)/g;
const outsideQuotes = (code) => code.replace(/"[^"]*"/g, (q) => ' '.repeat(q.length));
export function pairs(source) {
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        if (!/^\s*&/.test(code))
            return [];
        const masked = outsideQuotes(code);
        let after = code;
        const found = [...masked.matchAll(WORD)].reverse();
        if (!found.length)
            return [];
        for (const m of found)
            after = after.slice(0, m.index + m[1].length) + after.slice(m.index + m[0].length);
        const line = after + comment;
        return [
            {
                id: `pairs:${i + 1}`,
                tool: 'migrate',
                rule: 'pairs',
                title: `a swing leans a level's pairs alone, its groups of three straight: :pairs says nothing more (decision 071)`,
                before: code.trim(),
                after: after.trim(),
                apply: (src) => src
                    .split('\n')
                    .map((l, j) => (j === i && l === raw ? line : l))
                    .join('\n'),
            },
        ];
    });
}
