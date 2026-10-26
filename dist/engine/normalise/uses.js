import { splitComment } from "../edit.js";
import { readUse, writeUse } from "../parser/use.js";
export function uses(source) {
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const use = readUse(code);
        if (!use)
            return [];
        const before = code.trim();
        const after = writeUse(use);
        if (before === after)
            return [];
        return [
            {
                id: `use:${i + 1}`,
                tool: 'normalise',
                rule: 'use',
                title: `${before} is written ${after}`,
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
