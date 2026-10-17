export function tapped(outputs, cells, taps) {
    if (!taps.size)
        return [...outputs];
    const readers = (table) => [...cells.values()].filter((c) => c.over === table && c.clock);
    return outputs.map((o) => {
        let c = cells.get(o.cell);
        for (let guard = 0; c?.step && guard < 32; guard++) {
            const tap = c.step.driver;
            const table = taps.get(tap);
            if (table) {
                const entry = cells.get(table).units.findIndex((u) => u.atom.kind === 'ref' && u.atom.name === tap);
                const select = readers(table).map((s) => ({ cell: s.name, entry, part: tap }));
                const via = [...new Set([...o.via, ...select.map((x) => x.cell), table, tap])];
                return select.length ? { ...o, via, select: [...o.select, ...select] } : o;
            }
            c = cells.get(tap);
        }
        return o;
    });
}
