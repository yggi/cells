export function sectioned(outputs, cells, sections) {
    if (!sections.size)
        return [...outputs];
    const selectors = (table) => [...cells.values()].filter((c) => c.over === table && c.clock);
    return outputs.map((o) => {
        let c = cells.get(o.cell);
        for (let guard = 0; c?.step && guard < 32; guard++) {
            const section = c.step.driver;
            const table = sections.get(section);
            if (table) {
                const entry = cells.get(table).units.findIndex((u) => u.atom.kind === 'ref' && u.atom.name === section);
                const select = selectors(table).map((s) => ({ cell: s.name, entry, part: section }));
                const via = [...new Set([...o.via, ...select.map((x) => x.cell), table, section])];
                return select.length ? { ...o, via, select: [...o.select, ...select] } : o;
            }
            c = cells.get(section);
        }
        return o;
    });
}
