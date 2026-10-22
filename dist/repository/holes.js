import { braidReadsOf, otherReadsOf } from "../engine/compiler/builtin.js";
import { parse } from "../engine/parser/index.js";
import { tapPositions } from "../engine/meter.js";
import { MAIN_KEY } from "../engine/program.js";
import { expansion, hasUse } from "../engine/use.js";
export const INTERFACE_NAMES = ['&bar', 'key', '&harm'];
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
export function clockNeeds(text, result, of, own) {
    const decls = parse(text).cells;
    const mine = own ?? new Set(decls.map((d) => d.name));
    const mainIsMine = result.mainMeter !== undefined && mine.has(result.mainMeter);
    return decls.flatMap((d) => {
        const step = d.step;
        if (step?.kind !== 'tap' || (of && !of.has(d.name)))
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
export function readOnlyAsSound(decls) {
    const inBraid = new Set(decls.flatMap((d) => braidReadsOf(d)).map((n) => `&${n}`));
    const elsewhere = new Set(decls.flatMap((d) => otherReadsOf(d)).map((n) => `&${n}`));
    return (name) => inBraid.has(name) && !elsewhere.has(name);
}
export const linesRead = (text, resolve) => (resolve && hasUse(text) ? expansion(text, { resolve }).text : text);
export function holesOf(text, compiled, resolve) {
    const read = linesRead(text, resolve);
    const all = parse(read).cells;
    const decls = all.filter((d) => !d.lambda);
    const result = compiled(text);
    const unknown = result.unknown.map((u) => `&${u.name}`);
    const readsKey = decls.some((d) => d.over?.name === MAIN_KEY) && !result.mainKey;
    const uses = [...new Set([...unknown, ...(readsKey ? ['key'] : [])])].sort();
    const sound = readOnlyAsSound(all);
    return {
        uses,
        sounds: uses.filter(sound),
        defines: [...new Set([...decls.map((d) => `&${d.name}`), ...(result.uses ?? []).flatMap((u) => u.gave)])],
        clock: clockNeeds(read, result).map((t) => t.need),
    };
}
