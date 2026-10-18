import { attrsOf, setAttr } from "../edit.js";
import { soundsIdentical } from "../sameness.js";
import { saves } from "./harness.js";
export function defaults(source, result) {
    const out = [];
    const offer = (name, key, why) => {
        const value = attrsOf(source, name).get(key);
        const s = {
            id: `default:${name}:${key}`,
            tool: 'shorten',
            rule: 'default',
            title: `&${name}: ${key}=${value} is ${why} — leave it out`,
            before: `${key}=${value}`,
            after: '',
            apply: (src) => setAttr(src, name, key, null),
        };
        if ((saves(source, s) ?? 0) > 0 && soundsIdentical(source, s.apply(source)))
            out.push(s);
    };
    for (const c of result.cells.values()) {
        if (c.implicit || c.lambda)
            continue;
        const attrs = attrsOf(source, c.name);
        if (c.sink && attrs.get('loop') === 'SAMPLE_RATE')
            offer(c.name, 'loop', 'what the sound card turns at anyway');
        if (attrs.has('cycle') && c.step && !c.map && c.wrap !== null && c.wrap === (c.units.length || c.cycle))
            offer(c.name, 'cycle', 'its own length: a turning table comes round there anyway');
        if (attrs.get('pan') !== undefined && Number(attrs.get('pan')) === 0.5)
            offer(c.name, 'pan', 'the centre');
    }
    return out;
}
