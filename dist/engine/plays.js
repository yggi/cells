import { isMidiCard } from "./program.js";
import { cellId, edgeId } from "./ids.js";
export const sourceOf = (result, o) => {
    const read = o.mods.find((m) => m.picks)?.cell ?? o.cell;
    return o.kit && result.cells.get(read)?.over === o.voice ? read : o.voice;
};
export const noteEdge = (o) => (o.drone ? null : edgeId(cellId(o.tape ? o.tape.head : o.cell), cellId(o.voice)));
const termsOf = (o) => [
    o.cell,
    ...o.mods.map((m) => m.cell),
    ...o.levels.map((m) => m.cell),
    ...(o.envelopeCell ? [o.envelopeCell] : []),
    ...(o.tape ? [o.tape.head] : []),
];
const into = (o, mix) => o.via.includes(mix) || o.through.includes(mix) || !!o.midi?.some((d) => d.card === mix);
export function productOutputs(result, mix, voice) {
    const voices = soundVoices(result, voice);
    return result.outputs.filter((o) => into(o, mix) && voices.has(o.voice));
}
export const termPairs = (made, term) => [
    ...new Set(made.filter((o) => termsOf(o).includes(term)).map((o) => edgeId(cellId(term), cellId(o.voice)))),
];
export function kitOf(result, name) {
    const own = result.cells.get(name);
    const kit = own?.kit ? own : own?.over ? result.cells.get(own.over) : undefined;
    return kit?.kit ? { kit: kit.name, drums: kit.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])) } : null;
}
function soundVoices(result, name) {
    const out = new Set();
    const walk = (n, guard) => {
        const c = result.cells.get(n);
        if (c?.mix && !c.sink && !isMidiCard(c) && guard < 16)
            for (const b of c.mix)
                walk(b.voice.name, guard + 1);
        else
            out.add(kitOf(result, n)?.kit ?? n);
    };
    walk(name, 0);
    return out;
}
const memo = new WeakMap();
export function gateVoices(result, gate) {
    let byGate = memo.get(result);
    if (!byGate)
        memo.set(result, (byGate = new Map()));
    const hit = byGate.get(gate);
    if (hit)
        return hit;
    const c = result.cells.get(gate);
    const outputs = result.outputs.filter((o) => into(o, gate));
    const members = (name) => kitOf(result, name)?.drums ?? [];
    const stands = (receiver, o) => {
        if (o.voice === receiver)
            return true;
        const kit = result.cells.get(o.voice);
        if (!kit?.kit || !kit.implicit)
            return false;
        const held = members(o.voice);
        return held.includes(receiver) || (!!result.cells.get(receiver)?.kit && held.every((m) => members(receiver).includes(m)));
    };
    const out = (c?.gate?.receivers ?? []).filter((r) => result.cells.has(r)).map((name) => ({ name, outputs: outputs.filter((o) => stands(name, o)) }));
    byGate.set(gate, out);
    return out;
}
export function gatePairs(result, gate, outputs) {
    const g = cellId(gate);
    return {
        notes: [...new Set(outputs.flatMap((o) => noteEdge(o) ?? []))],
        sound: [...new Set(outputs.map((o) => edgeId(cellId(sourceOf(result, o)), g)))],
        terms: [...new Set(outputs.flatMap((o) => termsOf(o).map((t) => edgeId(cellId(t), cellId(o.voice)))))],
    };
}
