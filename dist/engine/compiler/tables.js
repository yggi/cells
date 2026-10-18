import { ROOT } from "../program.js";
import { scan as scanOf } from "../../theory/modes.js";
import { leaves } from "../subseq.js";
import { waveValues } from "../parser/generators.js";
export const IMPLICIT = { line: 1, col: 1, len: 1 };
export const isRootDecl = (d) => d.over === null && ((d.braid.kind === 'blank' && (d.name === ROOT || d.map?.kind === 'edo')) || d.map?.kind === 'ratios');
export const tableOf = (d) => (isRootDecl(d) ? null : (d.over?.name ?? ROOT));
export const gridSteps = (d) => (d.map?.kind === 'ratios' && d.braid.kind === 'list' ? Math.max(1, d.braid.tokens.length - 1) : (d.cycle ?? 12));
export const lengthOf = (decls, name, guard = 0) => {
    const d = decls.get(name);
    if (!d || guard > 64)
        return 12;
    if (tableOf(d) === null)
        return gridSteps(d);
    const b = d.braid;
    if (b.kind === 'scan')
        return b.steps.length;
    if (b.kind === 'wave')
        return b.n;
    if (b.kind === 'list')
        return b.tokens.reduce((s, t) => s + leaves(t.atom).reduce((n, a) => n + (a.kind === 'note' ? 1 : a.kind === 'chord' ? a.notes.length : 0), 0), 0);
    return lengthOf(decls, tableOf(d), guard + 1);
};
export const unitsOf = (decls, d) => {
    const plain = (atom) => ({ atom, repeat: 1, subdivide: 1, elongate: 1 });
    const note = (value) => plain({ kind: 'note', value, alter: 0 });
    const b = d.braid;
    const o = tableOf(d);
    if (o === null)
        return Array.from({ length: gridSteps(d) }, (_, i) => note(i));
    if (b.kind === 'list')
        return b.tokens.map(({ atom, repeat, subdivide, elongate, chance, level }) => ({
            atom,
            repeat,
            subdivide,
            elongate,
            ...(chance !== undefined ? { chance } : {}),
            ...(level !== undefined ? { level } : {}),
        }));
    if (b.kind === 'scan')
        return scanOf(b.steps).positions.map(note);
    if (b.kind === 'wave')
        return waveValues(b.shape, b.n).map(note);
    return Array.from({ length: lengthOf(decls, o) }, (_, i) => note(i));
};
