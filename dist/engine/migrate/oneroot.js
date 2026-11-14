import { attrsOf, declLine, setAttr } from "../edit.js";
import { derivedTap } from "../compiler/clocks.js";
import { parse } from "../parser/index.js";
export function oneRoot(source, result) {
    const decls = new Map(parse(source).cells.map((d) => [d.name, d]));
    const roots = (result.meters ?? []).filter((m) => decls.has(m) && !decls.get(m).step?.whole);
    const root = roots[0] === result.mainMeter ? result.cells.get(roots[0]) : undefined;
    if (!root?.meter || !result.clocks.has(root.name))
        return [];
    const out = [];
    for (const name of roots.slice(1)) {
        const c = result.cells.get(name);
        const written = attrsOf(source, name).get('step');
        const at = declLine(source, name);
        if (!c || written === undefined || at < 0 || /free\(/.test(written) || !result.clocks.has(name))
            continue;
        const tap = derivedTap({ meter: root.meter, perSecond: result.clocks.get(root.name).perSecond }, { beat: c.beat, scan: !!c.scan, perSecond: result.clocks.get(name).perSecond });
        if (!tap)
            continue;
        const apply = (s) => setAttr(s, name, 'step', tap);
        out.push({
            id: `one root:${name}`,
            tool: 'migrate',
            rule: 'one root',
            title: `&${name} is a second meter with a tempo of its own (step=${written}): derived from &${root.name}, step=${tap} (decision 093)`,
            before: source.split('\n')[at].trim(),
            after: apply(source).split('\n')[at].trim(),
            apply,
        });
    }
    return out;
}
