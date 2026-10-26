import { parse } from "../parser/index.js";
import { MAIN_KEY } from "../program.js";
export function mainKey(source, result) {
    const key = result.mainKey;
    if (!key)
        return [];
    return parse(source).cells.flatMap((d) => {
        if (d.over?.name !== MAIN_KEY)
            return [];
        const { line, col } = d.over.span;
        const after = `over=&${key}`;
        return [
            {
                id: `main key:${line}:${col}`,
                tool: 'normalise',
                rule: 'main key',
                title: `over=key is written ${after}, the key it reads`,
                before: 'over=key',
                after,
                apply: (src) => src
                    .split('\n')
                    .map((text, i) => i === line - 1 && text.slice(col - 1 - 'over='.length, col - 1 + 3) === 'over=key' ? `${text.slice(0, col - 1)}&${key}${text.slice(col + 2)}` : text)
                    .join('\n'),
            },
        ];
    });
}
