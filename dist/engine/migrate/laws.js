import { splitComment } from "../edit.js";
import { BUILT_IN } from "../fills.js";
const words = (code) => code.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
export function laws(source) {
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const ws = words(code.trim());
        const head = ws[0];
        if (!head || !/^&[A-Za-z_][A-Za-z0-9_]*$/.test(head))
            return [];
        const law = ws.find((w) => w.startsWith('law='))?.slice(4);
        const over = ws.find((w) => w.startsWith('over=&'))?.slice(5);
        const fragment = law ? BUILT_IN.get(law) : undefined;
        if (!fragment || !over || ws.includes('from'))
            return [];
        const own = fragment.text.split('\n')[1]?.split(/\s+/) ?? [];
        const rest = ws.slice(1).filter((w) => !w.startsWith('law=') && !w.startsWith('over=') && !(w.startsWith('step=') && own.includes(w)));
        const indent = /^\s*/.exec(code)[0];
        const after = `${indent}${[head, ...rest, 'from', law, over].join(' ')}`;
        const tail = comment ? `${/\s*$/.exec(code)[0] || ' '}${comment.trimStart()}` : '';
        const line = after + tail;
        return [
            {
                id: `law:${i + 1}`,
                tool: 'migrate',
                rule: 'law',
                title: `law=${law} is the old way: the law is a fragment, taken from its clock (decision 085)`,
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
