import { isMidiCard } from "./program.js";
import { writtenGraph } from "./graph.js";
import { cellId } from "./ids.js";
const nameOf = (id) => id.slice('cell:'.length);
export function outs(result, model = writtenGraph(result, { card: true })) {
    const cardOf = (id) => {
        const c = result.cells.get(nameOf(id));
        return c && (c.sink || isMidiCard(c)) ? c : undefined;
    };
    return model.edges.flatMap((e) => {
        const card = cardOf(e.to);
        if (!card || cardOf(e.from) || e.port === 'about')
            return [];
        const sound = e.bulb ?? nameOf(e.from);
        if (card.sink) {
            const units = card.units;
            const k = units.length === 2 ? units.findIndex((u) => u.atom.kind === 'ref' && cellId(u.atom.name) === e.from) : -1;
            return [{ id: e.id, from: e.from, sound, card: card.name, kind: 'sample', channel: null, left: k !== 1, right: k !== 0 }];
        }
        return [{ id: e.id, from: e.from, sound, card: card.name, kind: 'midi', channel: channelOf(result, card, sound), left: true, right: true }];
    });
}
function channelOf(result, card, name) {
    if (card.map?.kind === 'midi' && card.map.channel !== null)
        return card.map.channel;
    for (const o of result.outputs)
        if (o.voice === name || o.cell === name || o.tape?.head === name)
            for (const d of o.midi ?? [])
                if (d.card === card.name)
                    return d.channel;
    return null;
}
export function soundRole(result, c) {
    if (c.note)
        return null;
    if (c.sink || isMidiCard(c))
        return 'card';
    if (c.gate || (c.over && result.cells.get(c.over)?.kit))
        return 'gate';
    if (c.mix && !c.kit && !c.step && !c.voice)
        return 'mixer';
    if (c.voice || c.kit || typeof c.params.write === 'string' || typeof c.params.body === 'string' || typeof c.params.play === 'string')
        return 'maker';
    return c.sort === 'signal' || c.sort === 'wave' ? 'maker' : null;
}
