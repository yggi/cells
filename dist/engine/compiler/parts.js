import { parse } from "../parser/index.js";
import { INTERFACE_NAMES } from "../program.js";
export function restingParts(parsed) {
    const declared = new Set(parsed.cells.map((c) => c.name));
    const rests = new Map();
    const diagnostics = [];
    for (const d of parsed.cells) {
        const part = d.params.play ?? d.params.trigger;
        if (typeof part !== 'string' || d.braid.kind === 'blank' || declared.has(part) || rests.has(part))
            continue;
        const rest = parse(`&${part} step=1m ~`).cells[0];
        if (!rest)
            continue;
        const span = d.paramSpans.play ?? d.paramSpans.trigger ?? d.span;
        rests.set(part, { ...rest, span });
        diagnostics.push({ severity: 'info', message: `&${d.name} plays &${part}, which no line writes: it rests`, span });
    }
    if (!rests.size)
        return { parsed, rested: new Map() };
    return {
        parsed: { ...parsed, cells: [...parsed.cells, ...rests.values()], diagnostics: [...parsed.diagnostics, ...diagnostics] },
        rested: new Map([...rests].map(([name, d]) => [name, d.span])),
    };
}
const OFFERED = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));
export function unplayed(ctx, decls, cells, outputs, clocks) {
    if (![...decls.values()].some((d) => d.gate))
        return;
    const named = new Set();
    const visit = (x, seen) => {
        if (typeof x === 'string') {
            named.add(x);
            return;
        }
        if (!x || typeof x !== 'object' || seen.has(x))
            return;
        seen.add(x);
        if (x instanceof Map)
            for (const [k, v] of x)
                (visit(k, seen), visit(v, seen));
        else if (x instanceof Set)
            for (const v of x)
                visit(v, seen);
        else
            for (const v of Object.values(x))
                visit(v, seen);
    };
    for (const c of cells.values()) {
        const { name: _, ...rest } = c;
        visit(rest, new Set());
    }
    visit(outputs, new Set());
    for (const d of decls.values())
        if (d.gate)
            visit(d.gate, new Set());
    for (const c of cells.values())
        if (c.clock && c.units.length && !named.has(c.name) && !clocks.has(c.name) && !ctx.broken.has(c.name) && !OFFERED.has(c.name))
            ctx.info(`&${c.name} is written and nothing plays or reads it: it is silent (a part no performer plays)`, c.span);
}
