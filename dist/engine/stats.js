import { kindsOf } from "./kinds.js";
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
const COUNTED = {
    note: 'note',
    card: 'card',
    'midi card': 'card',
    gate: 'gate',
    role: 'line',
    style: 'line',
    scope: 'line',
    fill: 'line',
    tape: 'line',
    head: 'line',
    sum: 'line',
    phrase: 'mix',
    mix: 'mix',
    resonator: 'voice',
    wave: 'voice',
    voice: 'voice',
    kit: 'line',
    band: 'line',
    meter: 'meter',
    tempo: 'line',
    groove: 'line',
    grid: 'line',
    envelope: 'envelope',
    ramp: 'envelope',
    volume: 'envelope',
    sections: 'line',
    selector: 'line',
    number: 'line',
    line: 'line',
    table: 'line',
    text: 'line',
    blank: 'line',
    steps: 'line',
};
const kindOf = (kind, readThrough) => (COUNTED[kind] === 'line' && readThrough ? 'table' : COUNTED[kind]);
export function pieceStats(result, graph, text) {
    const written = [...result.cells.values()].filter((c) => !c.implicit && c.name !== result.builtinCard);
    const tables = new Set(written.flatMap((c) => (c.over ? [c.over] : [])));
    const kind = kindsOf(result);
    const kinds = Object.fromEntries(CELL_KINDS.map((k) => [k, 0]));
    for (const c of written)
        kinds[kindOf(kind(c.name), tables.has(c.name))]++;
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
