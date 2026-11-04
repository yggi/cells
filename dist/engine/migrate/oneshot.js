import { splitComment } from "../edit.js";
const BARE = /(^|\s)oneshot(?=\s|$)/;
const outsideQuotes = (code) => code.replace(/"[^"]*"/g, (q) => ' '.repeat(q.length));
export function oneshots(source) {
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const m = BARE.exec(outsideQuotes(code));
        if (!m || !/^\s*&/.test(code))
            return [];
        const at = m.index + m[1].length;
        const after = `${code.slice(0, at)}oneshot=1${code.slice(at + 'oneshot'.length)}`;
        const line = after + comment;
        return [
            {
                id: `oneshot:${i + 1}`,
                tool: 'migrate',
                rule: 'oneshot',
                title: `oneshot is a voice's parameter: oneshot=1 (decision 068)`,
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
