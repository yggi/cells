import { attrsOf, declLine, setAttr } from "../edit.js";
import { parse } from "../parser/index.js";
export function laps(source, result) {
    const decls = new Map(parse(source).cells.map((d) => [d.name, d]));
    const out = [];
    for (const c of result.cells.values()) {
        const d = decls.get(c.name);
        const own = c.cycle;
        if (!d || d.step?.kind !== 'driven' || d.cycle === null || d.map || own < 2 || d.cycle < own || d.cycle % own !== 0)
            continue;
        if (attrsOf(source, c.name).get('cycle') !== String(d.cycle) || declLine(source, c.name) < 0)
            continue;
        const n = d.cycle / own;
        const apply = (s) => setAttr(s, c.name, 'cycle', n === 1 ? null : String(n));
        const at = declLine(source, c.name);
        out.push({
            id: `laps:${c.name}`,
            tool: 'migrate',
            rule: 'laps',
            title: `&${c.name}'s cycle=${d.cycle} counted steps: ${n === 1 ? 'one lap of its ' + own + ', the default' : `cycle=${n}, ${n} laps of its ${own}`} (decision 040)`,
            before: source.split('\n')[at].trim(),
            after: apply(source).split('\n')[at].trim(),
            apply,
            exact: true,
        });
    }
    return out;
}
