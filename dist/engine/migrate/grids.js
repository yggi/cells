import { attrsOf, declLine, setAttr } from "../edit.js";
export function grids(source, result, _options = {}) {
    const out = [];
    for (const c of result.cells.values()) {
        if (!c.root || c.map?.kind !== 'edo')
            continue;
        const a = attrsOf(source, c.name);
        const cycle = a.get('cycle');
        const map = a.get('map');
        if (!cycle || !/^[1-9][0-9]*$/.test(cycle) || !map || declLine(source, c.name) < 0)
            continue;
        const sized = map === 'edo' ? `edo(${cycle})` : /^ed\(([^,)]+)\)$/.test(map) ? `ed(${cycle}, ${map.slice(3, -1)})` : null;
        if (!sized)
            continue;
        const apply = (s) => setAttr(setAttr(s, c.name, 'map', sized), c.name, 'cycle', null);
        const at = declLine(source, c.name);
        out.push({
            id: `grid:${c.name}`,
            tool: 'migrate',
            rule: 'grid',
            title: `&${c.name}'s size is its map's: map=${sized} for cycle=${cycle} map=${map} (decision 040)`,
            before: source.split('\n')[at].trim(),
            after: apply(source).split('\n')[at].trim(),
            apply,
        });
    }
    return out;
}
