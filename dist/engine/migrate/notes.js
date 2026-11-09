import { setAttr } from "../edit.js";
import { gmDrumNote } from "../midi.js";
import { parse } from "../parser/index.js";
function unwritten(source, result) {
    const own = new Map(parse(source, { old: true }).cells.map((d) => [d.name, d]));
    const out = new Map();
    for (const c of result.cells.values()) {
        if (!c.kit)
            continue;
        for (const u of c.units) {
            if (u.atom.kind !== 'ref' || out.has(u.atom.name))
                continue;
            const d = own.get(u.atom.name);
            const gm = gmDrumNote(u.atom.name);
            if (d && gm !== null && d.drumNote === undefined && result.cells.get(u.atom.name)?.voice)
                out.set(u.atom.name, gm);
        }
    }
    return [...out];
}
export function notes(source, result) {
    const members = unwritten(source, result);
    if (!members.length)
        return [];
    const written = members.map(([name, note]) => `&${name} note=${note}`).join(', ');
    return [
        {
            id: `notes:${members.map(([n]) => n).join(',')}`,
            tool: 'migrate',
            rule: 'notes',
            title: `A drum's note is its note=, not its name: ${written} (decision 075)`,
            before: members.map(([name]) => `&${name}`).join(', '),
            after: written,
            apply: (src) => members.reduce((text, [name, note]) => setAttr(text, name, 'note', String(note)), src),
        },
    ];
}
