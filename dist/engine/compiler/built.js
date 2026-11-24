import { NUMBER_PLACES } from "../parser/numbers.js";
import { constantOf } from "../valuesum.js";
export function builtProblem(read, c) {
    return c.step
        ? `&${c.name} is read as ${read}: a stepped one is not yet a form; write one number (&${c.name} 3)`
        : `&${c.name} is read as ${read}: a cell that is one number, filled as the piece is built (&${c.name} 3)`;
}
export function builtNumber(ctx, decls, ref, read) {
    const c = decls.get(ref.name);
    if (!c) {
        ctx.unknownCell(ref.name, ref.span);
        return null;
    }
    if (c.fill && c.braid.kind === 'blank')
        return null;
    const value = constantOf(decls, c.name);
    if (value === null) {
        ctx.error(builtProblem(read, c), c.span);
        return null;
    }
    return { value, cell: c };
}
export function placeProblem(place, value) {
    if (place.whole && !place.rounds && !Number.isInteger(value))
        return `it takes a whole number, not ${value}`;
    if ((place.min !== undefined && value < place.min) || (place.max !== undefined && value > place.max))
        return `it takes ${place.min ?? 'any'} to ${place.max ?? 'any'}, not ${value}`;
    return null;
}
const FILLING = new Map(Object.values(NUMBER_PLACES).flatMap((p) => (p.fills ? [[p.fills.field, p]] : [])));
export function builtHoles(ctx, decls) {
    for (const [name, d] of decls) {
        if (!d.holes)
            continue;
        let next = d;
        const reads = [];
        for (const h of d.holes) {
            const got = builtNumber(ctx, decls, h.ref, `${h.field}=`);
            if (!got)
                continue;
            const place = FILLING.get(h.field);
            const value = place.rounds || place.whole ? Math.round(got.value) : got.value;
            const problem = placeProblem(place, got.value);
            if (problem) {
                ctx.error(`&${h.ref.name} is read as ${h.field}=: ${problem} (${place.form})`, h.ref.span);
                continue;
            }
            next = {
                ...next,
                [h.field]: value,
                paramSpans: { ...next.paramSpans, ...(h.field === 'shift' || h.field === 'stride' || h.field === 'cycle' ? { [h.field]: h.ref.span } : {}) },
            };
            reads.push(h.ref.name);
        }
        if (next !== d)
            decls.set(name, { ...next, valueReads: [...(d.valueReads ?? []), ...reads] });
    }
}
