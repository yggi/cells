import { braidReadsOf, otherReadsOf } from "../engine/compiler/builtin.js";
import { parse } from "../engine/parser/index.js";
import { tapPositions } from "../engine/meter.js";
import { expansion, hasFrom, signatureOf } from "../engine/use.js";
import { isValueLine } from "../engine/valuesum.js";
const WHOLE = 1e-9;
const isWhole = (x) => Math.abs(x - Math.round(x)) < WHOLE;
export const lapMeets = (need, taps) => need.steps > 0 && isWhole((taps * need.rate) / need.steps);
function fewestBar(need) {
    for (let k = 1; k <= 4096; k++)
        if (lapMeets(need, k * need.bars))
            return k;
    return 0;
}
export const meterMeets = (need, meter, tap) => lapMeets(need, tapPositions(meter, tap, need.bars).length);
const splicesOnly = (d, result) => {
    const line = (name) => {
        const c = result.cells.get(name);
        return !!c && !c.voice && !c.kit && !c.mix && !c.gate;
    };
    return (d.cycle == null &&
        d.braid.kind === 'list' &&
        d.braid.tokens.some((t) => t.atom.kind === 'ref') &&
        d.braid.tokens.every((t) => (t.atom.kind === 'ref' && line(t.atom.name)) || t.atom.kind === 'rest'));
};
export function clockNeeds(text, result, of, own) {
    const decls = parse(text).cells;
    const mine = own ?? new Set(decls.map((d) => d.name));
    const mainIsMine = result.mainMeter !== undefined && mine.has(result.mainMeter);
    return decls.flatMap((d) => {
        const step = d.step;
        if (step?.kind !== 'tap' || (of && !of.has(d.name)) || splicesOnly(d, result))
            return [];
        if (step.meter ? mine.has(step.meter.name) : mainIsMine)
            return [];
        const cell = result.cells.get(d.name);
        if (!cell || cell.voice || cell.steps <= 0)
            return [];
        const bars = Math.max(1, Math.round(d.cycle ?? 1));
        const base = { cell: `&${d.name}`, meter: step.meter ? `&${step.meter.name}` : null, tap: step.tap.written, bars, steps: cell.steps, rate: step.ratio };
        return [{ need: { ...base, bar: fewestBar(base) }, tap: step.tap }];
    });
}
const atomLineReads = (a) => a.kind === 'ref' ? (a.pick || a.shift || a.transpose || a.values ? [a.name] : []) : a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => atomLineReads(t.atom))) : [];
export const readAsLine = (decls) => new Set(decls.flatMap((d) => (d.braid.kind === 'list' ? d.braid.tokens.flatMap((t) => atomLineReads(t.atom)) : [])).map((n) => `&${n}`));
const addedToValue = (e, value) => {
    if (e.k === 'prod')
        return e.factors.flatMap((f) => addedToValue(f, value));
    if (e.k !== 'sum')
        return [];
    const refs = (x) => (x.k === 'ref' ? [x.ref.name] : x.k === 'prod' ? x.factors.flatMap(refs) : x.k === 'sum' ? x.items.flatMap((i) => refs(i.e)) : []);
    const isValue = (x) => x.k === 'num' || (x.k === 'ref' && value(x.ref.name)) || (x.k === 'prod' && x.factors.every((f) => f.k === 'num' || (f.k === 'ref' && value(f.ref.name))));
    return e.items.some((i) => isValue(i.e)) ? e.items.flatMap((i) => refs(i.e)) : e.items.flatMap((i) => addedToValue(i.e, value));
};
const atomAdded = (a, value) => a.kind === 'mix' ? a.exprs.flatMap((e) => addedToValue(e, value)) : a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => atomAdded(t.atom, value))) : [];
export const readAsAdded = (decls) => {
    const byName = new Map(decls.map((d) => [d.name, d]));
    const value = (name) => byName.has(name) && isValueLine(name, byName);
    return new Set(decls.flatMap((d) => (d.braid.kind === 'list' ? d.braid.tokens.flatMap((t) => atomAdded(t.atom, value)) : [])).map((n) => `&${n}`));
};
export function readOnlyAsSound(decls) {
    const inBraid = new Set(decls.flatMap((d) => braidReadsOf(d)).map((n) => `&${n}`));
    const elsewhere = new Set([...decls.flatMap((d) => otherReadsOf(d)).map((n) => `&${n}`), ...readAsLine(decls), ...readAsAdded(decls)]);
    return (name) => inBraid.has(name) && !elsewhere.has(name);
}
export const linesRead = (text, resolve) => (resolve && hasFrom(text) ? expansion(text, { resolve }).text : text);
export const standIn = (name) => `${name} s=white`;
export function holesOf(text, compiled, resolve) {
    const read = linesRead(text, resolve);
    const all = parse(read).cells;
    const decls = all.filter((d) => !d.lambda);
    const result = compiled(text);
    const unknown = result.unknown.map((u) => `&${u.name}`);
    const sound = readOnlyAsSound(all);
    const found = new Set(unknown.filter(sound));
    const declared = new Set(all.map((d) => `&${d.name}`));
    if (found.size)
        for (const n of new Set(decls.flatMap((d) => braidReadsOf(d)).map((m) => `&${m}`)))
            if (sound(n) && !declared.has(n))
                found.add(n);
    let last = result;
    for (;;) {
        if (!found.size)
            break;
        last = compiled(`${text}\n${[...found].map(standIn).join('\n')}`);
        const more = last.unknown.map((u) => `&${u.name}`).filter((n) => sound(n) && !found.has(n));
        if (!more.length)
            break;
        more.forEach((n) => found.add(n));
    }
    const uses = [...new Set([...unknown, ...found])].sort();
    const sounds = uses.filter(sound);
    const asLine = readAsLine(all);
    const stand = sounds.map(standIn).join('\n');
    const filled = stand ? `${read}\n${stand}` : read;
    const signature = signatureOf(text);
    return {
        uses,
        sounds,
        lines: uses.filter((n) => asLine.has(n)),
        defines: [...new Set([...decls.map((d) => `&${d.name}`), ...(result.takes ?? []).flatMap((u) => u.gave)])],
        clock: clockNeeds(filled, stand ? last : result).map((t) => t.need),
        ...(signature ? { signature: { heads: signature.names, optional: signature.optional, main: signature.main } } : {}),
    };
}
