import { setAttr } from "../edit.js";
import { parse } from "../parser/index.js";
import { readerByName, readerOf } from "../perform/feel.js";
function given(source, result) {
    const own = new Set(parse(source, { old: true }).cells.map((d) => d.name));
    const was = readerByName(result);
    const now = readerOf(result);
    const roleCells = new Map(result.performers.map((p) => [p.name, p.role]));
    const out = new Map();
    const add = (line, key, value) => {
        if (line !== undefined && own.has(line) && result.cells.get(line)?.params[key] === undefined && !out.has(`${line} ${key}`))
            out.set(`${line} ${key}`, [line, key, value]);
    };
    for (const o of result.outputs) {
        const r = was(o.id);
        if (!r || JSON.stringify(now(o.id)) === JSON.stringify(r))
            continue;
        const [, second, third] = o.id.split(':');
        if (r.role !== undefined) {
            add(third, 'role', r.role);
            continue;
        }
        const gate = [...o.via, ...o.through].find((name) => roleCells.get(name) === r.part);
        if (gate !== undefined)
            add(roleCells.get(gate), 'part', r.part);
        else
            add(/^[A-Za-z_][A-Za-z0-9_]*/.exec(second ?? '')?.[0], 'part', r.part);
    }
    return [...out.values()];
}
export function parts(source, result) {
    const lines = given(source, result);
    if (!lines.length)
        return [];
    const written = lines.map(([line, key, value]) => `&${line} ${key}=${value}`).join(', ');
    return [
        {
            id: `parts:${lines.map(([l, k]) => `${l}.${k}`).join(',')}`,
            tool: 'migrate',
            rule: 'parts',
            title: `The default performer reads a part and a drum role as values, not names: ${written} (decision 075)`,
            before: lines.map(([line]) => `&${line}`).join(', '),
            after: written,
            apply: (src) => lines.reduce((text, [line, key, value]) => setAttr(text, line, key, value), src),
        },
    ];
}
