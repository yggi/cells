import { declLine, setAttr } from "../edit.js";
import { tapFor } from "../compiler/clocks.js";
import { samePiece, size } from "./harness.js";
export function tapOfRaw(result, name, by = 1) {
    const c = result.cells.get(name);
    const st = c?.step;
    if (!st || st.tap || st.whole || st.cycle)
        return null;
    const m = result.cells.get(st.driver)?.meter;
    if (!m || !result.clocks.has(st.driver) || result.clocks.get(st.driver).belt)
        return null;
    const ratio = st.chain.reduce((r, o) => (o.op === '×' ? r * o.n : r / o.n), 1) / by;
    const rooted = !result.cells.get(st.driver)?.step;
    const tap = tapFor(m.levels.length, m.pulses, rooted ? m.unit : 0, ratio);
    return result.mainMeter === st.driver ? tap : `&${st.driver}:${tap}`;
}
export function taps(source, result) {
    const out = [];
    const seen = new Set();
    for (const c of result.cells.values()) {
        const tap = tapOfRaw(result, c.name);
        const line = result.taps?.get(c.name) ?? c.name;
        if (tap === null || seen.has(line) || declLine(source, line) < 0)
            continue;
        seen.add(line);
        const apply = (s) => setAttr(s, line, 'step', tap);
        const next = apply(source);
        if (next === source || !samePiece(source, next))
            continue;
        const at = declLine(source, line);
        out.push({
            id: `tap:${line}`,
            kind: 'tap',
            title: `&${line} steps by the meter cell's own steps: tap the meter instead, step=${tap} (decision 040)`,
            before: source.split('\n')[at].trim(),
            after: next.split('\n')[at].trim(),
            saving: size(source) - size(next),
            apply,
        });
    }
    return out;
}
