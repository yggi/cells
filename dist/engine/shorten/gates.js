import { attrsOf, declLine, declWords, setAttr, setBraid } from "../edit.js";
import { samePiece, size } from "./harness.js";
function rewrite(source, name) {
    const a = attrsOf(source, name);
    const w = declWords(source, name);
    const at = declLine(source, name);
    if (!a.has('trigger') || !w || at < 0)
        return null;
    const level = [a.get('velocity'), a.get('gate'), a.get('gain')].filter((x) => !!x && x !== '1');
    let next = source;
    for (const k of ['velocity', 'gate', 'gain'])
        next = setAttr(next, name, k, null);
    const lines = next.split('\n');
    lines[at] = lines[at].replace(/(\s)trigger=(\S+)/, (_, sp, notes) => `${sp}play=${notes}${level.length ? ` level=${level.join('*')}` : ''}`);
    next = lines.join('\n');
    if (w.braid.length > 1)
        next = setBraid(next, name, [`[${w.braid.join(', ')}]`]);
    return next;
}
export function gates(source, result) {
    const out = [];
    for (const c of result.cells.values()) {
        if (c.gate?.port !== 'trigger')
            continue;
        const next = rewrite(source, c.name);
        if (next === null || !samePiece(source, next))
            continue;
        const at = declLine(source, c.name);
        out.push({
            id: `gate:${c.name}`,
            kind: 'gate',
            title: `&${c.name} is a gate written the old way: play= for trigger=, one level= for velocity=, gate= and gain=, the voices it plays all of as a chord`,
            before: source.split('\n')[at].trim(),
            after: next.split('\n')[at].trim(),
            saving: size(source) - size(next),
            apply: (s) => rewrite(s, c.name) ?? s,
        });
    }
    return out;
}
