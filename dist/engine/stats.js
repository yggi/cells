export const CELL_KINDS = ['line', 'table', 'meter', 'voice', 'envelope', 'gate', 'mix', 'card', 'note'];
export function spread(xs) {
    if (!xs.length)
        return { min: 0, max: 0, mean: 0, median: 0 };
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return {
        min: s[0],
        max: s[s.length - 1],
        mean: s.reduce((a, b) => a + b, 0) / s.length,
        median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
    };
}
function kindOf(c, meters, tables) {
    if (c.sink || c.map?.kind === 'midi')
        return 'card';
    if (c.mix)
        return 'mix';
    if (c.gate)
        return 'gate';
    if (c.voice)
        return 'voice';
    if (meters.has(c.name))
        return 'meter';
    if (tables.has(c.name))
        return 'table';
    if (c.map && ['adsr', 'amp', 'lin', 'db'].includes(c.map.kind))
        return 'envelope';
    if (c.note)
        return 'note';
    return 'line';
}
export function pieceStats(result, graph, text) {
    const written = [...result.cells.values()].filter((c) => !c.implicit && c.name !== result.builtinCard);
    const meters = new Set(graph.nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.cell.name] : [])));
    const tables = new Set(written.flatMap((c) => (c.over ? [c.over] : [])));
    const kinds = Object.fromEntries(CELL_KINDS.map((k) => [k, 0]));
    for (const c of written)
        kinds[kindOf(c, meters, tables)]++;
    const braids = written.filter((c) => c.braid === 'list' && !c.mix);
    const perCell = braids.map((c) => c.units.length);
    const splicedIn = written.flatMap((c) => [...c.children]);
    return {
        cells: written.length,
        unnamed: written.filter((c) => c.lambda !== null).length,
        kinds,
        wires: graph.edges.length,
        nets: graph.nets.length,
        splices: splicedIn.reduce((n, [, k]) => n + k, 0),
        spliced: new Set(splicedIn.map(([name]) => name)).size,
        steps: perCell.reduce((a, b) => a + b, 0),
        perCell: spread(perCell),
        chars: text.length,
        lines: text.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|#)/.test(l)).length,
    };
}
